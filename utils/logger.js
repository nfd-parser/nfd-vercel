/**
 * 日志工具模块
 * 使用winston进行日志管理
 */

const winston = require('winston');
const path = require('path');

const transports = [
  new winston.transports.Console()
];

// 仅本地开发环境写文件
if (process.env.NODE_ENV !== 'production') {
  const logDir = path.join(__dirname, '../logs');
  // 创建 logs 目录（本地开发环境允许）
  try {
    require('fs').mkdirSync(logDir, { recursive: true });
  } catch (e) {}
  transports.push(
    new winston.transports.File({ filename: path.join(logDir, 'app.log') })
  );
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports
});

// 兼容 Koa 中间件
const requestLogger = async (ctx, next) => {
  logger.info(`[${ctx.method}] ${ctx.url}`);
  await next();
};

const errorLogger = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    logger.error(err);
    ctx.status = err.status || 500;
    ctx.body = { success: false, message: err.message };
  }
};

module.exports = {
  logger,
  requestLogger,
  errorLogger
}; 