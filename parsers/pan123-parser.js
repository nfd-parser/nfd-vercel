/**
 * 123云盘解析器
 * 支持123云盘分享链接的直链解析
 * 注意：这是一个示例实现，实际使用时需要根据123云盘的具体API进行调整
 */

const { get: httpGet, post, parseHTML, retryRequest } = require('../utils/http-client');
const { get: cacheGet, set, generateCacheKey, getCacheTTL } = require('../utils/cache');
const { logger } = require('../utils/logger');
const config = require('../config/app-config');

class Pan123Parser {
  constructor() {
    this.config = config.netdisk.pan123;
    this.panType = 'pan123';
  }

  /**
   * 解析123云盘分享链接
   * @param {string} shareId 分享ID
   * @param {string} password 密码（可选）
   * @returns {Promise<object>} 解析结果
   */
  async parse(shareId, password = '') {
    const cacheKey = generateCacheKey(this.panType, shareId, password);
    
    // 检查缓存
    const cached = cacheGet(cacheKey);
    if (cached) {
      logger.info(`Cache hit for pan123: ${shareId}`);
      return cached;
    }

    try {
      logger.info(`Parsing pan123 share: ${shareId}`);
      
      // 获取分享信息
      const shareInfo = await this.getShareInfo(shareId);
      
      if (!shareInfo) {
        throw new Error('无法获取分享信息');
      }

      // 检查是否需要密码
      if (shareInfo.needPassword && !password) {
        throw new Error('此分享需要密码');
      }

      // 获取下载链接
      const downloadUrl = await this.getDownloadUrl(shareId, password, shareInfo);

      // 构建结果
      const result = {
        success: true,
        panType: this.panType,
        shareId,
        fileName: shareInfo.fileName,
        fileSize: shareInfo.fileSize,
        downloadUrl,
        timestamp: new Date().toISOString()
      };

      // 缓存结果
      set(cacheKey, result, getCacheTTL(this.panType));
      
      logger.info(`Successfully parsed pan123 share: ${shareId}`);
      return result;

    } catch (error) {
      logger.error(`Failed to parse pan123 share: ${shareId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * 获取分享信息
   * @param {string} shareId 分享ID
   * @returns {Promise<object>} 分享信息
   */
  async getShareInfo(shareId) {
    try {
      // 构建分享页面URL
      const shareUrl = `${this.config.baseUrl}/s/${shareId}`;
      
      // 获取分享页面
      const response = await retryRequest(() => httpGet(shareUrl));
      
      // 解析HTML
      const $ = parseHTML(response.data);
      
      // 提取文件信息
      const fileInfo = this.extractFileInfo($);
      
      if (!fileInfo) {
        throw new Error('无法解析文件信息');
      }
      
      return fileInfo;
    } catch (error) {
      logger.error('Failed to get share info', { error: error.message });
      throw error;
    }
  }

  /**
   * 从HTML中提取文件信息
   * @param {object} $ cheerio对象
   * @returns {object} 文件信息
   */
  extractFileInfo($) {
    try {
      // 检查是否需要密码
      const needPassword = $('.password-input').length > 0 || 
                          $('[data-password]').length > 0;
      
      // 提取文件名
      const fileName = $('.file-name').text().trim() ||
                      $('.filename').text().trim() ||
                      $('title').text().replace('123云盘', '').trim();
      
      // 提取文件大小
      const fileSizeText = $('.file-size').text().trim() ||
                          $('.size').text().trim();
      const fileSize = this.parseFileSize(fileSizeText);
      
      // 提取其他信息
      const fileId = $('input[name="file_id"]').val() ||
                    $('[data-file-id]').attr('data-file-id');
      
      const shareToken = $('input[name="share_token"]').val() ||
                        $('[data-share-token]').attr('data-share-token');
      
      return {
        needPassword,
        fileName,
        fileSize,
        fileId,
        shareToken
      };
    } catch (error) {
      logger.error('Failed to extract file info from HTML', { error: error.message });
      return null;
    }
  }

  /**
   * 获取下载链接
   * @param {string} shareId 分享ID
   * @param {string} password 密码
   * @param {object} shareInfo 分享信息
   * @returns {Promise<string>} 下载链接
   */
  async getDownloadUrl(shareId, password, shareInfo) {
    try {
      const postData = {
        share_id: shareId,
        file_id: shareInfo.fileId,
        share_token: shareInfo.shareToken
      };

      if (password) {
        postData.password = password;
      }

      const response = await retryRequest(() => 
        post(this.config.apiUrl, postData, {
          headers: {
            ...this.config.headers,
            'Content-Type': 'application/json'
          }
        })
      );

      if (response && response.data && response.data.code === 0 && response.data.data && response.data.data.download_url) {
        return response.data.data.download_url;
      }

      throw new Error(response?.data?.message || '获取下载链接失败');
    } catch (error) {
      logger.error('Failed to get download URL', { error: error.message });
      throw error;
    }
  }

  /**
   * 解析文件大小
   * @param {string} sizeText 大小文本
   * @returns {string} 格式化的大小
   */
  parseFileSize(sizeText) {
    if (!sizeText) return '未知';
    
    // 移除多余字符
    const cleanSize = sizeText.replace(/[^\d.]/g, '');
    if (!cleanSize) return sizeText;
    
    return sizeText.trim();
  }

  /**
   * 验证URL是否为123云盘链接
   * @param {string} url 分享链接
   * @returns {object|null} 验证结果
   */
  validateUrl(url) {
    const patterns = [
      /https?:\/\/(www\.)?123pan\.com\/s\/([a-zA-Z0-9]+)/,
      /https?:\/\/(www\.)?123pan\.com\/share\/([a-zA-Z0-9]+)/
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

  /**
   * 从URL中提取分享ID
   * @param {string} url 分享链接
   * @returns {string|null} 分享ID
   */
  extractShareId(url) {
    const match = url.match(/\/([a-zA-Z0-9]+)(?:\/|$)/);
    return match ? match[1] : null;
  }
}

module.exports = Pan123Parser; 