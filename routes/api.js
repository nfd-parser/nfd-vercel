/**
 * API路由模块
 * 定义所有API端点
 * 格式与Java版本netdisk-fast-download完全一致
 */

const Router = require('koa-router');
const ParserManager = require('../parsers/parser-manager');
const { getStats, flush } = require('../utils/cache');
const { logger } = require('../utils/logger');
const { getCurrentBeijingTime } = require('../utils/file-utils');

const router = new Router();

// 初始化解析器管理器
const parserManager = new ParserManager();

/**
 * 根路径 - 服务信息
 * GET /
 */
router.get('/', async (ctx) => {
  const cacheStats = getStats();
  
  ctx.body = {
    success: true,
    message: '网盘直链解析服务',
    version: require('../package.json').version,
    timestamp: getCurrentBeijingTime(),
    cache: {
      hits: cacheStats.hits || 0,
      misses: cacheStats.misses || 0,
      keys: cacheStats.keys || 0
    },
    endpoints: {
      parser: '/parser?url=分享链接&pwd=xxx',
      redirect: '/d/网盘标识/分享key@分享密码',
      json: '/json/parser?url=分享链接&pwd=xxx',
      jsonDirect: '/json/网盘标识/分享key@分享密码',
      health: '/health',
      supported: '/supported',
      stats: '/stats'
    }
  };
});

/**
 * 解析并自动302跳转 - 与Java版本格式一致
 * GET /parser?url=分享链接&pwd=xxx
 * 或者 GET /parser?url=UrlEncode(分享链接)&pwd=xxx
 */
router.get('/parser', async (ctx) => {
  try {
    const { url, pwd } = ctx.query;
    
    if (!url) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供分享链接'
      };
      return;
    }
    
    logger.info(`Parser API request: ${url}`);
    
    const result = await parserManager.parseByUrl(url, pwd);
    
    if (result && result.downloadUrl) {
      // 302重定向到下载链接
      ctx.redirect(result.downloadUrl);
    } else {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '获取下载链接失败'
      };
    }
  } catch (error) {
    logger.error('Parser failed:', error);
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: error.message || '解析失败'
    };
  }
});

/**
 * 解析并自动302跳转 - 直接路径格式
 * GET /d/网盘标识/分享key@分享密码
 * 示例: /d/lz/ia2cntg@123456
 */
router.get('/d/:panType/:shareInfo', async (ctx) => {
  try {
    const { panType, shareInfo } = ctx.params;
    
    // 解析分享信息，格式：分享key@分享密码
    let shareId, password = '';
    if (shareInfo.includes('@')) {
      const parts = shareInfo.split('@');
      shareId = parts[0];
      password = parts[1] || '';
    } else {
      shareId = shareInfo;
    }
    
    logger.info(`Direct parser API request: ${panType}/${shareId}`);
    
    const result = await parserManager.parse(panType, shareId, password);
    
    if (result && result.downloadUrl) {
      // 302重定向到下载链接
      ctx.redirect(result.downloadUrl);
    } else {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '获取下载链接失败'
      };
    }
  } catch (error) {
    logger.error('Direct parser failed:', error);
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: error.message || '解析失败'
    };
  }
});

/**
 * 获取解析后的直链 - JSON格式
 * GET /json/parser?url=分享链接&pwd=xxx
 */
