/**
 * 奶牛快传解析器
 * 支持奶牛快传分享链接的直链解析
 */

const { get: httpGet, post, parseHTML, retryRequest } = require('../utils/http-client');
const { get: cacheGet, set, generateCacheKey, getCacheTTL } = require('../utils/cache');
const { logger } = require('../utils/logger');
const config = require('../config/app-config');

class CowParser {
  constructor() {
    this.config = config.netdisk.cow;
    this.panType = 'cow';
  }

  /**
   * 解析奶牛快传分享链接
   * @param {string} shareId 分享ID
   * @param {string} password 密码（可选）
   * @returns {Promise<object>} 解析结果
   */
  async parse(shareId, password = '') {
    const cacheKey = generateCacheKey(this.panType, shareId, password);
    
    // 检查缓存
    const cached = cacheGet(cacheKey);
    if (cached) {
      logger.info(`Cache hit for cow: ${shareId}`);
      return cached;
    }

    try {
      logger.info(`Parsing cow share: ${shareId}`);
      
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
      
      logger.info(`Successfully parsed cow share: ${shareId}`);
      return result;

    } catch (error) {
      logger.error(`Failed to parse cow share: ${shareId}`, { error: error.message });
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
      const response = await retryRequest(() => 
        httpGet(`${this.config.apiUrl}/${shareId}`, {
          headers: this.config.headers
        })
      );

      if (response && response.data) {
        const data = response.data;
        return {
          fileName: data.fileName || data.name,
          fileSize: this.formatFileSize(data.fileSize || data.size),
          needPassword: data.needPassword || false,
          fileId: data.fileId || data.id,
          guid: data.guid
        };
      }

      throw new Error('分享信息格式错误');
    } catch (error) {
      logger.error('Failed to get share info', { error: error.message });
      throw error;
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
        guid: shareInfo.guid,
        fileId: shareInfo.fileId
      };

      if (password) {
        postData.password = password;
      }

      const response = await retryRequest(() => 
        post(`${this.config.apiUrl}/download`, postData, {
          headers: {
            ...this.config.headers,
            'Content-Type': 'application/json'
          }
        })
      );

      if (response && response.data && response.data.downloadUrl) {
        return response.data.downloadUrl;
      }

      throw new Error('获取下载链接失败');
    } catch (error) {
      logger.error('Failed to get download URL', { error: error.message });
      throw error;
    }
  }

  /**
   * 格式化文件大小
   * @param {number} bytes 字节数
   * @returns {string} 格式化的大小
   */
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '未知';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 验证URL是否为奶牛快传链接
   * @param {string} url 分享链接
   * @returns {object|null} 验证结果
   */
  validateUrl(url) {
    const patterns = [
      /https?:\/\/(www\.)?cowtransfer\.com\/s\/([a-zA-Z0-9]+)/,
      /https?:\/\/(www\.)?cowtransfer\.com\/share\/([a-zA-Z0-9]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          isValid: true,
          shareId: match[2],
          panType: 'cow'
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

module.exports = CowParser; 