/**
 * 123云盘解析器（支持加密/非加密/文件夹/最终直链解密）
 * 依赖：axios, js-exec, base64
 */

const axios = require('axios');
const { get: cacheGet, set, generateCacheKey, getCacheTTL } = require('../utils/cache');
const { logger } = require('../utils/logger');
const config = require('../config/app-config');
const { getSign } = require('./vmjs/ye123');
const { getFileType } = require('../utils/file-utils');

// 123网盘多域名正则
const PAN123_URL_REGEX = /https:\/\/www\.(123pan\.com|123865\.com|123684\.com|123912\.com|123pan\.cn)\/s\/(?<KEY>[^/?#]+)(?:\.html)?/i;

// 文件大小格式化
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let num = bytes;
  while (num >= 1024 && i < units.length - 1) {
    num /= 1024;
    i++;
  }
  return `${num.toFixed(2)} ${units[i]}`;
}

// 从文件名提取扩展名
function getFileTypeByName(fileName) {
  return getFileType(fileName);
}

class Pan123Parser {
  constructor() {
    this.config = config.netdisk.pan123;
    this.panType = 'pan123';
    this.headers = {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      'App-Version': '3',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'LoginUuid': Math.random().toString(36).slice(2),
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
      'platform': 'web',
      'sec-ch-ua': '"Not)A;Brand";v="99", "Microsoft Edge";v="127", "Chromium";v="127"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': 'Windows'
    };
  }

  static validateUrl(url) {
    return PAN123_URL_REGEX.test(url);
  }

  static extractShareKey(url) {
    const match = url.match(PAN123_URL_REGEX);
    return match && match.groups && match.groups.KEY ? match.groups.KEY : null;
  }

  /**
   * 解析入口
   * @param {string} shareId 分享key
   * @param {string} password 分享密码
   * @returns {Promise<object>}
   */
  async parse(shareId, password = '') {
    const cacheKey = generateCacheKey(this.panType, shareId, password);
    const cached = cacheGet(cacheKey);
    if (cached) {
      logger.info(`Cache hit for pan123: ${shareId}`);
      return cached;
    }

    this.shareId = shareId;
    try {
      logger.info(`Parsing pan123 share: ${shareId}`);
      const shareUrl = `https://www.123pan.com/s/${shareId}.html`;

      // 1. 获取分享页HTML
      const html = (await axios.get(shareUrl, { headers: this.headers })).data;
      if (html.includes('分享链接已失效')) throw new Error('该分享已失效');

      // 2. 提取 window.g_initialProps
      const match = html.match(/window\.g_initialProps\s*=\s*(.*);/);
      if (!match) throw new Error('找不到文件信息');
      const fileInfo = JSON.parse(match[1]);
      const resJson = fileInfo.res;
      const resListJson = fileInfo.reslist;

      if (!resJson || resJson.code !== 0) throw new Error('解析到异常JSON: ' + JSON.stringify(resJson));
      const shareKey = resJson.data.ShareKey;

      // 3. 判断是否加密分享
      let reqBodyJson;
      if (!resListJson || resListJson.code !== 0) {
        if (!password) throw new Error('该分享需要密码');
        // 加密分享，获取文件信息
        reqBodyJson = await this.getFileInfoByPwd(shareKey, password);
      } else {
        reqBodyJson = resListJson.data.InfoList[0];
        reqBodyJson.ShareKey = shareKey;
      }

      // 4. 判断文件/文件夹
      if (reqBodyJson.Type === 1) {
        // 文件夹，获取批量下载直链
        return await this.getZipDownUrl(reqBodyJson);
      } else {
        // 单文件
        return await this.getDownUrl(reqBodyJson);
      }
    } catch (error) {
      logger.error(`Failed to parse pan123 share: ${shareId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * 加密分享获取文件信息
   */
  async getFileInfoByPwd(shareKey, pwd) {
    const url = `https://www.123pan.com/a/api/share/get?limit=100&next=1&orderBy=file_name&orderDirection=asc&shareKey=${encodeURIComponent(shareKey)}&SharePwd=${encodeURIComponent(pwd)}&ParentFileId=0&Page=1&event=homeListFile&operateType=1`;
    const res = await axios.get(url, { headers: this.headers });
    if (res.data.code !== 0) throw new Error('加密分享文件信息获取失败: ' + JSON.stringify(res.data));
    const info = res.data.data.InfoList[0];
    info.ShareKey = shareKey;
    return info;
  }

  /**
   * 获取单文件下载直链
   */
  async getDownUrl(reqBodyJson) {
    // 5. 获取签名
    const [authK, authV] = getSign('/a/api/share/download/info');
    const downloadApi = `https://www.123pan.com/a/api/share/download/info?${authK}=${authV}`;
    const downRes = await axios.post(downloadApi, {
      ShareKey: reqBodyJson.ShareKey,
      FileID: reqBodyJson.FileId,
      S3keyFlag: reqBodyJson.S3KeyFlag,
      Size: reqBodyJson.Size,
      Etag: reqBodyJson.Etag
    }, { headers: this.headers });

    if (downRes.data.code !== 0) throw new Error('下载API返回异常: ' + JSON.stringify(downRes.data));
    let downURL = downRes.data.data.DownloadURL;

    // 6. 解析最终直链（Base64解码）
    downURL = await this.decodeAndGetFinalUrl(downURL);

    const info = reqBodyJson;
    const fileInfo = {
      fileName: info.FileName,
      fileSize: formatFileSize(info.Size),
      fileType: getFileTypeByName(info.FileName),
      uploadTime: info.CreateAt || ''
    };

    return {
      success: true,
      panType: this.panType,
      shareId: this.shareId,
      shareKey: `pan123:${info.ShareKey}`,
      fileInfo,
      downloadUrl: downURL,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取文件夹批量下载直链
   */
  async getZipDownUrl(reqBodyJson) {
    const [authK, authV] = getSign('/b/api/file/batch_download_share_info');
    const batchApi = `https://www.123pan.com/b/api/file/batch_download_share_info?${authK}=${authV}`;
    const downRes = await axios.post(batchApi, {
      ShareKey: reqBodyJson.ShareKey,
      fileIdList: [{ fileId: reqBodyJson.FileId }]
    }, { headers: this.headers });

    if (downRes.data.code !== 0) throw new Error('批量下载API返回异常: ' + JSON.stringify(downRes.data));
    let downURL = downRes.data.data.DownloadUrl;

    // 解析最终直链
    downURL = await this.decodeAndGetFinalUrl(downURL);

    const info = reqBodyJson;
    const fileInfo = {
      fileName: info.FileName,
      fileSize: formatFileSize(info.Size),
      fileType: getFileTypeByName(info.FileName),
      uploadTime: info.CreateAt || ''
    };

    return {
      success: true,
      panType: this.panType,
      shareId: this.shareId,
      shareKey: `pan123:${info.ShareKey}`,
      fileInfo,
      downloadUrl: downURL,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 解码最终直链
   */
  async decodeAndGetFinalUrl(downURL) {
    // 解析 params 参数并 base64 解码
    const urlObj = new URL(downURL);
    const params = urlObj.searchParams.get('params');
    if (!params) return downURL;
    const decodeByte = Buffer.from(params, 'base64');
    const downUrl2 = decodeByte.toString();
    // 再请求一次获取最终直链
    const res3 = await axios.get(downUrl2, { headers: this.headers });
    if (res3.data.code !== 0) throw new Error('最终直链API返回异常: ' + JSON.stringify(res3.data));
    return res3.data.data.redirect_url;
  }


  /**
   * 验证URL是否为123云盘链接
   * @param {string} url 分享链接
   * @returns {object|null} 验证结果
   */
  validateUrl(url) {
    const patterns = [
      /https:\/\/www\.(123pan\.com|123865\.com|123684\.com|123912\.com|123pan\.cn)\/s\/(?<KEY>[^/?#]+)(?:\.html)?/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          isValid: true,
          shareId: match[2],
          panType: 'pan123'
        };
      }
    }
    
    return null;
  }
}

module.exports = Pan123Parser; 