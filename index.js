/**
 * 网盘直链解析服务 - 主应用文件
 * 基于Koa框架，支持Vercel部署
 */

const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('koa-cors');
const path = require('path');
const fs = require('fs');

// 导入配置和工具
const config = require('./config/app-config');
const { logger, requestLogger, errorLogger } = require('./utils/logger');
const { getStats } = require('./utils/cache');

// 导入路由
const apiRouter = require('./routes/api');

// 创建Koa应用
const app = new Koa();

/**
 * 创建logs目录
 */
const createLogsDir = () => {
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
};

/**
 * 初始化应用
 */
const initializeApp = () => {
  // 创建必要的目录
  createLogsDir();
  
  logger.info('应用初始化完成');
  logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`端口: ${config.server.port}`);
};

/**
 * 设置中间件
 */
const setupMiddleware = () => {
  // 错误处理中间件
  app.use(errorLogger);
  
  // 请求日志中间件
  app.use(requestLogger);
  
  // CORS中间件
  app.use(cors(config.security.cors));
  
  // 请求体解析中间件
  app.use(bodyParser({
    enableTypes: ['json', 'form', 'text'],
    jsonLimit: '10mb',
    formLimit: '10mb',
    textLimit: '10mb'
  }));
  
  // 响应时间中间件
  app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    ctx.set('X-Response-Time', `${ms}ms`);
  });
  
  // 安全头中间件
  app.use(async (ctx, next) => {
    ctx.set('X-Content-Type-Options', 'nosniff');
    ctx.set('X-Frame-Options', 'DENY');
    ctx.set('X-XSS-Protection', '1; mode=block');
    await next();
  });
};

/**
 * 设置路由
 */
const setupRoutes = () => {
  // 使用API路由
  app.use(apiRouter.routes());
  app.use(apiRouter.allowedMethods());
  
  // 404处理
  app.use(async (ctx) => {
    ctx.status = 404;
    ctx.body = {
      success: false,
      message: '接口不存在',
      path: ctx.path,
      method: ctx.method
    };
  });
};

/**
 * 启动服务器
 */
const startServer = () => {
  const port = config.server.port;
  const host = config.server.host;
  
  app.listen(port, host, () => {
    logger.info(`服务器启动成功`);
    logger.info(`监听地址: http://${host}:${port}`);
    logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
  });
};

/**
 * 优雅关闭
 */
const gracefulShutdown = () => {
  logger.info('收到关闭信号，正在优雅关闭...');
  
  process.exit(0);
};

// 主函数
const main = () => {
  try {
    // 初始化应用
    initializeApp();
    
    // 设置中间件
    setupMiddleware();
    
    // 设置路由
    setupRoutes();
    
    // 启动服务器
    startServer();
    
    // 注册关闭信号处理
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝:', reason);
      process.exit(1);
    });
    
  } catch (error) {
    logger.error('应用启动失败:', error);
    process.exit(1);
  }
};

// 如果是直接运行此文件，则启动应用
if (require.main === module) {
  main();
}

// 导出app实例，供Vercel使用
module.exports = app; 