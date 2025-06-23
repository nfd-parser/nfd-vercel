/**
 * 小飞机网盘解析器（https://www.feijix.com/）
 * 严格参考Java版FjTool实现
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { get: cacheGet, set: cacheSet, generateCacheKey, getCacheTTL } = require('../utils/cache');
const { logger } = require('../utils/logger');
const { encrypt2Hex } = require('../utils/aes-utils');
const { get: httpGet, post: httpPost } = require('../utils/http-client');
const { normalizeFileSize, getFileType } = require('../utils/file-utils');

const API_URL_PREFIX = 'https://api.feijipan.com/ws/';
const REFERER_URL = 'https://share.feijipan.com/';

class FjParser {
  constructor() {
    this.panType = 'fj';
    this.headers = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Content-Length': '0',
      'DNT': '1',
      'Pragma': 'no-cache',
      'Referer': 'https://www.feijix.com/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    };
  }

  /**
   * 解析小飞机网盘分享链接
   * @param {string} shareKey 分享key
   * @param {string} password 分享密码（无用）
   * @returns {Promise<object>} 解析结果
   */
  async parse(shareKey, password = '') {
    const cacheKey = generateCacheKey(this.panType, shareKey, password);
    const cached = cacheGet(cacheKey);
    if (cached) {
      logger.info(`Cache hit for fj: ${shareKey}`);
      return cached;
    }
    try {
      // 1. 生成uuid和加密时间戳
      const uuid = uuidv4().replace(/-/g, '').slice(0, 20);
      const nowTs = Date.now().toString();
      const tsEncode = encrypt2Hex(nowTs);
      // 2. 会员接口（必须请求一次）
      const vipUrl = `${API_URL_PREFIX}buy/vip/list?devType=6&devModel=Chrome&uuid=${uuid}&extra=2&timestamp=${tsEncode}`;
      await httpGet(vipUrl, { headers: this.headers });
      // 3. 获取文件信息
      const firstUrl = `${API_URL_PREFIX}recommend/list?devType=6&devModel=Chrome&uuid=${uuid}&extra=2&timestamp=${tsEncode}&shareId=${shareKey}&type=0&offset=1&limit=60`;
      const res1 = await httpGet(firstUrl, { headers: this.headers });
      const resJson = res1.data;
      if (resJson.code !== 200) throw new Error('文件信息接口异常: ' + JSON.stringify(resJson));
      if (!resJson.list || resJson.list.length === 0) throw new Error('文件列表为空: ' + JSON.stringify(resJson));
      const fileInfo = resJson.list[0];
      const fileNameInfo = fileInfo.fileList[0] || {};
      const fileSizeStr = normalizeFileSize(String(fileNameInfo.fileSize));
      let fileType = getFileType(fileNameInfo.fileName);

      const fileId = fileInfo.fileIds;
      const userId = fileInfo.userId;
      // 4. 生成第二次请求参数
      const nowTs2 = Date.now().toString();
      const tsEncode2 = encrypt2Hex(nowTs2);
      const fidEncode = encrypt2Hex(fileId + '|' + userId);
      const auth = encrypt2Hex(fileId + '|' + nowTs2);
      const secondUrl = `${API_URL_PREFIX}file/redirect?downloadId=${fidEncode}&enable=1&devType=6&uuid=${uuid}&timestamp=${tsEncode2}&auth=${auth}&shareId=${shareKey}`;
      // 5. 获取302重定向直链
      const resp = await httpGet(secondUrl, { headers: this.headers, maxRedirects: 0, validateStatus: s => s === 302 });
      const realUrl = resp.headers['location'];
      if (!realUrl) throw new Error('未获取到最终下载直链');
      if (!fileNameInfo.fileName) {
        try {
          const urlObj = new URL(realUrl);
          const dn = urlObj.searchParams.get('download_name');
          if (dn) {
            fileType = getFileType(dn);
            fileNameInfo.fileName = dn;
            fileNameInfo.fileType = fileType;
          }
        } catch (e) {}
      }
      // 6. 构建返回
      const result = {
        success: true,
        panType: this.panType,
        shareId: shareKey,
        fileName: fileNameInfo.fileName,
        fileSize: fileSizeStr,
        fileType: fileType,
        uploadTime: fileNameInfo.updTime,
        uploader: fileInfo.map.userName,
        downloadUrl: realUrl,
        fileInfo: fileInfo,
        timestamp: new Date().toISOString()
      };
      cacheSet(cacheKey, result, getCacheTTL(this.panType));
      return result;
    } catch (err) {
      logger.error(`小飞机网盘解析失败: ${shareKey}`, { error: err.message });
      throw err;
    }
  }


  /**
   * 校验是否为小飞机网盘链接
   * @param {string} url
   * @returns {object|null}
   */
  static validateUrl(url) {
    const pattern = /https:\/\/(share\.feijipan\.com|www\.feijix\.com)\/s\/(?<KEY>.+)/;
    const match = url.match(pattern);
    if (match) {
      return {
        isValid: true,
        shareId: match.groups.KEY,
        panType: 'fj'
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
    const pattern = /https:\/\/(share\.feijipan\.com|www\.feijix\.com)\/s\/(?<KEY>.+)/;
    const match = url.match(pattern);
    return match && match.groups && match.groups.KEY ? match.groups.KEY : null;
  }
}

module.exports = FjParser; 