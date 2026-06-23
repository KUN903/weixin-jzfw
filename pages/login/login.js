// pages/login/login.js - 统一登录页（优化版）
const { request } = require('../../utils/request')
const app = getApp()

Page({
  data: {
    role: 'user',
    phone: '',
    password: '',
    loading: false
  },

  onLoad() {
    // 恢复上次角色记忆（不自动跳转，用户需主动点击登录）
    const savedRole = wx.getStorageSync('app_role') || 'user'
    this.setData({ role: savedRole })
  },

  // 切换角色
  onRoleChange(e) {
    const role = e.currentTarget.dataset.role
    this.setData({ role })
  },

  // ========== 客户：微信一键登录 ==========
  onWechatLogin() {
    if (this.data.loading) return
    this.setData({ loading: true })

    wx.login({
      success: (res) => {
        if (!res.code) {
          this.setData({ loading: false })
          wx.showToast({ title: '获取授权失败', icon: 'none' })
          return
        }
        wx.cloud.callFunction({
          name: 'userLogin',
          data: { code: res.code }
        }).then(result => {
          this.setData({ loading: false })
          if (result.result && result.result.data) {
            const user = result.result.data
            app.globalData.userInfo = user
            app.globalData.isLogin = true
            app.globalData.role = 'user'
            wx.setStorageSync('app_role', 'user')
            wx.setStorageSync('token', 'wx_' + Date.now())

            wx.showToast({ title: '登录成功', icon: 'success' })
            setTimeout(() => {
              wx.switchTab({ url: '/pages/index/index' })
            }, 800)
          } else {
            wx.showToast({ title: '登录失败，请重试', icon: 'none' })
          }
        }).catch(() => {
          this.setData({ loading: false })
          wx.showToast({ title: '网络异常，请重试', icon: 'none' })
        })
      },
      fail: () => {
        this.setData({ loading: false })
        wx.showToast({ title: '授权取消', icon: 'none' })
      }
    })
  },

  // ========== 师傅：手机号+密码 ==========
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },
  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onWorkerLogin() {
    const { phone, password, loading } = this.data
    if (loading) return

    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (!password || password.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    request({
      url: '/worker/login',
      method: 'POST',
      data: { phone, password }
    }).then(data => {
      const { token, workerId } = data
      // 持久存储
      wx.setStorageSync('token', token)
      wx.setStorageSync('workerId', workerId)
      wx.setStorageSync('app_role', 'worker')
      if (data.workerName) wx.setStorageSync('workerName', data.workerName)
      if (data.avatar) wx.setStorageSync('avatar', data.avatar)

      // 全局状态
      app.globalData.token = token
      app.globalData.workerId = workerId
      app.globalData.role = 'worker'

      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/today-orders/today-orders' })
      }, 800)
    }).catch(err => {
      this.setData({ loading: false })
      wx.showToast({ title: err.msg || '帐号或密码错误', icon: 'none' })
    })
  }
})
