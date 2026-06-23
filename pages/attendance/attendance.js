// pages/attendance/attendance.js - 出勤设置
const { request } = require('../../utils/request')

Page({
  data: {
    // 今日打卡状态
    isClockedIn: false,
    clockInTime: '',
    clockOutTime: '',
    clockLocation: '',

    // 接单开关
    acceptOrders: true,

    // 接单时段
    startTime: '08:00',
    endTime: '18:00',
    startTimeIndex: [0, 0],
    endTimeIndex: [0, 0],

    // 请假表单
    showLeaveForm: false,
    leaveDate: '',
    leaveReason: '',

    // 当前 tab
    activeTab: 'clock', // clock | leave

    // 历史记录
    clockRecords: [],
    leaveRecords: [],
    loadingRecords: false
  },

  onShow() {
    this.loadTodayStatus()
    this.loadHistory()
  },

  // 加载今日打卡状态
  loadTodayStatus() {
    request({
      url: '/worker/attendance/today'
    }).then(data => {
      if (data.clocked) {
        this.setData({
          isClockedIn: true,
          clockInTime: data.clockInTime || '',
          clockOutTime: data.clockOutTime || '',
          clockLocation: data.location || '',
          acceptOrders: data.acceptOrders !== false
        })
      } else {
        this.setData({ acceptOrders: data.acceptOrders !== false })
      }
      if (data.startTime && data.endTime) {
        this.setData({ startTime: data.startTime, endTime: data.endTime })
      }
    }).catch(() => {})
  },

  // 上班打卡
  onClockIn() {
    const that = this
    wx.getLocation({
      type: 'gcj02',
      success(res) {
        const { latitude, longitude } = res
        request({
          url: '/worker/attendance/clockIn',
          method: 'POST',
          data: { latitude, longitude }
        }).then(result => {
          that.setData({
            isClockedIn: true,
            clockInTime: result.time || '',
            clockLocation: result.location || ''
          })
          wx.showToast({ title: '打卡成功', icon: 'success' })
          that.loadHistory()
        }).catch(err => {
          wx.showToast({ title: err.msg || '打卡失败', icon: 'none' })
        })
      },
      fail() {
        wx.showModal({
          title: '需要定位权限',
          content: '打卡需要获取您的位置信息，请在设置中开启定位权限',
          confirmText: '去设置',
          success(modalRes) {
            if (modalRes.confirm) {
              wx.openSetting()
            }
          }
        })
      }
    })
  },

  // 下班打卡
  onClockOut() {
    const that = this
    wx.getLocation({
      type: 'gcj02',
      success(res) {
        const { latitude, longitude } = res
        request({
          url: '/worker/attendance/clockOut',
          method: 'POST',
          data: { latitude, longitude }
        }).then(result => {
          that.setData({
            clockOutTime: result.time || ''
          })
          wx.showToast({ title: '签退成功', icon: 'success' })
          that.loadHistory()
        }).catch(err => {
          wx.showToast({ title: err.msg || '签退失败', icon: 'none' })
        })
      },
      fail() {
        wx.showToast({ title: '定位失败，请在开阔区域重试', icon: 'none' })
      }
    })
  },

  // 接单时间选择
  onStartTimeChange(e) {
    this.setData({ startTime: e.detail.value })
  },

  onEndTimeChange(e) {
    this.setData({ endTime: e.detail.value })
  },

  // 保存接单时段
  onSaveTimeRange() {
    request({
      url: '/worker/attendance/timeRange',
      method: 'POST',
      data: {
        startTime: this.data.startTime,
        endTime: this.data.endTime
      }
    }).then(() => {
      wx.showToast({ title: '保存成功', icon: 'success' })
    }).catch(err => {
      wx.showToast({ title: err.msg || '保存失败', icon: 'none' })
    })
  },

  // 接单开关
  onAcceptSwitch(e) {
    const value = e.detail.value
    this.setData({ acceptOrders: value })
    request({
      url: '/worker/attendance/toggleAccept',
      method: 'POST',
      data: { acceptOrders: value }
    }).then(() => {
      wx.showToast({ title: value ? '已开启接单' : '已暂停接单', icon: 'none' })
    }).catch(() => {
      this.setData({ acceptOrders: !value })
    })
  },

  // 请假日期选择
  onLeaveDateChange(e) {
    this.setData({ leaveDate: e.detail.value })
  },

  // 请假原因输入
  onLeaveReasonInput(e) {
    this.setData({ leaveReason: e.detail.value })
  },

  // 显示/隐藏请假表单
  onToggleLeaveForm() {
    this.setData({ showLeaveForm: !this.data.showLeaveForm, leaveReason: '', leaveDate: '' })
  },

  // 提交请假
  onSubmitLeave() {
    const { leaveDate, leaveReason } = this.data
    if (!leaveDate) {
      wx.showToast({ title: '请选择请假日期', icon: 'none' })
      return
    }
    if (!leaveReason.trim()) {
      wx.showToast({ title: '请填写请假原因', icon: 'none' })
      return
    }
    request({
      url: '/worker/attendance/leave',
      method: 'POST',
      data: { date: leaveDate, reason: leaveReason.trim() }
    }).then(() => {
      wx.showToast({ title: '请假提交成功', icon: 'success' })
      this.setData({ showLeaveForm: false, leaveDate: '', leaveReason: '' })
      this.loadHistory()
    }).catch(err => {
      wx.showToast({ title: err.msg || '提交失败', icon: 'none' })
    })
  },

  // 切换历史 tab
  onTabChange(e) {
    const { tab } = e.currentTarget.dataset
    this.setData({ activeTab: tab })
    this.loadHistory()
  },

  // 加载历史记录
  loadHistory() {
    this.setData({ loadingRecords: true })
    request({
      url: '/worker/attendance/history'
    }).then(data => {
      this.setData({
        clockRecords: data.clockRecords || [],
        leaveRecords: data.leaveRecords || [],
        loadingRecords: false
      })
    }).catch(() => {
      this.setData({ loadingRecords: false })
    })
  }
})
