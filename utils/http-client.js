/**
 * HTTP客户端工具模块
 * 提供统一的HTTP请求功能，支持重试、缓存等特性
 */

const axios = require('axios');
const { logger } = require('./logger');
const { getHeaders, setReferer } = require('./headers');

// 创建axios实例
const httpClient = axios.create({
  timeout: 30000,
  maxRedirects: 5,
  validateStatus: (status) => status >= 200 && status < 501,
  // 忽略SSL证书错误
  httpsAgent: new (require('https').Agent)({
    rejectUnauthorized: false
  })
});

/**
 * 发送GET请求
 * @param {string} url 请求URL
 * @param {object} options 请求选项
 * @param {string} parserType 解析器类型
 * @param {string} requestType 请求类型
 * @returns {Promise<object>} 响应结果
 */
async function get(url, options = {}, parserType = 'default', requestType = 'share') {
  try {
    // 获取请求头
    const headers = getHeaders(parserType, requestType, options.headers || {});
    
    // 设置Referer
    const finalHeaders = setReferer(headers, options.referer);
    
    const config = {
      method: 'GET',
      url,
      headers: finalHeaders,
      ...options
    };
    
    logger.debug(`HTTP GET request: ${url}`, { parserType, requestType });
    
    const response = await httpClient(config);
    
    // 只返回必要的数据，避免循环引用
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers ? JSON.parse(JSON.stringify(response.headers)) : {}
    };
  } catch (error) {
    logger.error(`HTTP GET failed: ${url}`, error.message);
    throw error;
  }
}

/**
 * 发送POST请求
 * @param {string} url 请求URL
 * @param {object|string} data 请求数据
 * @param {object} options 请求选项
 * @param {string} parserType 解析器类型
 * @param {string} requestType 请求类型
 * @returns {Promise<object>} 响应结果
 */
async function post(url, data, options = {}, parserType = 'default', requestType = 'api') {
  try {
    // 获取请求头
    const headers = getHeaders(parserType, requestType, options.headers || {});
    
    // 设置Referer
    const finalHeaders = setReferer(headers, options.referer);
    
    const config = {
      method: 'POST',
      url,
      data,
      headers: finalHeaders,
      ...options
    };
    
    logger.debug(`HTTP POST request: ${url}`, { parserType, requestType });
    
    const response = await httpClient(config);
    
    // 只返回必要的数据，避免循环引用
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers ? JSON.parse(JSON.stringify(response.headers)) : {}
    };
  } catch (error) {
    logger.error(`HTTP POST failed: ${url}`, error.message);
    throw error;
  }
}

/**
 * 重试请求函数
 * @param {Function} requestFn 请求函数
 * @param {number} maxRetries 最大重试次数
 * @param {number} delay 重试延迟(毫秒)
 * @returns {Promise<object>} 响应结果
 */
async function retryRequest(requestFn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      logger.warn(`Request attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
}

/**
 * 解析HTML内容
 * @param {string} html HTML字符串
 * @returns {object} 解析后的DOM对象
 */
function parseHTML(html) {
  // 这里可以集成cheerio等HTML解析库
  // 目前返回原始HTML，后续可以扩展
  return { html };
}

module.exports = {
  get,
  post,
  retryRequest,
  parseHTML,
  httpClient
}; 