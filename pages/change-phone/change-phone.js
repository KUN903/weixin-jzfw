// pages/change-phone/change-phone.js
const { request } = require('../../utils/request')

Page({
  data: {
    password: '',
    newPhone: ''
  },

  onPasswordInput(e) { this.setData({ password: e.detail.value }) },
  onPhoneInput(e) { this.setData({ newPhone: e.detail.value }) },

  onSubmit() {
    const { password, newPhone } = this.data

    if (!password) {
      wx.showToast({ title: '请输入当前密码以验证身份', icon: 'none' })
      return
    }
    if (!newPhone || newPhone.length !== 11) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    request({
      url: '/worker/changePhone',
      method: 'POST',
      data: { password, newPhone }
    }).then(() => {
      wx.showToast({ title: '手机号更换成功，请重新登录', icon: 'success' })
      setTimeout(() => {
        wx.clearStorageSync()
        getApp().globalData.token = null
        getApp().globalData.workerId = null
        wx.reLaunch({ url: '/pages/login/login' })
      }, 1200)
    }).catch(err => {
      wx.showToast({ title: err.msg || '更换失败', icon: 'none' })
    })
  }
})
