// pages/order-detail/order-detail.js - 工单详情（师傅端）
const { request } = require('../../utils/request')

Page({
  data: {
    orderId: '',
    order: null,
    loading: true,
    statusText: '',
    statusClass: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ orderId: options.id })
      this.loadDetail()
    }
  },

  loadDetail() {
    this.setData({ loading: true })
    request({
      url: `/worker/orders/detail`,
      data: { orderId: this.data.orderId }
    }).then(data => {
      const order = data.order || data
      this.setData({
        order,
        loading: false,
        statusText: this.getStatusText(order.status),
        statusClass: this.getStatusClass(order.status)
      })
    }).catch(() => {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  getStatusText(s) {
    const m = { pending: '待接单', accepted: '已接单', doing: '服务中', done: '已完成', cancelled: '已取消' }
    return m[s] || s
  },

  getStatusClass(s) {
    const m = { pending: 'tag-pending', accepted: 'tag-accepted', doing: 'tag-doing', done: 'tag-done', cancelled: 'tag-cancel' }
    return m[s] || ''
  },

  // 接单
  onAccept() {
    wx.showModal({
      title: '确认接单',
      content: '接单后请按时上门服务',
      success: (res) => {
        if (res.confirm) {
          request({
            url: '/worker/orders/accept',
            method: 'POST',
            data: { orderId: this.data.orderId }
          }).then(() => {
            wx.showToast({ title: '接单成功', icon: 'success' })
            this.loadDetail()
          }).catch(err => {
            wx.showToast({ title: err.msg || '接单失败', icon: 'none' })
          })
        }
      }
    })
  },

  // 联系客户
  onContact() {
    const phone = this.data.order?.customer_phone
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone })
    }
  },

  // 完工上传
  onUploadProof() {
    const that = this
    wx.chooseImage({
      count: 1,
      success(res) {
        wx.showLoading({ title: '上传中...' })
        wx.uploadFile({
          url: (getApp().globalData.baseUrl || '') + '/worker/orders/complete',
          filePath: res.tempFilePaths[0],
          name: 'proof',
          header: {
            'Authorization': 'Bearer ' + wx.getStorageSync('token')
          },
          formData: {
            orderId: that.data.orderId,
            workerId: String(wx.getStorageSync('workerId'))
          },
          success() {
            wx.hideLoading()
            wx.showToast({ title: '完工提交成功', icon: 'success' })
            that.loadDetail()
          },
          fail() {
            wx.hideLoading()
            wx.showToast({ title: '上传失败', icon: 'none' })
          }
        })
      }
    })
  },

  // 查看凭证图片
  onPreviewProof() {
    const url = this.data.order?.proof_url
    if (url) {
      wx.previewImage({ urls: [url], current: url })
    }
  }
})
