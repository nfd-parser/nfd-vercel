/**
 * 解析器管理器
 * 统一管理所有网盘解析器
 */

const LanzouParser = require('./lanzou-parser');
const CowParser = require('./cow-parser');
const Pan123Parser = require('./pan123-parser');
const { logger } = require('../utils/logger');

class ParserManager {
  constructor() {
    // 初始化所有解析器
    this.parsers = {
      'lz': new LanzouParser(),
      'cow': new CowParser(),
      'pan123': new Pan123Parser()
      // 可以继续添加其他解析器
      // 'mobile': new MobileParser(),
      // 'telegram': new TelegramParser(),
      // 'fang360': new Fang360Parser(),
      // 'wenshushu': new WenshushuParser(),
      // 'quark': new QuarkParser(),
      // 'uc': new UcParser()
    };

    // 网盘类型映射
    this.panTypeMap = {
      'lanzou': 'lz',
      'lz': 'lz',
      'cowtransfer': 'cow',
      'cow': 'cow',
      '123pan': 'pan123',
      'pan123': 'pan123',
      'mobile': 'mobile',
      'telegram': 'telegram',
      'fang360': 'fang360',
      'wenshushu': 'wenshushu',
      'quark': 'quark',
      'uc': 'uc'
    };

    // 支持的网盘列表
    this.supportedPans = [
      {
        name: '蓝奏云',
        type: 'lz',
        domains: ['lanzoux.com', 'lanzoui.com', 'lanzou.com'],
        description: '支持普通分享和加密分享，单文件最大100M'
      },
      {
        name: '奶牛快传',
        type: 'cow',
        domains: ['cowtransfer.com'],
        description: '支持普通分享，无单文件大小限制'
      },
      {
        name: '123云盘',
        type: 'pan123',
        domains: ['123pan.com'],
        description: '支持普通分享和加密分享，单文件最大100G'
      }
      // 可以继续添加其他网盘信息
    ];
  }

  /**
   * 获取解析器
   * @param {string} panType 网盘类型
   * @returns {object|null} 解析器实例
   */
  getParser(panType) {
    const normalizedType = this.panTypeMap[panType.toLowerCase()];
    return this.parsers[normalizedType] || null;
  }

  /**
   * 解析分享链接
   * @param {string} panType 网盘类型
   * @param {string} shareId 分享ID
   * @param {string} password 密码（可选）
   * @returns {Promise<object>} 解析结果
   */
  async parse(panType, shareId, password = '') {
    const parser = this.getParser(panType);
    
    if (!parser) {
      throw new Error(`不支持的网盘类型: ${panType}`);
    }

    try {
      return await parser.parse(shareId, password);
    } catch (error) {
      logger.error(`Parser error for ${panType}:`, { error: error.message });
      throw error;
    }
  }

  /**
   * 自动识别网盘类型并解析
   * @param {string} url 分享链接
   * @param {string} password 密码（可选）
   * @returns {Promise<object>} 解析结果
   */
  async parseByUrl(url, password = '') {
    try {
      // 尝试识别网盘类型
      const panInfo = this.identifyPanType(url);
      
      if (!panInfo) {
        throw new Error('无法识别的网盘链接');
      }

      return await this.parse(panInfo.type, panInfo.shareId, password);
    } catch (error) {
      logger.error('Failed to parse by URL:', { url, error: error.message });
      throw error;
    }
  }

  /**
   * 识别网盘类型
   * @param {string} url 分享链接
   * @returns {object|null} 网盘信息
   */
  identifyPanType(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // 遍历所有解析器，尝试匹配
      for (const [type, parser] of Object.entries(this.parsers)) {
        const validation = parser.validateUrl(url);
        if (validation && validation.isValid) {
          return {
            type,
            shareId: validation.shareId,
            hostname
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to identify pan type:', { url, error: error.message });
      return null;
    }
  }

  /**
   * 获取支持的网盘列表
   * @returns {Array} 支持的网盘列表
   */
  getSupportedPans() {
    return this.supportedPans;
  }

  /**
   * 检查是否支持指定网盘类型
   * @param {string} panType 网盘类型
   * @returns {boolean} 是否支持
   */
  isSupported(panType) {
    return !!this.getParser(panType);
  }

  /**
   * 获取解析器统计信息
   * @returns {object} 统计信息
   */
  getStats() {
    const stats = {
      totalParsers: Object.keys(this.parsers).length,
      supportedTypes: Object.keys(this.parsers),
      panTypeMap: this.panTypeMap,
      supportedPans: this.supportedPans.length
    };

    return stats;
  }

  /**
   * 批量解析
   * @param {Array} tasks 解析任务列表
   * @returns {Promise<Array>} 解析结果列表
   */
  async batchParse(tasks) {
    const results = [];
    
    for (const task of tasks) {
      try {
        const result = await this.parse(task.panType, task.shareId, task.password);
        results.push({
          ...task,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          ...task,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 健康检查
   * @returns {object} 健康状态
   */
  healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      parsers: {}
    };

    for (const [type, parser] of Object.entries(this.parsers)) {
      health.parsers[type] = {
        available: true,
        type: parser.panType
      };
    }

    return health;
  }
}

module.exports = ParserManager; 