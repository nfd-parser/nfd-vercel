/**
 * 文件工具模块
 * 提供文件大小规范化等通用功能
 */

const { logger } = require('./logger');

/**
 * 转换为北京时间
 * @param {Date|string|number} time 时间
 * @returns {string} 北京时间字符串
 */
function toBeijingTime(time) {
  try {
    let date;
    if (typeof time === 'string') {
      date = new Date(time);
    } else if (typeof time === 'number') {
      date = new Date(time);
    } else {
      date = time || new Date();
    }
    
    // 转换为北京时间 (UTC+8)
    const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    
    // 格式化为 YYYY-MM-DD HH:mm:ss
    const year = beijingTime.getUTCFullYear();
    const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getUTCDate()).padStart(2, '0');
    const hours = String(beijingTime.getUTCHours()).padStart(2, '0');
    const minutes = String(beijingTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(beijingTime.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    logger.error('Convert to Beijing time failed:', error);
    return new Date().toISOString();
  }
}

/**
 * 获取当前北京时间
 * @returns {string} 当前北京时间字符串
 */
function getCurrentBeijingTime() {
  return toBeijingTime(new Date());
}

/**
 * 规范化文件大小单位
 * 支持多种网盘的不同单位格式，统一为规范格式
 * @param {string} rawSize 原始文件大小字符串
 * @returns {string} 规范化的文件大小
 */
function normalizeFileSize(rawSize) {
  try {
    if (!rawSize || typeof rawSize !== 'string') {
      return '未知';
    }

    // 移除所有空格和HTML标签
    let size = rawSize.replace(/<[^>]*>/g, '').trim();
    
    // 定义单位映射规则
    const unitMappings = {
      // 字节单位
      'B': 'B',
      'Byte': 'B',
      'Bytes': 'B',
      
      // 千字节单位
      'KB': 'KB',
      'K': 'KB',
      'kb': 'KB',
      'Kb': 'KB',
      'KIB': 'KB',
      'KiB': 'KB',
      
      // 兆字节单位
      'MB': 'MB',
      'M': 'MB',
      'mb': 'MB',
      'Mb': 'MB',
      'MIB': 'MB',
      'MiB': 'MB',
      
      // 吉字节单位
      'GB': 'GB',
      'G': 'GB',
      'gb': 'GB',
      'Gb': 'GB',
      'GIB': 'GB',
      'GiB': 'GB',
      
      // 太字节单位
      'TB': 'TB',
      'T': 'TB',
      'tb': 'TB',
      'Tb': 'TB',
      'TIB': 'TB',
      'TiB': 'TB'
    };

    // 匹配数字和单位
    const sizeMatch = size.match(/^([\d.]+)\s*([A-Za-z]+)?$/);
    if (!sizeMatch) {
      return size; // 如果无法解析，返回原始值
    }

    const number = parseFloat(sizeMatch[1]);
    const originalUnit = sizeMatch[2] || '';

    if (isNaN(number)) {
      return size;
    }

    // 查找规范化的单位
    let normalizedUnit;
    if (originalUnit) {
      normalizedUnit = unitMappings[originalUnit.toUpperCase()] || originalUnit.toUpperCase();
    } else {
      // 如果没有单位，根据数值大小推断单位
      if (number >= 1024 * 1024 * 1024) {
        normalizedUnit = 'GB';
      } else if (number >= 1024 * 1024) {
        normalizedUnit = 'MB';
      } else if (number >= 1024) {
        normalizedUnit = 'KB';
      } else {
        normalizedUnit = 'B';
      }
    }
    
    // 格式化数字，保留适当的小数位
    let formattedNumber;
    if (number >= 1000) {
      formattedNumber = Math.round(number);
    } else if (number >= 100) {
      formattedNumber = Math.round(number * 10) / 10;
    } else {
      formattedNumber = Math.round(number * 100) / 100;
    }

    return `${formattedNumber} ${normalizedUnit}`;
  } catch (error) {
    logger.error('Normalize file size failed:', error);
    return rawSize || '未知';
  }
}

/**
 * 提取文件扩展名
 * @param {string} fileName 文件名
 * @returns {string} 文件扩展名（不含点号）
 */
function getFileExtension(fileName) {
  try {
    if (!fileName || typeof fileName !== 'string') {
      return '';
    }
    
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
      return '';
    }
    
    return fileName.substring(lastDotIndex + 1).toLowerCase();
  } catch (error) {
    logger.error('Get file extension failed:', error);
    return '';
  }
}

/**
 * 根据文件扩展名判断文件类型
 * @param {string} fileName 文件名
 * @returns {string} 文件类型描述
 */
function getFileType(fileName) {
  try {
    const ext = getFileExtension(fileName);
    
    const typeMappings = {
      // 图片文件
      'jpg': '图片文件',
      'jpeg': '图片文件',
      'png': '图片文件',
      'gif': '图片文件',
      'bmp': '图片文件',
      'webp': '图片文件',
      'svg': '图片文件',
      
      // 视频文件
      'mp4': '视频文件',
      'avi': '视频文件',
      'mkv': '视频文件',
      'mov': '视频文件',
      'wmv': '视频文件',
      'flv': '视频文件',
      'webm': '视频文件',
      
      // 音频文件
      'mp3': '音频文件',
      'wav': '音频文件',
      'flac': '音频文件',
      'aac': '音频文件',
      'ogg': '音频文件',
      
      // 文档文件
      'pdf': 'PDF文档',
      'doc': 'Word文档',
      'docx': 'Word文档',
      'xls': 'Excel表格',
      'xlsx': 'Excel表格',
      'ppt': 'PowerPoint演示',
      'pptx': 'PowerPoint演示',
      'txt': '文本文件',
      
      // 压缩文件
      'zip': '压缩文件',
      'rar': '压缩文件',
      '7z': '压缩文件',
      'tar': '压缩文件',
      'gz': '压缩文件',
      
      // 程序文件
      'exe': '可执行文件',
      'msi': '安装程序',
      'apk': 'Android应用',
      'ipa': 'iOS应用',
      
      // 其他常见文件
      'iso': '镜像文件',
      'dmg': '磁盘镜像',
      'deb': 'Debian包',
      'rpm': 'RPM包'
    };
    
    return typeMappings[ext] || '未知文件';
  } catch (error) {
    logger.error('Get file type failed:', error);
    return '未知文件';
  }
}

module.exports = {
  normalizeFileSize,
  getFileExtension,
  getFileType,
  toBeijingTime,
  getCurrentBeijingTime
}; 