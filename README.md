# 网盘直链解析服务 - Node.js版本

基于Node.js和Koa框架的网盘直链解析服务，支持多种网盘的分享链接解析，可部署到Vercel等平台。API接口格式与Java版本netdisk-fast-download完全一致。

## 功能特性

- 🚀 **多网盘支持**: 支持蓝奏云、奶牛快传、123云盘等多种网盘
- ⚡ **高性能**: 基于Koa框架，响应速度快
- 💾 **智能缓存**: 内置缓存系统，减少重复解析
- 🔒 **安全可靠**: 完善的错误处理和日志记录
- 🌐 **Vercel部署**: 支持一键部署到Vercel平台
- 📊 **监控统计**: 提供详细的统计信息和健康检查
- 🔄 **API兼容**: 与Java版本netdisk-fast-download完全兼容

## 支持的网盘

| 网盘名称 | 类型标识 | 支持功能 | 单文件限制 |
|---------|---------|---------|-----------|
| 蓝奏云 | `lz` | 普通分享、加密分享 | 100M |
| 奶牛快传 | `cow` | 普通分享 | 无限制 |
| 123云盘 | `pan123` | 普通分享、加密分享 | 100G |

## 快速开始

### 本地开发

1. **克隆项目**
```bash
git clone <repository-url>
cd nfd-vercel-ai
```

2. **安装依赖**
```bash
npm install
```

3. **启动开发服务器**
```bash
npm run dev
```

4. **访问服务**
```
http://localhost:3000
```

### Vercel部署

1. **Fork项目**到你的GitHub账户

