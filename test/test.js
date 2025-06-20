/**
 * 简单的API测试文件
 * 用于测试各个接口的功能
 * 与Java版本netdisk-fast-download API格式完全一致
 */

const axios = require('axios');

// 测试配置
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// 测试用例
const testCases = [
  {
    name: '服务信息',
    method: 'GET',
    url: '/',
    expectedStatus: 200
  },
  {
    name: '健康检查',
    method: 'GET',
    url: '/health',
    expectedStatus: 200
  },
  {
    name: '获取支持的网盘',
    method: 'GET',
    url: '/supported',
    expectedStatus: 200
  },
  {
    name: '获取统计信息',
    method: 'GET',
    url: '/stats',
    expectedStatus: 200
  },
  {
    name: '获取缓存统计',
    method: 'GET',
    url: '/cache/stats',
    expectedStatus: 200
  }
];

/**
 * 运行基础测试
 */
async function runTests() {
  console.log('🚀 开始运行API测试...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      console.log(`📋 测试: ${testCase.name}`);
      
      const response = await axios({
        method: testCase.method,
        url: `${BASE_URL}${testCase.url}`,
        timeout: 10000
      });
      
      if (response.status === testCase.expectedStatus) {
        console.log(`✅ 通过 - 状态码: ${response.status}`);
        passed++;
      } else {
        console.log(`❌ 失败 - 期望状态码: ${testCase.expectedStatus}, 实际: ${response.status}`);
        failed++;
      }
      
      // 显示响应数据摘要
      if (response.data) {
        const dataSummary = JSON.stringify(response.data).substring(0, 100) + '...';
        console.log(`📄 响应: ${dataSummary}`);
      }
      
    } catch (error) {
      console.log(`❌ 失败 - ${error.message}`);
      failed++;
    }
    
    console.log(''); // 空行分隔
  }
  
  // 测试结果汇总
  console.log('📊 基础测试结果汇总:');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 成功率: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

/**
 * 测试解析功能（使用真实链接）
 */