router.get('/json/parser', async (ctx) => {
  try {
    const { url, pwd } = ctx.query;
    
    if (!url) {
      ctx.status = 400;
      ctx.body = {
        code: 400,
        msg: '请提供分享链接',
        success: false,
        count: 0,
        data: null,
        timestamp: Date.now()
      };
      return;
    }
    
    logger.info(`JSON parser API request: ${url}`);
    
    const result = await parserManager.parseByUrl(url, pwd);
    
    // 检查是否返回了HTML错误信息
    if (result && result.error && result.html) {
      ctx.status = 500;
      ctx.body = {
        code: 500,
        msg: `API返回HTML内容: ${result.html.substring(0, 500)}...`,
        success: false,
        count: 0,
        data: null,
        timestamp: Date.now(),
        html: result.html
      };
      return;
    }
    
    // 构建符合要求的返回格式
    const responseData = {
      shareKey: `${result.panType}:${result.shareId}`,
      directLink: result.downloadUrl,
      cacheHit: result.cacheHit,
      expires: result.expires,
      expiration: result.cacheExpiration,
      fileInfo: {
        fileName: result.fileName || result.fileInfo?.fileName || '未知文件',
        fileSize: result.fileSize || result.fileInfo?.fileSize || '未知',
        fileType: result.fileType || result.fileInfo?.fileType || '未知',
        uploadTime: result.uploadTime || result.fileInfo?.uploadTime || '',
        uploader: result.uploader || result.fileInfo?.uploader || '',
        description: result.description || result.fileInfo?.description || ''
      }
    };

    ctx.body = {
      code: 200,
      msg: 'success',
      success: true,
      count: 0,
      data: responseData,
      timestamp: Date.now()
    };
  } catch (error) {
    logger.error('JSON parser failed:', error);
    
    // 检查错误是否包含HTML内容
    let errorMessage = error.message || '解析失败';
    let htmlContent = null;
    
    if (error.html) {
      htmlContent = error.html;
      errorMessage = `API返回HTML内容: ${error.html.substring(0, 200)}...`;
    }
    
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: errorMessage,
      success: false,
      count: 0,
      data: null,
      timestamp: Date.now(),
      ...(htmlContent && { html: htmlContent })
    };
  }
});

/**
 * 获取解析后的直链 - JSON格式，直接路径
 * GET /json/网盘标识/分享key@分享密码
 * 示例: /json/lz/ia2cntg@123456
 */
router.get('/json/:panType/:shareInfo', async (ctx) => {
  try {
    const { panType, shareInfo } = ctx.params;
    
    // 解析分享信息，格式：分享key@分享密码
    let shareId, password = '';
    if (shareInfo.includes('@')) {
      const parts = shareInfo.split('@');
      shareId = parts[0];
      password = parts[1] || '';
    } else {
      shareId = shareInfo;
    }
    
    logger.info(`JSON direct API request: ${panType}/${shareId}`);
    
    const result = await parserManager.parse(panType, shareId, password);
    
    // 检查是否返回了HTML错误信息
    if (result && result.error && result.html) {
      ctx.status = 500;
      ctx.body = {
        code: 500,
        msg: `API返回HTML内容: ${result.html.substring(0, 500)}...`,
        success: false,
        count: 0,
        data: null,
        timestamp: Date.now(),
        html: result.html
      };
      return;
    }
    
    // 构建符合要求的返回格式
    const responseData = {
      shareKey: `${result.panType}:${result.shareId}`,
      directLink: result.downloadUrl,
      cacheHit: result.cacheHit,
      expires: result.expires,
      expiration: result.cacheExpiration,
      fileInfo: {
        fileName: result.fileName || result.fileInfo?.fileName || '未知文件',
        fileSize: result.fileSize || result.fileInfo?.fileSize || '未知',
        fileType: result.fileType || result.fileInfo?.fileType || '未知',
        uploadTime: result.uploadTime || result.fileInfo?.uploadTime || '',
        uploader: result.uploader || result.fileInfo?.uploader || '',
        description: result.description || result.fileInfo?.description || ''
      }
    };

    ctx.body = {
      code: 200,
      msg: 'success',
      success: true,
      count: 0,
      data: responseData,
      timestamp: Date.now()
    };
  } catch (error) {
    logger.error('JSON direct failed:', error);
    
    // 检查错误是否包含HTML内容
    let errorMessage = error.message || '解析失败';
    let htmlContent = null;
    
    if (error.html) {
      htmlContent = error.html;
      errorMessage = `API返回HTML内容: ${error.html.substring(0, 200)}...`;
    }
    
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: errorMessage,
      success: false,
      count: 0,
      data: null,
      timestamp: Date.now(),
      ...(htmlContent && { html: htmlContent })
    };
  }
});

