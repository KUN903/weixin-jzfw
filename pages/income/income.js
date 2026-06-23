// pages/income/income.js - 收入明细
const { request } = require('../../utils/request')

Page({
  data: {
    activeTab: 'all', // all | commission | withdraw
    tabs: [
      { key: 'all', name: '全部' },
      { key: 'commission', name: '佣金' },
      { key: 'withdraw', name: '提现' }
    ],
    totalIncome: '0.00',
    balance: '0.00',
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    selectedMonth: ''
  },

  onLoad() {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    this.setData({ selectedMonth: month })
    this.loadRecords()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, list: [], hasMore: true })
    this.loadRecords().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  onTabChange(e) {
    const { key } = e.currentTarget.dataset
    if (key === this.data.activeTab) return
    this.setData({ activeTab: key, page: 1, list: [], hasMore: true })
    this.loadRecords()
  },

  onMonthChange(e) {
    this.setData({ selectedMonth: e.detail.value, page: 1, list: [], hasMore: true })
    this.loadRecords()
  },

  loadRecords() {
    this.setData({ loading: true })
    const { activeTab, page, selectedMonth } = this.data

    return request({
      url: '/worker/income',
      data: {
        type: activeTab,
        month: selectedMonth,
        page: 1,
        pageSize: 20
      }
    }).then(data => {
      this.setData({
        totalIncome: data.totalIncome || '0.00',
        balance: data.balance || '0.00',
        list: data.list || [],
        hasMore: (data.list || []).length >= 20,
        loading: false
      })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  loadMore() {
    const page = this.data.page + 1
    this.setData({ page, loading: true })

    const { activeTab, selectedMonth } = this.data
    request({
      url: '/worker/income',
      data: { type: activeTab, month: selectedMonth, page, pageSize: 20 }
    }).then(data => {
      this.setData({
        list: [...this.data.list, ...(data.list || [])],
        hasMore: (data.list || []).length >= 20,
        loading: false
      })
    }).catch(() => {
      this.setData({ page: page - 1, loading: false })
    })
  }
})