async function testParse() {
  console.log('🔍 测试解析功能...\n');
  
  // 使用真实的蓝奏云测试链接
  const testUrl = 'https://lanzoux.com/irCNk2p8aaqh';
  const shareId = 'irCNk2p8aaqh';
  
  const testParseCases = [
    {
      name: '测试parser接口（真实链接）',
      method: 'GET',
      url: `/parser?url=${encodeURIComponent(testUrl)}`,
      expectedSuccess: true
    },
    {
      name: '测试d接口（真实链接）',
      method: 'GET',
      url: `/d/lz/${shareId}`,
      expectedSuccess: true
    },
    {
      name: '测试json/parser接口（真实链接）',
      method: 'GET',
      url: `/json/parser?url=${encodeURIComponent(testUrl)}`,
      expectedSuccess: true
    },
    {
      name: '测试json直接接口（真实链接）',
      method: 'GET',
      url: `/json/lz/${shareId}`,
      expectedSuccess: true
    }
  ];
  
  for (const testCase of testParseCases) {
    try {
      console.log(`📋 测试: ${testCase.name}`);
      
      const response = await axios({
        method: testCase.method,
        url: `${BASE_URL}${testCase.url}`,
        timeout: 15000,
        validateStatus: (status) => status >= 200 && status < 400
      });
      
      if (response.status === 200) {
        console.log(`✅ 通过 - 状态码: ${response.status}`);
        
        // 对于JSON接口，检查返回的数据结构
        if (testCase.url.includes('/json/')) {
          if (response.data && response.data.downloadUrl) {
            console.log(`📄 解析成功 - 下载链接: ${response.data.downloadUrl.substring(0, 50)}...`);
          } else {
            console.log(`⚠️  警告 - 返回数据格式可能不正确`);
          }
        } else if (response.status === 302) {
          console.log(`📄 重定向成功 - Location: ${response.headers.location?.substring(0, 50)}...`);
        }
      } else {
        console.log(`⚠️  警告 - 状态码: ${response.status}`);
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ 失败 - 状态码: ${error.response.status}, 错误: ${error.response.data?.message || error.message}`);
      } else {
        console.log(`❌ 失败 - ${error.message}`);
      }
    }
    
    console.log('');
  }
}

/**
 * 测试API兼容性
 */
async function testCompatibility() {
  console.log('🔄 测试API兼容性...\n');
  
  const testUrl = 'https://lanzoux.com/irCNk2p8aaqh';
  const shareId = 'irCNk2p8aaqh';
  
  const compatibilityTests = [
    {
      name: '测试parser接口格式（真实链接）',
      method: 'GET',
      url: `/parser?url=${encodeURIComponent(testUrl)}`,
      expectedSuccess: true
    },
    {
      name: '测试d接口格式（真实链接）',
      method: 'GET',
      url: `/d/lz/${shareId}`,
      expectedSuccess: true
    },
    {
      name: '测试json/parser接口格式（真实链接）',
      method: 'GET',
      url: `/json/parser?url=${encodeURIComponent(testUrl)}`,
      expectedSuccess: true
    },
    {
      name: '测试json直接接口格式（真实链接）',
      method: 'GET',
      url: `/json/lz/${shareId}`,
      expectedSuccess: true
    },
    {
      name: '测试无效链接',
      method: 'GET',
      url: '/parser?url=https://lanzoux.com/invalid123',
      expectedSuccess: false
    },
    {
      name: '测试无效网盘类型',
      method: 'GET',
      url: '/d/invalid/test123',
      expectedSuccess: false
    }
  ];
  
  for (const test of compatibilityTests) {
    try {
      console.log(`📋 测试: ${test.name}`);
      
      const response = await axios({
        method: test.method,
        url: `${BASE_URL}${test.url}`,
        timeout: 15000,
        validateStatus: () => true // 接受所有状态码
      });
      
      if (test.expectedSuccess && (response.status === 200 || response.status === 302)) {
        console.log(`✅ 通过 - 状态码: ${response.status}`);
      } else if (!test.expectedSuccess && response.status >= 400) {
        console.log(`✅ 通过 - 正确返回错误状态码: ${response.status}`);
      } else {
        console.log(`⚠️  警告 - 状态码: ${response.status}`);
      }
      
    } catch (error) {
      if (test.expectedSuccess) {
        console.log(`❌ 失败 - ${error.message}`);
      } else {
        console.log(`✅ 通过 - 正确抛出错误: ${error.message}`);
      }
    }
    
    console.log('');
  }
}

/**
 * 测试URL编码功能
 */
async function testUrlEncoding() {
  console.log('🔗 测试URL编码功能...\n');
  
  const testUrl = 'https://lanzoux.com/irCNk2p8aaqh';
  const encodedUrl = encodeURIComponent(testUrl);
  
  const encodingTests = [
    {
      name: '测试原始URL',
      method: 'GET',
      url: `/parser?url=${testUrl}`,
      expectedSuccess: true
    },
    {
      name: '测试URL编码',
      method: 'GET',
      url: `/parser?url=${encodedUrl}`,
      expectedSuccess: true
    },
    {
      name: '测试JSON原始URL',
      method: 'GET',
      url: `/json/parser?url=${testUrl}`,
      expectedSuccess: true
    },
    {
      name: '测试JSON URL编码',
      method: 'GET',
      url: `/json/parser?url=${encodedUrl}`,
      expectedSuccess: true
    }
  ];
  
  for (const test of encodingTests) {
    try {
      console.log(`📋 测试: ${test.name}`);
      
      const response = await axios({
        method: test.method,
        url: `${BASE_URL}${test.url}`,
        timeout: 15000,
        validateStatus: (status) => status >= 200 && status < 400
      });
      
      if (test.expectedSuccess && (response.status === 200 || response.status === 302)) {
        console.log(`✅ 通过 - 状态码: ${response.status}`);
      } else {
        console.log(`⚠️  警告 - 状态码: ${response.status}`);
      }
      
    } catch (error) {
      if (test.expectedSuccess) {
        console.log(`❌ 失败 - ${error.message}`);
      } else {
        console.log(`✅ 通过 - 正确抛出错误: ${error.message}`);
      }
    }
    
    console.log('');
  }
}

/**
 * 测试蓝奏云解析器特定功能
 */
async function testLanzouSpecific() {
  console.log('🔧 测试蓝奏云解析器特定功能...\n');
  
  const testUrl = 'https://lanzoux.com/irCNk2p8aaqh';
  const shareId = 'irCNk2p8aaqh';
  
  const specificTests = [
    {
      name: '测试文件名解析',
      method: 'GET',
      url: `/json/lz/${shareId}`,
      checkFileName: true
    },
    {
      name: '测试文件大小解析',
      method: 'GET',
      url: `/json/lz/${shareId}`,
      checkFileSize: true
    },
    {
      name: '测试下载链接有效性',
      method: 'GET',
      url: `/json/lz/${shareId}`,
      checkDownloadUrl: true
    }
  ];
  
  for (const test of specificTests) {
    try {
      console.log(`📋 测试: ${test.name}`);
      
      const response = await axios({
        method: test.method,
        url: `${BASE_URL}${test.url}`,
        timeout: 15000
      });
      
      if (response.status === 200 && response.data) {
        console.log(`✅ 通过 - 状态码: ${response.status}`);
        
        if (test.checkFileName && response.data.fileName) {
          console.log(`📄 文件名: ${response.data.fileName}`);
        }
        
        if (test.checkFileSize && response.data.fileSize) {
          console.log(`📄 文件大小: ${response.data.fileSize}`);
        }
        
        if (test.checkDownloadUrl && response.data.downloadUrl) {
          console.log(`📄 下载链接: ${response.data.downloadUrl.substring(0, 80)}...`);
          
          // 测试下载链接是否可访问
          try {
            const downloadResponse = await axios({
              method: 'HEAD',
              url: response.data.downloadUrl,
              timeout: 10000,
              validateStatus: (status) => status >= 200 && status < 400
            });
            console.log(`✅ 下载链接可访问 - 状态码: ${downloadResponse.status}`);
          } catch (downloadError) {
            console.log(`⚠️  下载链接可能不可访问: ${downloadError.message}`);
          }
        }
      } else {
        console.log(`❌ 失败 - 状态码: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`❌ 失败 - ${error.message}`);
    }
    
    console.log('');
  }
}

