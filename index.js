/**
 * 网盘直链解析服务 - 主入口
 * 支持本地和 Vercel Serverless 部署
 */

const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const path = require('path');
const fs = require('fs');
const config = require('./config/app-config');
const { requestLogger, errorLogger } = require('./utils/logger');
const apiRouter = require('./routes/api');
const aesUtils = require('./utils/aes-utils');

const app = new Koa();

// 健康检查路由
app.use(async (ctx, next) => {
  if (ctx.path === '/health') {
    ctx.body = { status: 'ok' };
    return;
  }
  await next();
});

// 错误日志中间件
app.use(errorLogger);

// 请求日志中间件
app.use(requestLogger);

// CORS中间件
app.use(cors(config.security?.cors || {}));

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

// 注册API路由
app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods());

// 兜底404
app.use(async ctx => {
  ctx.status = 404;
  ctx.body = {
    success: false,
    message: '接口不存在',
    path: ctx.path,
    method: ctx.method
  };
});

// 本地开发监听端口
if (require.main === module) {
  // 创建logs目录（本地开发用，Vercel无效）
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const port = process.env.PORT || config.server?.port || 3000;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`本地服务已启动: http://localhost:${port}`);
  });
}

// Vercel Serverless 入口
module.exports = app.callback();

aesUtils.initKeys(); 