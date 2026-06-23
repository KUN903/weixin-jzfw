// pages/all-orders/all-orders.js - 全部工单
const { request } = require('../../utils/request')

Page({
  data: {
    activeTab: 'all',
    tabs: [
      { key: 'all', name: '全部' },
      { key: 'pending', name: '待接单' },
      { key: 'accepted', name: '已接单' },
      { key: 'doing', name: '服务中' },
      { key: 'done', name: '已完成' },
      { key: 'cancelled', name: '已取消' }
    ],
    orders: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    startDate: '',
    endDate: ''
  },

  onLoad() {
    this.loadOrders()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, orders: [], hasMore: true })
    this.loadOrders().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  // Tab 切换
  onTabChange(e) {
    const { key } = e.currentTarget.dataset
    if (key === this.data.activeTab) return
    this.setData({ activeTab: key, page: 1, orders: [], hasMore: true })
    this.loadOrders()
  },

  // 日期筛选
  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value })
  },
  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value })
  },
  onApplyFilter() {
    this.setData({ page: 1, orders: [], hasMore: true })
    this.loadOrders()
  },

  // 加载订单
  loadOrders() {
    this.setData({ loading: true })
    const { activeTab, page, pageSize, startDate, endDate } = this.data

    return request({
      url: '/worker/orders',
      data: {
        status: activeTab === 'all' ? '' : activeTab,
        page,
        pageSize,
        startDate,
        endDate
      }
    }).then(data => {
      const list = (data.orders || data.list || []).map(this.formatOrder)
      this.setData({
        orders: list,
        hasMore: list.length >= pageSize,
        loading: false
      })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  // 加载更多
  loadMore() {
    const page = this.data.page + 1
    this.setData({ page, loading: true })

    const { activeTab, pageSize, startDate, endDate } = this.data
    request({
      url: '/worker/orders',
      data: {
        status: activeTab === 'all' ? '' : activeTab,
        page,
        pageSize,
        startDate,
        endDate
      }
    }).then(data => {
      const list = (data.orders || data.list || []).map(this.formatOrder)
      this.setData({
        orders: [...this.data.orders, ...list],
        hasMore: list.length >= pageSize,
        loading: false
      })
    }).catch(() => {
      this.setData({ page: page - 1, loading: false })
    })
  },

  // 格式化订单
  formatOrder(order) {
    return {
      ...order,
      statusText: this.getStatusText(order.status),
      statusClass: this.getStatusClass(order.status),
      timeText: order.appointment_time || order.create_time || '',
      addressShort: order.address ? order.address.substring(0, 20) + (order.address.length > 20 ? '...' : '') : ''
    }
  },

  getStatusText(s) {
    const m = { pending: '待接单', accepted: '已接单', doing: '服务中', done: '已完成', cancelled: '已取消' }
    return m[s] || s
  },

  getStatusClass(s) {
    const m = { pending: 'tag-pending', accepted: 'tag-accepted', doing: 'tag-doing', done: 'tag-done', cancelled: 'tag-cancel' }
    return m[s] || ''
  },

  onOrderTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` })
  }
})
