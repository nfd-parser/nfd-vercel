/**
 * AES加解密工具类（Node版）
 * 兼容小飞机/蓝奏优享/123云盘等解析需求
 * 严格参考Java版AESUtils实现
 */

const crypto = require('crypto');

// 主要常量
const SIGN_AES = 'AES';
const CIPHER_AES = 'aes-128-ecb'; // Node用PKCS7Padding等价于PKCS5Padding
const KEY_LENGTH = 16;
const MG_KEY = '4ea5c508a6566e76240543f8feb06fd457777be39549c4016436afda65d2330e';
const kk = "AES/ECB/PKCS5Padding";

// 默认密钥（可根据实际情况补充）
const DEFAULT_KEY = Buffer.alloc(KEY_LENGTH, 0);

// 二次加密密钥（Base64密文）
const CIPHER_AES2 = 'YbQHZqK/PdQql2+7ATcPQHREAxt0Hn0Ob9v317QirZM=';
const CIPHER_AES2_IZ = '1uQFS3sNeHd/bCrmrQpflXREAxt0Hn0Ob9v317QirZM=';
const MG_PKEY2 = 'D8jg+H2iNX94zvHhRLnSM3oy59dH2QQjxQ0GgKJSL+mJclbCcItjV3AmkPY6WcbV4hNQk5+hN2J1eTrxPQqF4p28e3FTsGRCXVN80CLS+XqpFNY/9xuyf2bvbeq5JJU1IBCXgSZmEo8zu0/VGS3YNeDsHtjg92QSrRY8i4A+shihZBSz0/0KOL1VPd/K4tAYvsI9YjVFOI7z9mJJ8Ek8rVUplurJyGkjevRfvReN7xQ67PR+yZovk72yTZKlHDz5jVpLGLOy2iwTTSTbTvtnOi9TSE6sSPtRHv16cxZYZQY=';

// 运行时解密得到的密钥
let CIPHER_AES0 = null;
let CIPHER_AES0_IZ = null;
let MG_PKEY = null;

/**
 * 初始化二次加密密钥（需在服务启动时调用一次）
 */
function initKeys() {
  try {
    CIPHER_AES0 = decryptByBase64AES(CIPHER_AES2, kk);
    CIPHER_AES0_IZ = decryptByBase64AES(CIPHER_AES2_IZ, kk);
    // MG_PKEY = decryptByBase64AES(MG_PKEY2, kk);
  } catch (e) {
    throw new Error('AES密钥初始化失败: ' + e.message);
  }
}

// AES加密（返回Hex）
function encryptHexByAES(source, keyString = DEFAULT_KEY) {
  const key = typeof keyString === 'string' ? Buffer.from(keyString.padEnd(KEY_LENGTH, 'L').slice(0, KEY_LENGTH)) : keyString;
  const cipher = crypto.createCipheriv(CIPHER_AES, key, null);
  let encrypted = cipher.update(source, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted.toUpperCase();
}

// AES加密（返回Base64）
function encryptBase64ByAES(source, keyString = DEFAULT_KEY) {
  const key = typeof keyString === 'string' ? Buffer.from(keyString.padEnd(KEY_LENGTH, 'L').slice(0, KEY_LENGTH)) : keyString;
  const cipher = crypto.createCipheriv(CIPHER_AES, key, null);
  let encrypted = cipher.update(source, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

// AES解密（Hex密文）
function decryptByHexAES(encrypted, keyString = DEFAULT_KEY) {
  const key = typeof keyString === 'string' ? Buffer.from(keyString.padEnd(KEY_LENGTH, 'L').slice(0, KEY_LENGTH)) : keyString;
  const decipher = crypto.createDecipheriv(CIPHER_AES, key, null);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// AES解密（Base64密文）
function decryptByBase64AES(encrypted, keyString = DEFAULT_KEY) {
  const key = typeof keyString === 'string' ? Buffer.from(keyString.padEnd(KEY_LENGTH, 'L').slice(0, KEY_LENGTH)) : keyString;
  const decipher = crypto.createDecipheriv(CIPHER_AES, key, null);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// idEncrypt算法（小飞机/蓝奏优享）
const array = [
  'T', 'U', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
  '0', 'M', 'N', 'O', 'P', 'X', 'Y', 'Z', 'V', 'W',
  'Q', '1', '2', '3', '4', 'a', 'b', 'c', 'd', 'e',
  '5', '6', '7', '8', '9', 'v', 'w', 'x', 'y', 'z',
  'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
  'p', 'q', 'r', 's', 't', 'u', 'L', 'R', 'S', 'I',
  'J', 'K'
];
function decodeChar(c, keys) {
  return keys.indexOf(c);
}
function idEncrypt(str) {
  // 小飞机id解密
  let multiple = 1;
  let result = 0;
  if (str && str.length > 4) {
    str = str.substring(2, str.length - 2);
    for (let i = 0; i < str.length; i++) {
      const c = str.charAt(str.length - i - 1);
      result += decodeChar(c, array) * multiple;
      multiple = multiple * 62;
    }
  }
  return result;
}

/**
 * encrypt2Hex: 用CIPHER_AES0加密
 */
function encrypt2Hex(source) {
  if (!CIPHER_AES0) throw new Error('CIPHER_AES0未初始化');
  return encryptHexByAES(source, CIPHER_AES0);
}

/**
 * encrypt2HexIz: 用CIPHER_AES0_IZ加密
 */
function encrypt2HexIz(source) {
  if (!CIPHER_AES0_IZ) throw new Error('CIPHER_AES0_IZ未初始化');
  return encryptHexByAES(source, CIPHER_AES0_IZ);
}

module.exports = {
  SIGN_AES,
  CIPHER_AES,
  KEY_LENGTH,
  MG_KEY,
  CIPHER_AES2,
  CIPHER_AES2_IZ,
  MG_PKEY2,
  get CIPHER_AES0() { return CIPHER_AES0; },
  get CIPHER_AES0_IZ() { return CIPHER_AES0_IZ; },
  get MG_PKEY() { return MG_PKEY; },
  initKeys,
  encryptHexByAES,
  encryptBase64ByAES,
  decryptByHexAES,
  decryptByBase64AES,
  idEncrypt,
  encrypt2Hex,
  encrypt2HexIz
}; 