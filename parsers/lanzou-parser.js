/**
 * 蓝奏云解析器
 * 支持蓝奏云分享链接的直链解析
 * 基于Java版本netdisk-fast-download的实现逻辑
 */

const { get: httpGet, post, parseHTML, retryRequest } = require('../utils/http-client');
const { get: cacheGet, set, generateCacheKey, getCacheTTL } = require('../utils/cache');
const { logger } = require('../utils/logger');
const { normalizeFileSize, getFileType } = require('../utils/file-utils');
const config = require('../config/app-config');

const LANZOU_URL_REGEX = /https:\/\/(?:[a-zA-Z\d-]+\.)?((lanzou[a-z])|(lanzn))\.com\/(?:.+\/)?(?<KEY>[^/?#]+)/i;

class LanzouParser {
  constructor() {
    this.config = config.netdisk.lanzou;
    this.panType = 'lz';
    this.SHARE_URL_PREFIX = 'https://wwsd.lanzouw.com';
  }

  /**
   * 解析蓝奏云分享链接
   * @param {string} shareId 分享ID
   * @param {string} password 密码（可选）
   * @returns {Promise<object>} 解析结果
   */
  async parse(shareId, password = '') {
    const cacheKey = generateCacheKey(this.panType, shareId, password);
    
    // 检查缓存
    const cached = null //cacheGet(cacheKey);
    if (cached) {
      logger.info(`Cache hit for lanzou: ${shareId}`);
      return cached;
    }

    try {
      logger.info(`Parsing lanzou share: ${shareId}`);
      
      // 构建标准URL
      const sUrl = `${this.SHARE_URL_PREFIX}/${shareId}`;
      
      // 获取分享页面，使用蓝奏云解析器的分享页面请求头
      const response = await retryRequest(() => 
        httpGet(sUrl, { referer: sUrl }, 'lanzou', 'share')
      );
      const html = response.data;
      
      // 从分享页面中提取fid
      const fidMatch = html.match(/var\s+fid\s*=\s*(\d+)/);
      const fileId = fidMatch ? fidMatch[1] : null;
      
      logger.debug('Extracted fid from share page:', fileId);
      
      // 提取文件信息
      const fileInfo = this.extractFileInfo(html);
      
      // 匹配iframe
      const iframePattern = /src="(\/fn\?[a-zA-Z\d_+/=]{16,})"/;
      const iframeMatch = html.match(iframePattern);
      
      let downloadResult;
      
      if (!iframeMatch) {
        // 没有Iframe说明是加密分享, 匹配sign通过密码请求下载页面
        if (!password) {
          throw new Error('此分享需要密码');
        }
        
        downloadResult = await this.handleEncryptedShare(html, password, sUrl, fileId);
      } else {
        // 没有密码，直接处理
        const iframePath = iframeMatch[1];
        downloadResult = await this.handleNormalShare(iframePath, sUrl, fileId);
      }

      // 如果从下载链接中获取到了文件名，优先使用
      if (downloadResult.fileName && !fileInfo.fileName) {
        fileInfo.fileName = downloadResult.fileName;
        logger.debug('Using filename from download URL:', fileInfo.fileName);
      }

      // 构建结果
      const result = {
        success: true,
        panType: this.panType,
        shareId,
        fileName: fileInfo.fileName || '蓝奏云文件',
        fileSize: fileInfo.fileSize || '未知',
        fileType: fileInfo.fileType || '未知',
        uploadTime: fileInfo.uploadTime || '',
        uploader: fileInfo.uploader || '',
        description: fileInfo.description || '',
        downloadUrl: downloadResult.downloadUrl,
        fileInfo: fileInfo,
        timestamp: new Date().toISOString()
      };

      // 缓存结果
      set(cacheKey, result, getCacheTTL(this.panType));
      
      logger.info(`Successfully parsed lanzou share: ${shareId}`);
      return result;

    } catch (error) {
      logger.error(`Failed to parse lanzou share: ${shareId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * 从HTML页面中提取文件信息
   * @param {string} html HTML页面内容
   * @returns {object} 文件信息
   */
  extractFileInfo(html) {
    try {
      const fileInfo = {
        fileName: '',
        fileSize: '',
        fileType: '',
        uploadTime: '',
        uploader: '',
        description: ''
      };

      logger.debug('Extracting file info from HTML, length:', html.length);

      // 提取文件名 - 从title标签
      const titleMatch = html.match(/<title>([^<]+)\s*-\s*蓝奏云<\/title>/);
      if (titleMatch) {
        fileInfo.fileName = titleMatch[1].trim();
        logger.debug('File name from title:', fileInfo.fileName);
      }

      // 提取文件名 - 从页面内容中的div标签
      if (!fileInfo.fileName) {
        const nameMatch = html.match(/<div[^>]*style="[^"]*font-size:\s*30px[^"]*"[^>]*>([^<]+)<\/div>/);
        if (nameMatch) {
          fileInfo.fileName = nameMatch[1].trim();
          logger.debug('File name from div:', fileInfo.fileName);
        }
      }

      // 提取文件大小 - 优先从meta description中提取
      let sizeMatch = html.match(/<meta[^>]*name="description"[^>]*content="[^"]*文件大小：([^"]+)"[^>]*>/);
      if (sizeMatch) {
        const rawSize = sizeMatch[1].trim();
        logger.debug('File size from meta description:', rawSize);
        fileInfo.fileSize = normalizeFileSize(rawSize);
        logger.debug('Normalized file size from meta:', fileInfo.fileSize);
      }
      
      // 如果没有从meta提取到，尝试从n_filesize div中提取
      if (!fileInfo.fileSize) {
        sizeMatch = html.match(/<div[^>]*class="n_filesize"[^>]*>大小：([^<]+)<\/div>/);
        if (sizeMatch) {
          const rawSize = sizeMatch[1].trim();
          logger.debug('File size from n_filesize div:', rawSize);
          fileInfo.fileSize = normalizeFileSize(rawSize);
          logger.debug('Normalized file size from div:', fileInfo.fileSize);
        }
      }
      
      // 如果还是没有，尝试从span标签中提取
      if (!fileInfo.fileSize) {
        sizeMatch = html.match(/<span[^>]*>文件大小：<\/span>([^<>\s]+(?:\s*[A-Za-z]+)?)/);
        if (sizeMatch) {
          const rawSize = sizeMatch[1].trim();
          logger.debug('File size from span:', rawSize);
          fileInfo.fileSize = normalizeFileSize(rawSize);
          logger.debug('Normalized file size from span:', fileInfo.fileSize);
        }
      }

      // 提取上传时间 - 优先从n_file_infos span中提取
      let timeMatch = html.match(/<span[^>]*class="n_file_infos"[^>]*>(\d{4}-\d{2}-\d{2})<\/span>/);
      if (timeMatch) {
        fileInfo.uploadTime = timeMatch[1].trim();
        logger.debug('Upload time from n_file_infos:', fileInfo.uploadTime);
      }
      
      // 如果没有从n_file_infos提取到，尝试从span标签中提取
      if (!fileInfo.uploadTime) {
        timeMatch = html.match(/<span[^>]*>上传时间：<\/span>([^<>\n\r]+)/);
        if (timeMatch) {
          fileInfo.uploadTime = timeMatch[1].trim();
          logger.debug('Upload time from span:', fileInfo.uploadTime);
        }
      }

      // 提取分享用户 - 从页面内容中的span和font标签
      const userMatch = html.match(/<span[^>]*>分享用户：<\/span><font>([^<]+)<\/font>/);
      if (userMatch) {
        fileInfo.uploader = userMatch[1].trim();
        logger.debug('Uploader extracted:', fileInfo.uploader);
      }

      // 提取运行系统/文件类型 - 优先从n_file_infos span中提取
      let typeMatch = html.match(/<span[^>]*class="n_file_infos"[^>]*>([^<]+(?:文件|系统|软件|应用))<\/span>/);
      if (typeMatch) {
        fileInfo.fileType = typeMatch[1].trim();
        logger.debug('File type from n_file_infos:', fileInfo.fileType);
      }
      
      // 如果没有从n_file_infos提取到，尝试从span标签中提取
      if (!fileInfo.fileType) {
        typeMatch = html.match(/<span[^>]*>运行系统：<\/span>([^<>\n\r]+)/);
        if (typeMatch) {
          fileInfo.fileType = typeMatch[1].trim();
          logger.debug('File type from span:', fileInfo.fileType);
        }
      }

      // 提取文件描述 - 从页面内容，处理换行符
      const descMatch = html.match(/<span[^>]*>文件描述：<\/span><br>\s*([^<]+)/);
      if (descMatch) {
        fileInfo.description = descMatch[1].trim();
        logger.debug('Description extracted:', fileInfo.description);
      }

      // 如果没有从页面提取到文件类型，根据文件名推断
      if (!fileInfo.fileType && fileInfo.fileName) {
        fileInfo.fileType = getFileType(fileInfo.fileName);
        logger.debug('File type inferred from filename:', fileInfo.fileType);
      }

      // 清理数据，移除可能的HTML标签残留
      Object.keys(fileInfo).forEach(key => {
        if (typeof fileInfo[key] === 'string') {
          fileInfo[key] = fileInfo[key].replace(/<[^>]*>/g, '').trim();
        }
      });

      logger.debug('Final extracted file info:', fileInfo);
      return fileInfo;
    } catch (error) {
      logger.error('Extract file info failed:', error);
      return {
        fileName: '蓝奏云文件',
        fileSize: '未知',
        fileType: '未知',
        uploadTime: '',
        uploader: '',
        description: ''
      };
    }
  }

  /**
   * 处理加密分享
   * @param {string} html 页面HTML
   * @param {string} password 密码
   * @param {string} sUrl 分享URL
   * @param {string|null} fileId 文件ID
   * @returns {Promise<object>} 下载链接和文件名信息
   */
  async handleEncryptedShare(html, password, sUrl, fileId) {
    try {
      // 获取JS脚本
      const jsText = this.getJsText(html);
      if (!jsText) {
        throw new Error('js脚本匹配失败, 可能分享已失效');
      }

      // 解析JS参数
      const jsParams = this.parseJsWithRegex(jsText);
      
      // 如果JS解析中没有文件ID，使用从页面中提取的fid
      if (!jsParams.fileId && fileId) {
        jsParams.fileId = fileId;
      }
      
      // 添加密码参数
      jsParams.password = password;
      
      // 获取下载链接
      return await this.getDownloadUrl(sUrl, jsParams);
    } catch (error) {
      logger.error('Handle encrypted share failed:', error);
      throw new Error('js引擎执行失败');
    }
  }

  /**
   * 处理普通分享
   * @param {string} iframePath iframe路径
   * @param {string} sUrl 分享URL
   * @param {string|null} fileId 文件ID
   * @returns {Promise<object>} 下载链接和文件名信息
   */
  async handleNormalShare(iframePath, sUrl, fileId) {
    try {
      // 获取iframe页面，使用蓝奏云解析器的iframe请求头
      const iframeUrl = this.SHARE_URL_PREFIX + iframePath;
      const response = await retryRequest(() => 
        httpGet(iframeUrl, { referer: sUrl }, 'lanzou', 'iframe')
      );
      const html2 = response.data;
      
      // 获取JS脚本
      const jsText = this.getJsText(html2);
      if (!jsText) {
        throw new Error(`${iframeUrl} -> ${sUrl}: js脚本匹配失败, 可能分享已失效`);
      }

      // 解析JS参数
      const jsParams = this.parseJsWithRegex(jsText);
      
      // 优先使用从主页面传递过来的fileId
      if (fileId) {
        jsParams.fileId = fileId;
        logger.debug('Using fileId from main page:', fileId);
      } else if (!jsParams.fileId) {
        // 如果主页面没有fileId，尝试从iframe页面提取
        const fidMatch = html2.match(/var\s+fid\s*=\s*(\d+)/);
        if (fidMatch) {
          jsParams.fileId = fidMatch[1];
          logger.debug('Using fileId from iframe page:', jsParams.fileId);
        }
      }
      
      // 获取下载链接
      return await this.getDownloadUrl(sUrl, jsParams);
    } catch (error) {
      logger.error('Handle normal share failed:', error);
      throw error;
    }
  }

  /**
   * 从HTML中提取JS脚本
   * @param {string} html HTML内容
   * @returns {string|null} JS脚本内容
   */
  getJsText(html) {
    try {
      logger.debug('Extracting JS from HTML, length:', html.length);
      
      // 尝试多种JS标签模式
      const jsPatterns = [
        /<script type="text\/javascript">([\s\S]*?)<\/script>/,
        /<script>([\s\S]*?)<\/script>/,
        /<script type="text\/javascript"[\s\S]*?>([\s\S]*?)<\/script>/
      ];
      
      for (const pattern of jsPatterns) {
        const matches = html.match(pattern);
        if (matches && matches[1]) {
          const jsText = matches[1].replace(/<!--.*?-->/g, '').trim();
          if (jsText.length > 50) { // 确保JS内容足够长
            logger.debug('Found JS script, length:', jsText.length);
            logger.debug('JS preview:', jsText.substring(0, 100));
            return jsText;
          }
        }
      }
      
      // 如果没找到，尝试查找包含关键字的script标签
      const keywordPattern = /<script[^>]*>([\s\S]*?(?:sign|url|down_p|wp_sign)[\s\S]*?)<\/script>/i;
      const keywordMatch = html.match(keywordPattern);
      if (keywordMatch && keywordMatch[1]) {
        const jsText = keywordMatch[1].replace(/<!--.*?-->/g, '').trim();
        logger.debug('Found JS script by keyword, length:', jsText.length);
        return jsText;
      }
      
      logger.warn('No JS script found in HTML');
      return null;
    } catch (error) {
      logger.error('Error extracting JS text:', error);
      return null;
    }
  }

  /**
   * 使用正则表达式解析JS参数
   * @param {string} jsText JS脚本内容
   * @returns {object} 解析结果
   */
  parseJsWithRegex(jsText) {
    try {
      logger.debug('Parsing JS with regex, text length:', jsText.length);
      
      // 优先匹配以_c_c结尾的sign
      let signMatch = jsText.match(/sign\s*:\s*['"]([a-zA-Z0-9_+/=]+_c_c)['"]/);
      if (!signMatch) {
        signMatch = jsText.match(/data\s*:\s*\{[^}]*'sign'\s*:\s*['"]([a-zA-Z0-9_+/=]+_c_c)['"]/);
      }
      if (!signMatch) {
        signMatch = jsText.match(/data\s*:\s*\{[^}]*"sign"\s*:\s*['"]([a-zA-Z0-9_+/=]+_c_c)['"]/);
      }
      
      // 如果没有找到_c_c结尾的sign，尝试匹配其他格式
      if (!signMatch) {
        signMatch = jsText.match(/sign\s*:\s*['"]([^'"]+)['"]/);
      }
      if (!signMatch) {
        signMatch = jsText.match(/data\s*:\s*\{[^}]*'sign'\s*:\s*['"]([^'"]+)['"]/);
      }
      if (!signMatch) {
        signMatch = jsText.match(/data\s*:\s*\{[^}]*"sign"\s*:\s*['"]([^'"]+)['"]/);
      }
      if (!signMatch) {
        signMatch = jsText.match(/wp_sign\s*=\s*['"]([^'"]+)['"]/);
      }
      if (!signMatch) {
        signMatch = jsText.match(/sign['"]?\s*:\s*['"]([^'"]+)['"]/);
      }
      
      // 解析ajaxdata (websignkey参数)
      let ajaxdataMatch = jsText.match(/ajaxdata\s*=\s*['"]([^'"]+)['"]/);
      if (!ajaxdataMatch) {
        ajaxdataMatch = jsText.match(/websignkey\s*=\s*['"]([^'"]+)['"]/);
      }
      
      // 解析url
      let urlMatch = jsText.match(/url\s*:\s*['"]([^'"]+)['"]/);
      if (!urlMatch) {
        urlMatch = jsText.match(/url\s*=\s*['"]([^'"]+)['"]/);
      }
      if (!urlMatch) {
        // 尝试从ajax调用中提取url
        const ajaxUrlMatch = jsText.match(/url\s*:\s*['"]([^'"]+)['"]/);
        if (ajaxUrlMatch) {
          urlMatch = ajaxUrlMatch;
        }
      }
      
      // 解析文件ID - 从ajaxm.php?file=数字 中提取
      let fileIdMatch = jsText.match(/ajaxm\.php\?file=(\d+)/);
      if (!fileIdMatch) {
        fileIdMatch = jsText.match(/file=(\d+)/);
      }
      
      // 解析kdns参数
      let kdnsMatch = jsText.match(/kdns\s*=\s*(\d+)/);
      if (!kdnsMatch) {
        kdnsMatch = jsText.match(/kd\s*:\s*(\d+)/);
      }
      
      logger.debug('Sign match:', signMatch);
      logger.debug('Ajaxdata match:', ajaxdataMatch);
      logger.debug('URL match:', urlMatch);
      logger.debug('File ID match:', fileIdMatch);
      logger.debug('KDNS match:', kdnsMatch);
      
      if (!signMatch) {
        // 尝试更宽松的匹配 - 查找所有可能的sign值
        const allSignMatches = jsText.match(/['"]([a-zA-Z0-9_+/=]{20,})['"]/g);
        logger.debug('All potential sign matches:', allSignMatches);
        
        if (allSignMatches && allSignMatches.length >= 1) {
          // 过滤掉明显不是sign的字符串（如URL、域名等）
          const potentialSigns = allSignMatches
            .map(s => s.replace(/['"]/g, ''))
            .filter(s => 
              s.length >= 20 && 
              s.length <= 200 && 
              !s.includes('http') && 
              !s.includes('.com') && 
              !s.includes('.php') &&
              /^[a-zA-Z0-9_+/=]+$/.test(s)
            );
          
          logger.debug('Filtered potential signs:', potentialSigns);
          
          if (potentialSigns.length >= 1) {
            // 优先选择以_c_c结尾的sign
            const c_cSign = potentialSigns.find(s => s.endsWith('_c_c'));
            const sign = c_cSign || potentialSigns[potentialSigns.length - 1];
            
            logger.debug('Extracted sign from potential signs:', sign);
            
            return {
              sign,
              url: '/ajaxm.php',
              fileId: fileIdMatch ? fileIdMatch[1] : null,
              data: {
                websignkey: ajaxdataMatch ? ajaxdataMatch[1] : '',
                signs: ajaxdataMatch ? ajaxdataMatch[1] : '',
                websign: '',
                kd: kdnsMatch ? parseInt(kdnsMatch[1]) : 1,
                ves: 1
              }
            };
          }
        }
        
        throw new Error('无法解析JS参数 - 找不到sign');
      }
      
      const sign = signMatch[1];
      const url = urlMatch ? urlMatch[1] : '/ajaxm.php';
      const fileId = fileIdMatch ? fileIdMatch[1] : null;
      
      // 构建data对象
      const data = {
        websignkey: ajaxdataMatch ? ajaxdataMatch[1] : '',
        signs: ajaxdataMatch ? ajaxdataMatch[1] : '',
        websign: '',
        kd: kdnsMatch ? parseInt(kdnsMatch[1]) : 1,
        ves: 1
      };
      
      logger.debug('Parsed result:', { sign, url, fileId, data });
      
      return {
        sign,
        url,
        fileId,
        data
      };
    } catch (error) {
      logger.error('Parse JS with regex failed:', error);
      logger.error('JS Text for debugging:', jsText);
      throw new Error('无法解析JS参数');
    }
  }

  /**
   * 从下载链接中提取文件名
   * @param {string} downloadUrl 下载链接
   * @returns {string|null} 文件名
   */
  extractFileNameFromUrl(downloadUrl) {
    try {
      const url = new URL(downloadUrl);
      const fnParam = url.searchParams.get('fn');
      if (fnParam) {
        // URL解码文件名
        return decodeURIComponent(fnParam);
      }
      return null;
    } catch (error) {
      logger.error('Failed to extract filename from URL:', error);
      return null;
    }
  }

  /**
   * 获取下载链接
   * @param {string} key 分享URL
   * @param {object} jsParams JS执行结果
   * @returns {Promise<object>} 下载链接和文件名信息
   */
  async getDownloadUrl(key, jsParams) {
    if (!jsParams) {
      throw new Error('需要访问密码');
    }

    const { sign, url, data, fileId, password } = jsParams;
    
    // 构建form数据
    const formData = new URLSearchParams();
    formData.append('action', 'downprocess');
    formData.append('sign', sign);
    
    // 只有在不带密码的情况下才添加ves参数
    if (!password) {
      formData.append('ves', '1');
    }
    
    // 添加data中的参数
    if (data && typeof data === 'object') {
      if (data.websignkey) formData.append('websignkey', data.websignkey);
      if (data.signs) formData.append('signs', data.signs);
      if (data.websign) formData.append('websign', data.websign);
      if (data.kd) formData.append('kd', data.kd);
    }
    
    // 如果有密码，添加p参数
    if (password) {
      formData.append('p', password);
      logger.debug('Added password parameter:', password);
    }

    // 构建正确的API URL，包含文件ID
    let apiUrl;
    if (fileId) {
      // 如果有文件ID，使用文件ID构建URL
      apiUrl = `${this.SHARE_URL_PREFIX}/ajaxm.php?file=${fileId}`;
    } else if (url && url.startsWith('/ajaxm.php')) {
      // 如果URL已经包含路径，直接使用
      apiUrl = this.SHARE_URL_PREFIX + url;
    } else {
      // 默认使用ajaxm.php
      apiUrl = `${this.SHARE_URL_PREFIX}/ajaxm.php`;
    }
    
    const postData = formData.toString();
    logger.debug('API URL:', apiUrl);
    logger.debug('Post data:', postData);
    
    // 发送API请求，使用蓝奏云解析器的API请求头
    const response = await retryRequest(() => 
      post(apiUrl, postData, { referer: key }, 'lanzou', 'api')
    );

    const responseData = response.data;
    if (responseData.zt !== 1) {
      throw new Error(responseData.inf || '获取下载链接失败');
    }

    // 构建下载链接
    const downloadUrl = responseData.dom + '/file/' + responseData.url;
    
    // 获取最终重定向链接，使用默认请求头
    const finalResponse = await retryRequest(() => 
      httpGet(downloadUrl, { 
        referer: key,
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      }, 'lanzou', 'share')
    );

    // 获取Location头
    const location = finalResponse.headers?.location;
    if (!location) {
      throw new Error('无法获取最终下载链接');
    }

    // 从下载链接中提取文件名
    const fileName = this.extractFileNameFromUrl(location);
    
    return {
      downloadUrl: location,
      fileName: fileName
    };
  }

  /**
   * 校验是否为蓝奏云链接
   * @param {string} url
   * @returns {boolean}
   */
  static validateUrl(url) {
    return LANZOU_URL_REGEX.test(url);
  }

  /**
   * 提取蓝奏云分享key
   * @param {string} url
   * @returns {string|null}
   */
  static extractShareKey(url) {
    const match = url.match(LANZOU_URL_REGEX);
    return match && match.groups && match.groups.KEY ? match.groups.KEY : null;
  }
}

module.exports = LanzouParser; 