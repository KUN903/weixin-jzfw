// utils/api.js - 云函数调用封装

/**
 * 调用云函数
 */
function callFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud) {
      reject(new Error('云开发未初始化'));
      return;
    }
    wx.cloud.callFunction({
      name,
      data
    }).then(res => {
      if (res.result && res.result.success !== false) {
        resolve(res.result);
      } else {
        reject(res.result || { message: '请求失败' });
      }
    }).catch(err => {
      console.error(`云函数[${name}]调用失败:`, err);
      reject(err);
    });
  });
}

/**
 * SQL 查询封装（通过云函数）
 */
function query(sql, params = []) {
  return callFunction('dbQuery', { sql, params });
}

/**
 * SQL 执行封装（通过云函数）
 */
function execute(sql, params = []) {
  return callFunction('dbExecute', { sql, params });
}

module.exports = {
  callFunction,
  query,
  execute
};
