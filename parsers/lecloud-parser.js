/**
 * 联想乐云解析器（https://lecloud.lenovo.com/）
 * 严格参考Java版LeTool实现
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { get: cacheGet, set: cacheSet, generateCacheKey, getCacheTTL } = require('../utils/cache');
const { logger } = require('../utils/logger');

const API_URL_PREFIX = 'https://lecloud.lenovo.com/share/api/clouddiskapi/share/public/v1/';

class LeCloudParser {
  constructor() {
    this.panType = 'lecloud';
  }

  /**
   * 解析联想乐云分享链接
   * @param {string} shareKey 分享key
   * @param {string} password 分享密码
   * @returns {Promise<object>} 解析结果
   */
  async parse(shareKey, password = '') {
    const cacheKey = generateCacheKey(this.panType, shareKey, password);
    const cached = cacheGet(cacheKey);
    if (cached) {
      logger.info(`Cache hit for lecloud: ${shareKey}`);
      return cached;
    }
    try {
      // 1. 校验密码并获取文件信息
      const apiUrl1 = API_URL_PREFIX + 'shareInfo';
      const res1 = await axios.post(apiUrl1, {
        shareId: shareKey,
        password: password,
        directoryId: -1
      });
      const resJson = res1.data;
      if (!('result' in resJson)) throw new Error('接口返回异常: 缺少result字段');
      if (!resJson.result) throw new Error(`${resJson.errcode || ''}: ${resJson.errmsg || '未知错误'}`);
      const dataJson = resJson.data;
      if (!dataJson.passwordVerified) throw new Error(`密码验证失败, 分享key: ${shareKey}, 密码: ${password}`);
      const files = dataJson.files;
      if (!files || files.length === 0) throw new Error('接口返回异常: files字段为空');
      const fileInfoJson = files[0];
      if (!fileInfoJson) throw new Error('接口返回异常: 文件信息为空');
      const fileId = fileInfoJson.fileId;
      // 2. 获取下载直链
      const downloadUrl = await this.getDownURL(shareKey, fileId);
      // 3. 构建返回结果
      const result = {
        success: true,
        panType: this.panType,
        shareId: shareKey,
        fileName: fileInfoJson.fileName || '',
        fileSize: fileInfoJson.fileSize || '',
        fileType: fileInfoJson.fileType || '',
        downloadUrl,
        fileInfo: fileInfoJson,
        timestamp: new Date().toISOString()
      };
      cacheSet(cacheKey, result, getCacheTTL(this.panType));
      return result;
    } catch (err) {
      logger.error(`联想乐云解析失败: ${shareKey}`, { error: err.message });
      throw err;
    }
  }

  /**
   * 获取下载直链（302重定向）
   * @param {string} shareKey 分享key
   * @param {string} fileId 文件ID
   * @returns {Promise<string>} 最终下载直链
   */
  async getDownURL(shareKey, fileId) {
    const apiUrl2 = API_URL_PREFIX + 'packageDownloadWithFileIds';
    const uuid = uuidv4();
    const res2 = await axios.post(apiUrl2, {
      fileIds: [fileId],
      shareId: shareKey,
      browserId: uuid
    });
    const resJson = res2.data;
    if (!('result' in resJson)) throw new Error('接口返回异常: 缺少result字段');
    if (!resJson.result) throw new Error(`${resJson.errcode || ''}: ${resJson.errmsg || '未知错误'}`);
    const dataJson = resJson.data;
    const downloadUrl = dataJson.downloadUrl;
    if (!downloadUrl) throw new Error('接口返回异常: downloadUrl不存在');
    // 获取302重定向后的真实直链
    const resp = await axios.get(downloadUrl, { maxRedirects: 0, validateStatus: s => s === 302 });
    const realUrl = resp.headers['location'];
    if (!realUrl) throw new Error('未获取到最终下载直链');
    return realUrl;
  }

  /**
   * 校验是否为联想乐云链接
   * @param {string} url
   * @returns {object|null}
   */
  static validateUrl(url) {
    const pattern = /https:\/\/lecloud\.lenovo\.com\/share\/([a-zA-Z0-9]+)/;
    const match = url.match(pattern);
    if (match) {
      return {
        isValid: true,
        shareId: match[1],
        panType: 'le'
      };
    }
    return null;
  }

  /**
   * 提取分享key
   * @param {string} url
   * @returns {string|null}
   */
  static extractShareKey(url) {
    const pattern = /https:\/\/lecloud\.lenovo\.com\/share\/([a-zA-Z0-9]+)/;
    const match = url.match(pattern);
    return match && match[1] ? match[1] : null;
  }
}

module.exports = LeCloudParser; 