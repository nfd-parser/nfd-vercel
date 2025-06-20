/**
 * 应用配置文件
 * 包含各种网盘解析的配置参数
 */

const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0'
  },

  // 缓存配置
  cache: {
    // 缓存时间（秒）
    defaultTTL: 3600, // 1小时
    // 蓝奏云缓存时间
    lanzouTTL: 1800, // 30分钟
    // 奶牛快传缓存时间
    cowTTL: 3600, // 1小时
    // 123云盘缓存时间
    pan123TTL: 7200, // 2小时
    // 移动云缓存时间
    mobileTTL: 3600, // 1小时
    // 小飞机盘缓存时间
    telegramTTL: 3600, // 1小时
    // 360亿方云缓存时间
    fang360TTL: 3600, // 1小时
    // 文叔叔缓存时间
    wenshushuTTL: 3600, // 1小时
    // 夸克网盘缓存时间
    quarkTTL: 3600, // 1小时
    // UC网盘缓存时间
    ucTTL: 3600 // 1小时
  },

  // 请求配置
  request: {
    timeout: 10000, // 10秒超时
    retries: 3, // 重试次数
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  },

  // 网盘配置
  netdisk: {
    // 蓝奏云配置
    lanzou: {
      baseUrl: 'https://www.lanzoux.com',
      apiUrl: 'https://www.lanzoux.com/ajaxm.php',
      headers: {
        'Referer': 'https://www.lanzoux.com/',
        'Origin': 'https://www.lanzoux.com'
      }
    },

    // 奶牛快传配置
    cow: {
      baseUrl: 'https://cowtransfer.com',
      apiUrl: 'https://cowtransfer.com/api/transfer/share',
      headers: {
        'Referer': 'https://cowtransfer.com/',
        'Origin': 'https://cowtransfer.com'
      }
    },

    // 123云盘配置
    pan123: {
      baseUrl: 'https://www.123pan.com',
      apiUrl: 'https://www.123pan.com/api/share/shareinfo',
      headers: {
        'Referer': 'https://www.123pan.com/',
        'Origin': 'https://www.123pan.com'
      }
    },

    // 移动云配置
    mobile: {
      baseUrl: 'https://caiyun.feixin.10086.cn',
      apiUrl: 'https://caiyun.feixin.10086.cn/api/share/shareinfo',
      headers: {
        'Referer': 'https://caiyun.feixin.10086.cn/',
        'Origin': 'https://caiyun.feixin.10086.cn'
      }
    },

    // 小飞机盘配置
    telegram: {
      baseUrl: 'https://pan.xunlei.com',
      apiUrl: 'https://pan.xunlei.com/api/share/shareinfo',
      headers: {
        'Referer': 'https://pan.xunlei.com/',
        'Origin': 'https://pan.xunlei.com'
      }
    },

    // 360亿方云配置
    fang360: {
      baseUrl: 'https://eyun.360.cn',
      apiUrl: 'https://eyun.360.cn/api/share/shareinfo',
      headers: {
        'Referer': 'https://eyun.360.cn/',
        'Origin': 'https://eyun.360.cn'
      }
    },

    // 文叔叔配置
    wenshushu: {
      baseUrl: 'https://www.wenshushu.cn',
      apiUrl: 'https://www.wenshushu.cn/api/share/shareinfo',
      headers: {
        'Referer': 'https://www.wenshushu.cn/',
        'Origin': 'https://www.wenshushu.cn'
      }
    },

    // 夸克网盘配置
    quark: {
      baseUrl: 'https://pan.quark.cn',
      apiUrl: 'https://pan.quark.cn/api/share/shareinfo',
      headers: {
        'Referer': 'https://pan.quark.cn/',
        'Origin': 'https://pan.quark.cn'
      }
    },

    // UC网盘配置
    uc: {
      baseUrl: 'https://drive.uc.cn',
      apiUrl: 'https://drive.uc.cn/api/share/shareinfo',
      headers: {
        'Referer': 'https://drive.uc.cn/',
        'Origin': 'https://drive.uc.cn'
      }
    }
  },

  // 代理配置（可选）
  proxy: {
    enabled: false,
    proxies: [
      // {
      //   panTypes: ['lz', 'cow'], // 支持的网盘类型
      //   type: 'http', // 代理类型：http/socks4/socks5
      //   host: '127.0.0.1',
      //   port: 7890,
      //   username: '',
      //   password: ''
      // }
    ]
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'combined'
  },

  // 安全配置
  security: {
    // 请求频率限制
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100 // 限制每个IP 15分钟内最多100个请求
    },
    // CORS配置
    cors: {
      origin: '*',
      credentials: true
    }
  }
};

module.exports = config; 