/**
 * 缓存工具模块
 * 使用node-cache实现内存缓存
 */

const NodeCache = require('node-cache');
const config = require('../config/app-config');
const { logger } = require('./logger');

// 创建缓存实例
const cache = new NodeCache({
  stdTTL: config.cache.defaultTTL, // 默认缓存时间
  checkperiod: 600, // 检查过期时间间隔（秒）
  useClones: false, // 不使用克隆，提高性能
  deleteOnExpire: true // 过期时自动删除
});

/**
 * 获取缓存
 * @param {string} key 缓存键
 * @returns {any} 缓存值
 */
const get = (key) => {
  try {
    const value = cache.get(key);
    if (value !== undefined) {
      logger.debug(`Cache hit: ${key}`);
      return value;
    }
    logger.debug(`Cache miss: ${key}`);
    return null;
  } catch (error) {
    logger.error(`Cache get error: ${error.message}`, { key });
    return null;
  }
};

/**
 * 设置缓存
 * @param {string} key 缓存键
 * @param {any} value 缓存值
 * @param {number} ttl 缓存时间（秒）
 */
const set = (key, value, ttl = config.cache.defaultTTL) => {
  try {
    cache.set(key, value, ttl);
    logger.debug(`Cache set: ${key}, TTL: ${ttl}s`);
  } catch (error) {
    logger.error(`Cache set error: ${error.message}`, { key, ttl });
  }
};

/**
 * 删除缓存
 * @param {string} key 缓存键
 */
const del = (key) => {
  try {
    cache.del(key);
    logger.debug(`Cache delete: ${key}`);
  } catch (error) {
    logger.error(`Cache delete error: ${error.message}`, { key });
  }
};

/**
 * 清空所有缓存
 */
const flush = () => {
  try {
    cache.flushAll();
    logger.info('Cache flushed');
  } catch (error) {
    logger.error(`Cache flush error: ${error.message}`);
  }
};

/**
 * 获取缓存统计信息
 * @returns {object} 缓存统计信息
 */
const getStats = () => {
  try {
    return cache.getStats();
  } catch (error) {
    logger.error(`Cache stats error: ${error.message}`);
    return {};
  }
};

/**
 * 获取缓存键列表
 * @returns {string[]} 缓存键列表
 */
const getKeys = () => {
  try {
    return cache.keys();
  } catch (error) {
    logger.error(`Cache keys error: ${error.message}`);
    return [];
  }
};

/**
 * 检查缓存是否存在
 * @param {string} key 缓存键
 * @returns {boolean} 是否存在
 */
const has = (key) => {
  try {
    return cache.has(key);
  } catch (error) {
    logger.error(`Cache has error: ${error.message}`, { key });
    return false;
  }
};

/**
 * 获取缓存剩余时间
 * @param {string} key 缓存键
 * @returns {number} 剩余时间（秒）
 */
const getTtl = (key) => {
  try {
    return cache.getTtl(key);
  } catch (error) {
    logger.error(`Cache TTL error: ${error.message}`, { key });
    return 0;
  }
};

/**
 * 根据网盘类型获取缓存时间
 * @param {string} panType 网盘类型
 * @returns {number} 缓存时间（秒）
 */
const getCacheTTL = (panType) => {
  const ttlMap = {
    'lz': config.cache.lanzouTTL,
    'cow': config.cache.cowTTL,
    'pan123': config.cache.pan123TTL,
    'mobile': config.cache.mobileTTL,
    'telegram': config.cache.telegramTTL,
    'fang360': config.cache.fang360TTL,
    'wenshushu': config.cache.wenshushuTTL,
    'quark': config.cache.quarkTTL,
    'uc': config.cache.ucTTL
  };
  
  return ttlMap[panType] || config.cache.defaultTTL;
};

/**
 * 生成缓存键
 * @param {string} panType 网盘类型
 * @param {string} shareId 分享ID
 * @param {string} password 密码（可选）
 * @returns {string} 缓存键
 */
const generateCacheKey = (panType, shareId, password = '') => {
  const key = `${panType}:${shareId}`;
  return password ? `${key}:${password}` : key;
};

module.exports = {
  cache,
  get,
  set,
  del,
  flush,
  getStats,
  getKeys,
  has,
  getTtl,
  getCacheTTL,
  generateCacheKey
}; 