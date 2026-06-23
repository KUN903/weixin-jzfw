// utils/request.js - 全局请求封装
const app = getApp()

/**
 * 统一请求方法
 * 功能：
 * 1. 自动拼接 baseUrl
 * 2. 自动在 header 携带 token
 * 3. 自动在 data 携带 workerId
 * 4. 响应拦截：token 失效自动清缓存并跳转登录页
 */
function request(config) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')
    const workerId = wx.getStorageSync('workerId')

    // 自动拼 workerId 到请求参数
    const data = { ...(config.data || {}), workerId }

    wx.request({
      url: (app.globalData.baseUrl || '') + config.url,
      method: config.method || 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? 'Bearer ' + token : '',
        ...(config.header || {})
      },
      data,
      timeout: config.timeout || 15000,
      success(res) {
        const { statusCode, data: resData } = res

        // HTTP 401 / 业务码 401 → token 失效
        if (statusCode === 401 || (resData && resData.code === 401)) {
          wx.clearStorageSync()
          app.globalData.token = null
          app.globalData.workerId = null
          app.globalData.userInfo = null
          wx.reLaunch({ url: '/pages/login/login' })
          reject({ code: 401, msg: '登录已失效，请重新登录' })
          return
        }

        // HTTP 200 + 业务成功
        if (statusCode === 200) {
          if (resData && resData.code === 0) {
            resolve(resData.data)
          } else {
            reject({ code: resData?.code || -1, msg: resData?.msg || '请求失败' })
          }
          return
        }

        reject({ code: statusCode, msg: '服务器异常' })
      },
      fail(err) {
        wx.showToast({ title: '网络异常，请检查网络', icon: 'none' })
        reject({ code: -1, msg: err.errMsg || '网络请求失败' })
      }
    })
  })
}

module.exports = { request }
