/**
 * 日志工具模块
 * 使用winston进行日志管理
 */

const winston = require('winston');
const config = require('../config/app-config');

// 创建日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 创建控制台格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

// 创建logger实例
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'nfd-vercel-ai' },
  transports: [
    // 错误日志文件
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // 所有日志文件
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// 如果不是生产环境，同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// 创建请求日志中间件
const requestLogger = async (ctx, next) => {
  const start = Date.now();
  
  try {
    await next();
    
    const ms = Date.now() - start;
    const logLevel = ctx.status >= 400 ? 'warn' : 'info';
    
    logger.log(logLevel, `${ctx.method} ${ctx.url} - ${ctx.status} - ${ms}ms`, {
      ip: ctx.ip,
      userAgent: ctx.get('User-Agent'),
      status: ctx.status,
      responseTime: ms
    });
  } catch (error) {
    const ms = Date.now() - start;
    
    logger.error(`${ctx.method} ${ctx.url} - Error - ${ms}ms`, {
      ip: ctx.ip,
      userAgent: ctx.get('User-Agent'),
      error: error.message,
      stack: error.stack,
      responseTime: ms
    });
    
    throw error;
  }
};

// 创建错误日志中间件
const errorLogger = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    logger.error('Unhandled error:', {
      error: error.message,
      stack: error.stack,
      url: ctx.url,
      method: ctx.method,
      ip: ctx.ip
    });
    
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : error.message,
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = {
  logger,
  requestLogger,
  errorLogger
}; 