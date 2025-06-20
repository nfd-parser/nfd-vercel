const fs = require('fs');
const path = require('path');
const { VM } = require('vm2');

/**
 * 执行指定 JS 文件中的函数
 * @param {string} filePath JS文件路径（绝对或相对）
 * @param {string} funcName 要执行的函数名
 * @param  {...any} args   传递给函数的参数
 * @returns {*} 执行结果
 */
function execJsFunc(filePath, funcName, ...args) {
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', filePath);
  const code = fs.readFileSync(absPath, 'utf-8');
  const vm = new VM({ sandbox: {} });
  vm.run(code);
  if (typeof vm._context[funcName] !== 'function') {
    throw new Error(`函数 ${funcName} 未定义`);
  }
  return vm._context[funcName](...args);
}

module.exports = { execJsFunc }; 