2. **导入到Vercel**
   - 登录 [Vercel](https://vercel.com)
   - 点击 "New Project"
   - 选择你的GitHub仓库
   - 点击 "Deploy"

3. **配置环境变量**（可选）
   - `NODE_ENV`: 环境模式（production/development）
   - `LOG_LEVEL`: 日志级别（debug/info/warn/error）

## API接口

### 基础接口

#### 服务信息
```http
GET /
```

#### 健康检查
```http
GET /health
```

#### 获取支持的网盘
```http
GET /supported
```

### 解析接口

#### 1. 解析并自动302跳转
```http
GET /parser?url=分享链接&pwd=xxx
```
或者
```http
GET /parser?url=UrlEncode(分享链接)&pwd=xxx
```

**参数说明:**
- `url`: 分享链接（支持URL编码）
- `pwd`: 密码（可选）

**示例:**
```bash
# 解析蓝奏云分享
curl "https://your-domain.vercel.app/parser?url=https://www.lanzoux.com/ia2cntg"

# 解析带密码的分享
curl "https://your-domain.vercel.app/parser?url=https://www.lanzoux.com/ia2cntg&pwd=123456"

# 使用URL编码
curl "https://your-domain.vercel.app/parser?url=https%3A%2F%2Fwww.lanzoux.com%2Fia2cntg&pwd=123456"
```

#### 2. 直接路径解析并跳转
```http
GET /d/网盘标识/分享key@分享密码
```

**参数说明:**
- `网盘标识`: 网盘类型（lz、cow、pan123等）
- `分享key`: 分享ID
- `分享密码`: 密码（可选，用@分隔）

**示例:**
```bash
# 解析蓝奏云分享
curl "https://your-domain.vercel.app/d/lz/ia2cntg"

# 解析带密码的分享
curl "https://your-domain.vercel.app/d/lz/ia2cntg@123456"
```

#### 3. 获取解析后的直链 - JSON格式
```http
GET /json/parser?url=分享链接&pwd=xxx
```

**示例:**
```bash
# 解析蓝奏云分享（JSON格式）
curl "https://your-domain.vercel.app/json/parser?url=https://www.lanzoux.com/ia2cntg"

# 解析带密码的分享（JSON格式）
curl "https://your-domain.vercel.app/json/parser?url=https://www.lanzoux.com/ia2cntg&pwd=123456"
```

#### 4. 直接路径获取JSON格式直链
```http
GET /json/网盘标识/分享key@分享密码
```

**示例:**
```bash
# 解析蓝奏云分享（JSON格式）
curl "https://your-domain.vercel.app/json/lz/ia2cntg"

# 解析带密码的分享（JSON格式）
curl "https://your-domain.vercel.app/json/lz/ia2cntg@123456"
```

### 管理接口

#### 获取统计信息
```http
GET /stats
```

#### 获取缓存统计
```http
GET /cache/stats
```

#### 清空缓存
```http
POST /cache/flush
```

#### 测试解析器
```http
POST /test/:panType
Content-Type: application/json

{
  "shareId": "ia2cntg",
  "password": "123456"
}
```

## 响应格式

### 302重定向响应
对于 `/parser` 和 `/d/` 接口，成功时直接重定向到下载链接。

### JSON格式响应
对于 `/json/parser` 和 `/json/` 接口，返回JSON格式的解析结果：

```json
{
  "panType": "lz",
  "shareId": "ia2cntg",
  "fileName": "example.zip",
  "fileSize": "50.2 MB",
  "downloadUrl": "https://download.example.com/file/xxx",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误信息"
}
```

## 与Java版本兼容性

本Node.js版本完全兼容Java版本netdisk-fast-download的API接口：

| 功能 | Java版本 | Node.js版本 | 兼容性 |
|------|----------|-------------|--------|
| 解析并跳转 | `/parser?url=分享链接&pwd=xxx` | `/parser?url=分享链接&pwd=xxx` | ✅ 完全兼容 |
| 直接路径跳转 | `/d/网盘标识/分享key@分享密码` | `/d/网盘标识/分享key@分享密码` | ✅ 完全兼容 |
| JSON格式解析 | `/json/parser?url=分享链接&pwd=xxx` | `/json/parser?url=分享链接&pwd=xxx` | ✅ 完全兼容 |
| JSON直接路径 | `/json/网盘标识/分享key@分享密码` | `/json/网盘标识/分享key@分享密码` | ✅ 完全兼容 |
| URL编码支持 | 支持UrlEncode | 支持encodeURIComponent | ✅ 完全兼容 |
| 响应格式 | 302重定向/JSON | 302重定向/JSON | ✅ 完全兼容 |

## 项目结构

```
nfd-vercel-ai/
├── config/                 # 配置文件
│   └── app-config.js      # 应用配置
├── parsers/               # 解析器模块
│   ├── lanzou-parser.js   # 蓝奏云解析器
│   ├── cow-parser.js      # 奶牛快传解析器
│   ├── pan123-parser.js   # 123云盘解析器
│   └── parser-manager.js  # 解析器管理器
├── routes/                # 路由模块
│   └── api.js            # API路由
├── utils/                 # 工具模块
│   ├── cache.js          # 缓存工具
│   ├── http-client.js    # HTTP客户端
│   └── logger.js         # 日志工具
├── test/                  # 测试文件
│   └── test.js           # API测试
├── logs/                  # 日志文件目录
├── index.js              # 主应用文件
├── package.json          # 项目配置
├── vercel.json           # Vercel配置
├── README.md             # 项目文档
└── DEPLOYMENT.md         # 部署指南
```

## 配置说明

### 缓存配置
```javascript
cache: {
  defaultTTL: 3600,        // 默认缓存时间（秒）
  lanzouTTL: 1800,         // 蓝奏云缓存时间
  cowTTL: 3600,           // 奶牛快传缓存时间
  pan123TTL: 7200,        // 123云盘缓存时间
  // ... 其他网盘缓存时间
}
```

### 请求配置
```javascript
request: {
  timeout: 10000,          // 请求超时时间（毫秒）
  retries: 3,              // 重试次数
  userAgent: '...'         // 用户代理
}
```

## 开发指南

### 添加新的网盘解析器

1. **创建解析器文件**
```javascript
// parsers/new-parser.js
class NewParser {
  constructor() {
    this.panType = 'new';
  }
  
  async parse(shareId, password = '') {
    // 实现解析逻辑
  }
  
  validateUrl(url) {
    // 实现URL验证
  }
}

module.exports = NewParser;
```

2. **注册到解析器管理器**
```javascript
// parsers/parser-manager.js
const NewParser = require('./new-parser');

this.parsers = {
  // ... 现有解析器
  'new': new NewParser()
};
```

3. **添加配置**
```javascript
// config/app-config.js
netdisk: {
  new: {
    baseUrl: 'https://example.com',
    apiUrl: 'https://example.com/api',
    headers: { /* ... */ }
  }
}
```

### 测试

```bash
# 运行测试
npm test

# 测试特定解析器
curl -X POST "http://localhost:3000/test/lz" \
  -H "Content-Type: application/json" \
  -d '{"shareId": "ia2cntg"}'
```

## 部署说明

### Vercel部署

项目已配置好Vercel部署，包含：
- `vercel.json`: Vercel配置文件
- 无状态设计，适合Serverless环境
- 自动环境变量配置

### 其他平台部署

1. **传统服务器**
```bash
npm install --production
npm start
```

2. **Docker部署**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 监控和维护

### 日志查看
```bash
# 查看应用日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log
```

### 性能监控
- 访问 `/stats` 查看系统状态
- 访问 `/cache/stats` 查看缓存状态
- 访问 `/health` 进行健康检查

## 常见问题

### Q: 解析失败怎么办？
A: 检查以下几点：
1. 分享链接是否有效
2. 密码是否正确
3. 网盘服务是否正常
4. 查看日志获取详细错误信息

### Q: 如何提高解析成功率？
A: 
1. 确保网络连接稳定
2. 适当调整请求超时时间
3. 使用代理服务（如需要）
4. 定期更新解析器逻辑

### Q: 缓存不生效？
A: 
1. 检查缓存配置是否正确
2. 确认缓存键生成逻辑
3. 查看缓存统计信息

### Q: 与Java版本有什么区别？
A: 
1. 部署方式更简单（支持Vercel一键部署）
2. 启动速度更快
3. 内存占用更少
4. API接口完全兼容

### Q: 支持URL编码吗？
A: 
是的，完全支持URL编码。可以使用原始URL或编码后的URL：
- 原始：`/parser?url=https://www.lanzoux.com/ia2cntg`
- 编码：`/parser?url=https%3A%2F%2Fwww.lanzoux.com%2Fia2cntg`

## 贡献指南

欢迎提交Issue和Pull Request！

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

## 许可证

MIT License

## 免责声明

- 本项目仅供学习和研究使用
- 请遵守相关网盘服务的使用条款
- 开发者不对使用本项目造成的任何后果负责

## 更新日志

### v1.0.0
- 初始版本发布
- 支持蓝奏云、奶牛快传、123云盘
- 基础缓存和日志功能
- Vercel部署支持
- 与Java版本API完全兼容
- 支持所有Java版本的接口格式 