/**
 * 健康检查接口
 * GET /health
 */
router.get('/health', async (ctx) => {
  try {
    const health = parserManager.healthCheck();
    const cacheStats = getStats();
    
    ctx.body = {
      success: true,
      data: {
        ...health,
        cache: cacheStats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: require('../package.json').version
      }
    };
  } catch (error) {
    logger.error('Health check failed:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '健康检查失败'
    };
  }
});

/**
 * 获取支持的网盘列表
 * GET /supported
 */
router.get('/supported', async (ctx) => {
  try {
    const supportedPans = parserManager.getSupportedPans();
    const stats = parserManager.getStats();
    
    ctx.body = {
      success: true,
      data: {
        supportedPans,
        stats
      }
    };
  } catch (error) {
    logger.error('Get supported pans failed:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取支持的网盘列表失败'
    };
  }
});

/**
 * 获取统计信息
 * GET /stats
 */
router.get('/stats', async (ctx) => {
  try {
    const stats = parserManager.getStats();
    const cacheStats = getStats();
    
    ctx.body = {
      success: true,
      data: {
        parser: stats,
        cache: cacheStats,
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          platform: process.platform,
          nodeVersion: process.version
        }
      }
    };
  } catch (error) {
    logger.error('Get stats failed:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取统计信息失败'
    };
  }
});

/**
 * 获取缓存统计信息
 * GET /cache/stats
 */
router.get('/cache/stats', async (ctx) => {
  try {
    const stats = getStats();
    
    ctx.body = {
      success: true,
      data: stats
    };
  } catch (error) {
    logger.error('Get cache stats failed:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取缓存统计失败'
    };
  }
});

/**
 * 清空缓存
 * POST /cache/flush
 */
router.post('/cache/flush', async (ctx) => {
  try {
    flush();
    
    ctx.body = {
      success: true,
      message: '缓存已清空'
    };
  } catch (error) {
    logger.error('Flush cache failed:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '清空缓存失败'
    };
  }
});

/**
 * 测试解析器
 * POST /test/:panType
 */
router.post('/test/:panType', async (ctx) => {
  try {
    const { panType } = ctx.params;
    const { shareId, password } = ctx.request.body;
    
    if (!shareId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供分享ID'
      };
      return;
    }
    
    logger.info(`API test request: ${panType}/${shareId}`);
    
    const result = await parserManager.parse(panType, shareId, password);
    
    ctx.body = {
      success: true,
      data: result
    };
  } catch (error) {
    logger.error('Test parser failed:', error);
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: error.message || '测试失败'
    };
  }
});

/**
 * 解析器接口 - 解析分享链接 (POST格式)
 * POST /api/parser
 */
router.post('/parser', async (ctx) => {
  try {
    const { url, password = '' } = ctx.request.body;
    
    if (!url) {
      ctx.status = 400;
      ctx.body = {
        code: 400,
        msg: '缺少必要参数: url',
        success: false,
        count: 0,
        data: null,
        timestamp: Date.now()
      };
      return;
    }

    logger.info(`POST parser API request: ${url}`);
    
    // 解析分享链接
    const result = await parserManager.parseByUrl(url, password);
    
    // 构建返回数据
    const responseData = {
      shareKey: `${result.panType}:${result.shareId}`,
      directLink: result.downloadUrl,
      cacheHit: result.cacheHit,
      expires: result.expires,
      expiration: result.cacheExpiration,
      fileInfo: {
        fileName: result.fileName || result.fileInfo?.fileName || '未知文件',
        fileSize: result.fileSize || result.fileInfo?.fileSize || '未知',
        fileType: result.fileType || result.fileInfo?.fileType || '未知',
        uploadTime: result.uploadTime || result.fileInfo?.uploadTime || '',
        uploader: result.uploader || result.fileInfo?.uploader || '',
        description: result.description || result.fileInfo?.description || ''
      }
    };

    ctx.body = {
      code: 200,
      msg: 'success',
      success: true,
      count: 0,
      data: responseData,
      timestamp: Date.now()
    };

  } catch (error) {
    logger.error('POST parser API error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: error.message || '解析失败',
      success: false,
      count: 0,
      data: null,
      timestamp: Date.now()
    };
  }
});