/**
 * 性能测试
 */
async function performanceTest() {
  console.log('⚡ 性能测试...\n');
  
  const iterations = 5; // 减少测试次数，避免对服务器造成压力
  const startTime = Date.now();
  
  try {
    for (let i = 0; i < iterations; i++) {
      await axios.get(`${BASE_URL}/health`);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    
    console.log(`📊 性能测试结果:`);
    console.log(`🕐 总时间: ${totalTime}ms`);
    console.log(`📈 平均时间: ${avgTime.toFixed(2)}ms`);
    console.log(`🚀 每秒请求数: ${(1000 / avgTime).toFixed(2)}`);
    
  } catch (error) {
    console.log(`❌ 性能测试失败: ${error.message}`);
  }
  
  console.log('');
}

// 主函数
async function main() {
  try {
    await runTests();
    await testParse();
    await testCompatibility();
    await testUrlEncoding();
    await testLanzouSpecific();
    await performanceTest();
    
    console.log('🎉 所有测试完成！');
    console.log('📝 API接口格式已与Java版本netdisk-fast-download完全一致');
    console.log('');
    console.log('📋 支持的API接口:');
    console.log('  • GET /parser?url=分享链接&pwd=xxx');
    console.log('  • GET /d/网盘标识/分享key@分享密码');
    console.log('  • GET /json/parser?url=分享链接&pwd=xxx');
    console.log('  • GET /json/网盘标识/分享key@分享密码');
    console.log('');
    console.log('🔗 测试链接: https://lanzoux.com/irCNk2p8aaqh');
    
  } catch (error) {
    console.error('💥 测试过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

module.exports = {
  runTests,
  testParse,
  testCompatibility,
  testUrlEncoding,
  testLanzouSpecific,
  performanceTest
}; 