// pages/settings/settings.js - 设置页
Page({
  data: {
    notifyEnabled: true,
    version: '1.0.0'
  },

  onShow() {
    const notify = wx.getStorageSync('notifyEnabled')
    if (notify !== '') {
      this.setData({ notifyEnabled: notify !== false })
    }
  },

  // 通知开关
  onNotifySwitch(e) {
    const value = e.detail.value
    this.setData({ notifyEnabled: value })
    wx.setStorageSync('notifyEnabled', value)
    wx.showToast({ title: value ? '已开启消息通知' : '已关闭消息通知', icon: 'none' })
  },

  // 修改登录密码
  onChangePassword() {
    wx.navigateTo({ url: '/pages/change-password/change-password' })
  },

  // 更换绑定手机号
  onChangePhone() {
    wx.navigateTo({ url: '/pages/change-phone/change-phone' })
  },

  // 隐私权限设置
  onPrivacy() {
    wx.openSetting({
      fail() {
        wx.showToast({ title: '无法打开设置', icon: 'none' })
      }
    })
  },

  // 版本检测更新
  onCheckVersion() {
    const updateManager = wx.getUpdateManager()
    updateManager.onCheckForUpdate(res => {
      if (res.hasUpdate) {
        wx.showModal({
          title: '发现新版本',
          content: '检测到新版本，是否立即更新？',
          success(modalRes) {
            if (modalRes.confirm) {
              updateManager.onUpdateReady(() => {
                updateManager.applyUpdate()
              })
            }
          }
        })
      } else {
        wx.showToast({ title: '已是最新版本', icon: 'none' })
      }
    })
  },

  // 切换师傅账号
  onSwitchAccount() {
    wx.showModal({
      title: '切换账号',
      content: '切换后当前账号将退出登录，是否继续？',
      success: (res) => {
        if (res.confirm) {
          this.logout()
        }
      }
    })
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需要重新登录，是否继续？',
      success: (res) => {
        if (res.confirm) {
          this.logout()
        }
      }
    })
  },

  // 统一的退出/切换逻辑
  logout() {
    wx.clearStorageSync()
    const app = getApp()
    app.globalData.token = null
    app.globalData.workerId = null
    app.globalData.userInfo = null
    wx.reLaunch({ url: '/pages/login/login' })
  }
})
