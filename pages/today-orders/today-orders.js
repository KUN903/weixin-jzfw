// pages/today-orders/today-orders.js - 今日工单
const { request } = require('../../utils/request')

Page({
  data: {
    orders: [],
    loading: false,
    hasNewOrder: false,
    pendingCount: 0,
    doingCount: 0
  },

  onShow() {
    this.loadTodayOrders()
  },

  onPullDownRefresh() {
    this.loadTodayOrders().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载今日工单
  loadTodayOrders() {
    this.setData({ loading: true })
    return request({
      url: '/worker/orders/today'
    }).then(data => {
      const orders = (data.orders || data || []).map(order => ({
        ...order,
        statusText: this.getStatusText(order.status),
        statusClass: this.getStatusClass(order.status),
        timeText: order.appointment_time || order.create_time || '',
        addressShort: order.address ? order.address.substring(0, 20) + (order.address.length > 20 ? '...' : '') : ''
      }))
      const pendingCount = orders.filter(o => o.status === 'pending').length
      const doingCount = orders.filter(o => o.status === 'doing').length
      this.setData({ orders, loading: false, pendingCount, doingCount })

      // 统计待接单数量 → tab 红点
      if (pendingCount > 0) {
        wx.setTabBarBadge({ index: 0, text: String(pendingCount) })
      } else {
        wx.removeTabBarBadge({ index: 0 })
      }
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  // 状态文本映射
  getStatusText(status) {
    const map = {
      pending: '待接单',
      accepted: '已接单',
      doing: '服务中',
      done: '已完成',
      cancelled: '已取消'
    }
    return map[status] || status
  },

  // 状态样式类映射
  getStatusClass(status) {
    const map = {
      pending: 'tag-pending',
      accepted: 'tag-accepted',
      doing: 'tag-doing',
      done: 'tag-done',
      cancelled: 'tag-cancel'
    }
    return map[status] || ''
  },

  // 查看订单详情
  onOrderTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` })
  },

  // 接单
  onAccept(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认接单',
      content: '接单后请按时上门服务',
      success: (res) => {
        if (res.confirm) {
          request({
            url: '/worker/orders/accept',
            method: 'POST',
            data: { orderId: id }
          }).then(() => {
            wx.showToast({ title: '接单成功', icon: 'success' })
            this.loadTodayOrders()
          }).catch(err => {
            wx.showToast({ title: err.msg || '接单失败', icon: 'none' })
          })
        }
      }
    })
  },

  // 联系客户
  onContact(e) {
    const { phone } = e.currentTarget.dataset
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone })
    } else {
      wx.showToast({ title: '暂无客户联系方式', icon: 'none' })
    }
  },

  // 完工上传凭证
  onUploadProof(e) {
    const { id } = e.currentTarget.dataset
    wx.chooseImage({
      count: 1,
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        wx.showLoading({ title: '上传中...' })
        // 上传图片
        wx.uploadFile({
          url: (getApp().globalData.baseUrl || '') + '/worker/orders/complete',
          filePath: tempFilePath,
          name: 'proof',
          header: {
            'Authorization': 'Bearer ' + wx.getStorageSync('token')
          },
          formData: {
            orderId: String(id),
            workerId: String(wx.getStorageSync('workerId'))
          },
          success: () => {
            wx.hideLoading()
            wx.showToast({ title: '完工提交成功', icon: 'success' })
            this.loadTodayOrders()
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '上传失败', icon: 'none' })
          }
        })
      }
    })
  },

  // 跳转全部工单
  onAllOrders() {
    wx.navigateTo({ url: '/pages/all-orders/all-orders' })
  }
})
