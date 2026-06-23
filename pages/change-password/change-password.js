// pages/change-password/change-password.js
const { request } = require('../../utils/request')

Page({
  data: {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  },

  onOldInput(e) { this.setData({ oldPassword: e.detail.value }) },
  onNewInput(e) { this.setData({ newPassword: e.detail.value }) },
  onConfirmInput(e) { this.setData({ confirmPassword: e.detail.value }) },

  onSubmit() {
    const { oldPassword, newPassword, confirmPassword } = this.data

    if (!oldPassword) {
      wx.showToast({ title: '请输入原密码', icon: 'none' })
      return
    }
    if (!newPassword || newPassword.length < 6) {
      wx.showToast({ title: '新密码至少6位', icon: 'none' })
      return
    }
    if (newPassword !== confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }
    if (oldPassword === newPassword) {
      wx.showToast({ title: '新密码不能与原密码相同', icon: 'none' })
      return
    }

    request({
      url: '/worker/changePassword',
      method: 'POST',
      data: { oldPassword, newPassword }
    }).then(() => {
      wx.showToast({ title: '密码修改成功，请重新登录', icon: 'success' })
      setTimeout(() => {
        wx.clearStorageSync()
        getApp().globalData.token = null
        getApp().globalData.workerId = null
        wx.reLaunch({ url: '/pages/login/login' })
      }, 1200)
    }).catch(err => {
      wx.showToast({ title: err.msg || '修改失败', icon: 'none' })
    })
  }
})
