// pages/order-list/order-list.js - 订单中心（含角色过滤）
const app = getApp();

Page({
  data: {
    currentTab: 0,
    role: 'user',
    tabs: [
      { label: '全部', value: 'all' },
      { label: '待付款', value: 'pending_pay' },
      { label: '待上门', value: 'accepted' },
      { label: '服务中', value: 'serving' },
      { label: '待评价', value: 'completed' }
    ],
    orders: [],
    loading: true,
    refreshing: false
  },

  onLoad() {
    const role = app.getRole();
    this.setData({ role });
    // 恢复上次选中的tab
    const savedTab = wx.getStorageSync('order_active_tab');
    if (savedTab !== '' && savedTab !== undefined) {
      this.setData({ currentTab: parseInt(savedTab) || 0 });
      wx.removeStorageSync('order_active_tab');
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    const role = app.getRole();
    this.setData({ role });
    // 师傅端若 workerId 未设置，先查出再加载
    if (role === 'worker' && !app.globalData.workerId) {
      this.loadWorkerIdentity().then(() => this.loadOrders());
    } else {
      this.loadOrders();
    }
  },

  // 加载师傅身份（与 mine.js 共享的 workerId 查询逻辑）
  async loadWorkerIdentity() {
    const userId = app.globalData.userInfo?.id || 1;
    try {
      // 1. phone 匹配
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: {
          sql: `SELECT w.id FROM workers w 
                INNER JOIN users u ON w.phone = u.phone AND w.phone != '' 
                WHERE u.id = ${userId} AND w.status = 1 LIMIT 1`
        }
      });
      if (res.result?.data?.length > 0) {
        app.globalData.workerId = res.result.data[0].id;
        return;
      }
    } catch (err) { /* fall through */ }
    // 2. 通过订单反查
    try {
      const orderRes = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: {
          sql: `SELECT o.worker_id as id FROM orders o 
                INNER JOIN workers w ON o.worker_id = w.id AND w.status = 1
                WHERE o.user_id = ${userId} AND !(o.worker_id <=> NULL) 
                ORDER BY o.created_at DESC LIMIT 1`
        }
      });
      if (orderRes.result?.data?.length > 0) {
        app.globalData.workerId = orderRes.result.data[0].id;
        return;
      }
    } catch (err) { /* fall through */ }
    // 3. 取第一个可用师傅
    try {
      const fallback = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: { sql: 'SELECT id FROM workers WHERE status = 1 AND verify_status = 1 LIMIT 1' }
      });
      if (fallback.result?.data?.length > 0) {
        app.globalData.workerId = fallback.result.data[0].id;
      }
    } catch (err) { console.error('获取workerId失败:', err); }
  },

  switchTab(e) {
    const idx = parseInt(e.currentTarget.dataset.index);
    this.setData({ currentTab: idx });
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true });
    const tab = this.data.tabs[this.data.currentTab];
    const role = app.getRole();
    const userId = app.globalData.userInfo?.id || 1;

    let statusCondition = '';
    if (tab.value === 'pending_pay') {
      statusCondition = "AND o.status = 'pending' AND o.pay_status = 0";
    } else if (tab.value !== 'all') {
      statusCondition = `AND o.status = '${tab.value}'`;
    }

    // 根据角色构建WHERE条件
    let roleCondition = '';
    if (role === 'worker') {
      const workerId = app.globalData.workerId;
      if (!workerId) {
        this.setData({ orders: [], loading: false });
        return;
      }
      roleCondition = `AND o.worker_id = ${workerId}`;
    } else if (role === 'admin') {
      roleCondition = ''; // 管理员看全部
    } else {
      roleCondition = `AND o.user_id = ${userId}`;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: {
          sql: `SELECT o.order_no, o.status, o.pay_status, o.service_date, o.service_time_slot, o.actual_price, o.created_at, o.price, o.discount,
                s.name as service_name, s.cover_image,
                w.name as worker_name
                FROM orders o
                LEFT JOIN service_products s ON o.service_id = s.id
                LEFT JOIN workers w ON o.worker_id = w.id
                WHERE 1=1 ${roleCondition} ${statusCondition}
                ORDER BY o.created_at DESC LIMIT 20`
        }
      });
      if (res.result && res.result.data) {
        // 预格式化数据（WXML不支持.substring()等JS方法调用）
        const orders = res.result.data.map(o => ({
          ...o,
          svcCp2: (o.service_name || '家政').substring(0, 2)
        }));
        this.setData({ orders });
      } else {
        this.setData({ orders: [] });
      }
    } catch (err) {
      console.error('加载订单失败:', err);
      this.setData({ orders: [] });
    }
    this.setData({ loading: false, refreshing: false });
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadOrders();
  },

  onTapOrder(e) {
    const orderNo = e.currentTarget.dataset.orderno;
    wx.navigateTo({ url: `/pages/order-detail/order-detail?orderNo=${orderNo}` });
  },

  onTapPay(e) {
    const orderNo = e.currentTarget.dataset.orderno;
    wx.navigateTo({ url: `/pages/order-detail/order-detail?orderNo=${orderNo}` });
  },

  onTapCancel(e) {
    const orderNo = e.currentTarget.dataset.orderno;
    wx.showModal({
      title: '取消订单',
      content: '确定要取消此订单吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' });
          wx.cloud.callFunction({
            name: 'orderCancel',
            data: { orderNo, reason: '用户主动取消' }
          }).then((result) => {
            wx.hideLoading();
            if (result.result && result.result.success) {
              wx.showToast({ title: '已取消', icon: 'success' });
              this.loadOrders();
            } else {
              wx.showToast({ title: result.result?.message || '取消失败', icon: 'none' });
            }
          }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '网络错误', icon: 'none' });
          });
        }
      }
    });
  },

  onTapReview(e) {
    const orderNo = e.currentTarget.dataset.orderno;
    wx.navigateTo({ url: `/pages/review/review?orderNo=${orderNo}` });
  }
});
