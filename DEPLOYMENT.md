# 部署指南

本文档详细说明如何将网盘直链解析服务部署到不同平台。

## Vercel部署（推荐）

### 1. 准备工作

1. **Fork项目**
   - 访问项目GitHub页面
   - 点击右上角的"Fork"按钮
   - 将项目Fork到你的GitHub账户

2. **注册Vercel账户**
   - 访问 [Vercel官网](https://vercel.com)
   - 使用GitHub账户注册

### 2. 部署步骤

1. **导入项目**
   - 登录Vercel控制台
   - 点击"New Project"
   - 选择你Fork的GitHub仓库
   - 点击"Import"

2. **配置项目**
   - Project Name: 设置项目名称（可选）
   - Framework Preset: 选择"Node.js"
   - Root Directory: 保持默认（./）
   - Build Command: `npm run build`
   - Output Directory: 保持默认
   - Install Command: `npm install`

3. **环境变量配置**（可选）
   ```
   NODE_ENV=production
   LOG_LEVEL=info
   ```

4. **部署**
   - 点击"Deploy"按钮
   - 等待部署完成

### 3. 自定义域名（可选）

1. **添加域名**
   - 在项目设置中找到"Domains"
   - 点击"Add Domain"
   - 输入你的域名

2. **配置DNS**
   - 按照Vercel提供的DNS记录配置你的域名
   - 等待DNS生效

### 4. 验证部署

访问以下URL验证部署是否成功：

```bash
# 健康检查
curl https://your-domain.vercel.app/api/health

# 获取支持的网盘
curl https://your-domain.vercel.app/api/supported

# 测试解析（需要有效的分享链接）
curl "https://your-domain.vercel.app/api/parse/lz/ia2cntg"
```

## 传统服务器部署

### 1. 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- 操作系统: Linux/Windows/macOS

### 2. 部署步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/nfd-vercel-ai.git
cd nfd-vercel-ai
```

2. **安装依赖**
```bash
npm install --production
```

3. **配置环境变量**
```bash
export NODE_ENV=production
export LOG_LEVEL=info
```

4. **启动服务**
```bash
npm start
```

### 3. 使用PM2管理进程

1. **安装PM2**
```bash
npm install -g pm2
```

2. **创建PM2配置文件**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'nfd-vercel-ai',
    script: 'index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

3. **启动服务**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. 使用Nginx反向代理

1. **安装Nginx**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

2. **配置Nginx**
```nginx
# /etc/nginx/sites-available/nfd-vercel-ai
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **启用配置**
```bash
sudo ln -s /etc/nginx/sites-available/nfd-vercel-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Docker部署

### 1. 创建Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 创建日志目录
RUN mkdir -p logs

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["npm", "start"]
```

### 2. 构建镜像

```bash
docker build -t nfd-vercel-ai .
```

### 3. 运行容器

```bash
docker run -d \
  --name nfd-vercel-ai \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  -v $(pwd)/logs:/app/logs \
  nfd-vercel-ai
```

### 4. 使用Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  nfd-vercel-ai:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
```

运行：
```bash
docker-compose up -d
```

## 云平台部署

### 1. 阿里云函数计算

1. **创建函数**
   - 登录阿里云函数计算控制台
   - 创建服务
   - 创建函数，选择Node.js运行时

2. **上传代码**
   - 将项目代码打包为ZIP文件
   - 上传到函数计算

3. **配置触发器**
   - 配置HTTP触发器
   - 设置访问域名

### 2. 腾讯云云函数

1. **创建函数**
   - 登录腾讯云云函数控制台
   - 创建函数，选择Node.js运行时

2. **上传代码**
   - 将项目代码打包上传

3. **配置触发器**
   - 配置API网关触发器

### 3. AWS Lambda

1. **创建函数**
   - 登录AWS Lambda控制台
   - 创建函数，选择Node.js运行时

2. **上传代码**
   - 将项目代码打包上传

3. **配置API Gateway**
   - 创建REST API
   - 配置路由和集成

## 监控和维护

### 1. 日志监控

```bash
# 查看应用日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log

# 使用PM2查看日志
pm2 logs nfd-vercel-ai
```

### 2. 性能监控

```bash
# 查看系统状态
curl http://localhost:3000/api/stats

# 查看缓存状态
curl http://localhost:3000/api/cache/stats

# 健康检查
curl http://localhost:3000/api/health
```

### 3. 自动重启

```bash
# 使用PM2自动重启
pm2 start ecosystem.config.js --watch

# 使用Docker自动重启
docker run --restart=unless-stopped ...
```

## 故障排除

### 1. 常见问题

**Q: 服务无法启动**
A: 检查以下几点：
- Node.js版本是否符合要求
- 端口是否被占用
- 环境变量是否正确设置

**Q: 解析失败**
A: 检查以下几点：
- 网络连接是否正常
- 网盘服务是否可用
- 分享链接是否有效

**Q: 性能问题**
A: 检查以下几点：
- 服务器资源是否充足
- 缓存是否正常工作
- 是否有大量并发请求

### 2. 调试技巧

```bash
# 开启调试模式
export LOG_LEVEL=debug
npm start

# 查看详细错误信息
curl -v http://localhost:3000/api/health

# 检查网络连接
curl -I https://www.lanzoux.com
```

### 3. 性能优化

1. **启用缓存**
   - 确保缓存配置正确
   - 定期清理过期缓存

2. **负载均衡**
   - 使用多个实例
   - 配置负载均衡器

3. **CDN加速**
   - 配置CDN服务
   - 缓存静态资源

## 安全考虑

### 1. 网络安全

- 使用HTTPS协议
- 配置防火墙规则
- 限制访问IP

### 2. 应用安全

- 定期更新依赖
- 配置CORS策略
- 限制请求频率

### 3. 数据安全

- 加密敏感数据
- 定期备份数据
- 监控异常访问

## 更新部署

### 1. 代码更新

```bash
# 拉取最新代码
git pull origin main

# 重新安装依赖
npm install

# 重启服务
pm2 restart nfd-vercel-ai
```

### 2. 配置更新

```bash
# 更新配置文件
vim config/app-config.js

# 重启服务
pm2 restart nfd-vercel-ai
```

### 3. 版本回滚

```bash
# 回滚到指定版本
git checkout <commit-hash>

# 重新部署
pm2 restart nfd-vercel-ai
```

## 联系支持

如果在部署过程中遇到问题，可以通过以下方式获取帮助：

- 提交GitHub Issue
- 查看项目文档
- 联系项目维护者 