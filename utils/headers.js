/**
 * 请求头管理模块
 * 提供统一的请求头配置，支持不同解析器的个性化设置
 */

const { logger } = require('./logger');

/**
 * 基础请求头配置
 */
const BASE_HEADERS = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
  'accept-encoding': 'gzip, deflate, br, zstd',
  'cache-control': 'no-cache',
  'connection': 'keep-alive',
  'dnt': '1',
  'pragma': 'no-cache',
  'sec-ch-ua': '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0'
};

/**
 * 基础Cookie配置
 */
const BASE_COOKIES = {
  'codelen': '1',
  'pc_ad1': '1'
};

/**
 * 不同解析器的个性化请求头配置
 */
const PARSER_HEADERS = {
  // 蓝奏云解析器配置
  'lanzou': {
    // 分享页面请求头
    share: {
      ...BASE_HEADERS,
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1'
    },
    // iframe页面请求头
    iframe: {
      ...BASE_HEADERS,
      'sec-fetch-dest': 'iframe',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin'
    },
    // API请求头
    api: {
      'accept': 'application/json, text/javascript, */*',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      'content-type': 'application/x-www-form-urlencoded',
      'sec-ch-ua': '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'XMLHttpRequest',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  },
  
  // 奶牛快传解析器配置
  'cow': {
    share: {
      ...BASE_HEADERS,
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none'
    },
    api: {
      'accept': 'application/json, text/javascript, */*',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      'content-type': 'application/json',
      'sec-ch-ua': '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'XMLHttpRequest'
    }
  },
  
  // 123云盘解析器配置
  'pan123': {
    share: {
      ...BASE_HEADERS,
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none'
    },
    api: {
      'accept': 'application/json, text/javascript, */*',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      'content-type': 'application/json',
      'sec-ch-ua': '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'XMLHttpRequest'
    }
  }
};

/**
 * 获取解析器的请求头配置
 * @param {string} parserType 解析器类型 (lanzou, cow, pan123)
 * @param {string} requestType 请求类型 (share, iframe, api)
 * @param {object} customHeaders 自定义请求头
 * @returns {object} 请求头配置
 */
function getHeaders(parserType, requestType = 'share', customHeaders = {}) {
  try {
    // 获取基础配置
    const baseConfig = PARSER_HEADERS[parserType] || {};
    const typeConfig = baseConfig[requestType] || BASE_HEADERS;
    
    // 合并自定义请求头
    const headers = { ...typeConfig, ...customHeaders };
    
    // 添加Cookie
    if (requestType === 'share' || requestType === 'iframe') {
      headers.cookie = Object.entries(BASE_COOKIES)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    }
    
    logger.debug(`Generated headers for ${parserType}:${requestType}`, headers);
    return headers;
  } catch (error) {
    logger.error('Get headers failed:', error);
    return BASE_HEADERS;
  }
}

/**
 * 为特定URL设置Referer
 * @param {object} headers 基础请求头
 * @param {string} referer URL
 * @returns {object} 带Referer的请求头
 */
function setReferer(headers, referer) {
  if (referer) {
    return { ...headers, 'Referer': referer };
  }
  return headers;
}

/**
 * 为API请求设置特殊请求头
 * @param {object} headers 基础请求头
 * @param {string} contentType 内容类型
 * @returns {object} API请求头
 */
function setApiHeaders(headers, contentType = 'application/x-www-form-urlencoded') {
  return {
    ...headers,
    'content-type': contentType,
    'x-requested-with': 'XMLHttpRequest',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin'
  };
}

/**
 * 获取默认的User-Agent
 * @returns {string} User-Agent字符串
 */
function getDefaultUserAgent() {
  return BASE_HEADERS['user-agent'];
}

/**
 * 获取默认的Accept头
 * @returns {string} Accept字符串
 */
function getDefaultAccept() {
  return BASE_HEADERS['accept'];
}

module.exports = {
  getHeaders,
  setReferer,
  setApiHeaders,
  getDefaultUserAgent,
  getDefaultAccept,
  BASE_HEADERS,
  BASE_COOKIES,
  PARSER_HEADERS
}; 