/**
 * 直接下载接口 - 兼容Java版本
 * GET /api/d?url=xxx&pwd=xxx
 */
router.get('/d', async (ctx) => {
  try {
    const { url, pwd = '' } = ctx.query;
    
    if (!url) {
      ctx.status = 400;
      ctx.body = {
        code: 400,
        msg: '缺少必要参数: url',
        success: false,
        count: 0,
        data: null,
        timestamp: Date.now()
      };
      return;
    }

    logger.info(`Direct download API request: ${url}`);
    
    // 解析分享链接
    const result = await parserManager.parseByUrl(url, pwd);
    
    // 构建返回数据
    const responseData = {
      shareKey: `${result.panType}:${result.shareId}`,
      directLink: result.downloadUrl,
      cacheHit: result.cacheHit,
      expires: result.expires,
      expiration: result.cacheExpiration,
      fileInfo: {
        fileName: result.fileName || result.fileInfo?.fileName || '未知文件',
        fileSize: result.fileSize || result.fileInfo?.fileSize || '未知',
        fileType: result.fileType || result.fileInfo?.fileType || '未知',
        uploadTime: result.uploadTime || result.fileInfo?.uploadTime || '',
        uploader: result.uploader || result.fileInfo?.uploader || '',
        description: result.description || result.fileInfo?.description || ''
      }
    };

    ctx.body = {
      code: 200,
      msg: 'success',
      success: true,
      count: 0,
      data: responseData,
      timestamp: Date.now()
    };

  } catch (error) {
    logger.error('Direct download API error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: error.message || '解析失败',
      success: false,
      count: 0,
      data: null,
      timestamp: Date.now()
    };
  }
});

/**
 * JSON格式接口 - 兼容Java版本
 * GET /api/json?url=xxx&pwd=xxx
 */
router.get('/json', async (ctx) => {
  try {
    const { url, pwd = '' } = ctx.query;
    
    if (!url) {
      ctx.status = 400;
      ctx.body = {
        code: 400,
        msg: '缺少必要参数: url',
        success: false,
        count: 0,
        data: null,
        timestamp: Date.now()
      };
      return;
    }

    logger.info(`JSON format API request: ${url}`);
    
    // 解析分享链接
    const result = await parserManager.parseByUrl(url, pwd);
    
    // 构建返回数据
    const responseData = {
      shareKey: `${result.panType}:${result.shareId}`,
      directLink: result.downloadUrl,
      cacheHit: result.cacheHit,
      expires: result.expires,
      expiration: result.cacheExpiration,
      fileInfo: {
        fileName: result.fileName || result.fileInfo?.fileName || '未知文件',
        fileSize: result.fileSize || result.fileInfo?.fileSize || '未知',
        fileType: result.fileType || result.fileInfo?.fileType || '未知',
        uploadTime: result.uploadTime || result.fileInfo?.uploadTime || '',
        uploader: result.uploader || result.fileInfo?.uploader || '',
        description: result.description || result.fileInfo?.description || ''
      }
    };

    ctx.body = {
      code: 200,
      msg: 'success',
      success: true,
      count: 0,
      data: responseData,
      timestamp: Date.now()
    };

  } catch (error) {
    logger.error('JSON format API error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: error.message || '解析失败',
      success: false,
      count: 0,
      data: null,
      timestamp: Date.now()
    };
  }
});

module.exports = router; 