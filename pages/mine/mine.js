// pages/mine/mine.js - 个人中心
const app = getApp();

Page({
  data: {
    isLogin: false,
    userInfo: {
      nickname: '',
      avatar: '',
      balance: 0,
      points: 0
    },
    totalCoupons: 0,
    stats: {
      totalOrders: 0,
      pending: 0,
      serving: 0,
      waitReview: 0
    },
    role: 'user', // user | worker | admin（由登录决定）
    // 师傅端数据
    workerStats: {
      todayOrders: 0,
      pendingOrders: 0,
      servingOrders: 0,
      completedToday: 0,
      totalEarnings: 0
    },
    // 管理员端数据
    adminStats: {
      totalUsers: 0,
      todayOrders: 0,
      pendingOrders: 0,
      totalWorkers: 0,
      totalRevenue: 0
    }
  },

  onLoad() {
    const savedRole = wx.getStorageSync('app_role') || 'user';
    app.globalData.role = savedRole;
    this.setData({ role: savedRole });
    this.getUserInfo();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const tabIndex = this.data.role === 'worker' ? 1 : 3;
      this.getTabBar().setData({ selected: tabIndex });
    }
    this.getUserInfo();
    this.loadRoleData();
  },

  getUserInfo() {
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({
        isLogin: true,
        userInfo: {
          nickname: userInfo.nickname || '微信用户',
          avatar: userInfo.avatar || '',
          balance: userInfo.balance || 0,
          points: userInfo.points || 0
        }
      });
    }
  },

  // 加载当前角色数据
  loadRoleData() {
    const { role } = this.data;
    if (role === 'worker') {
      this.loadWorkerStats();
    } else if (role === 'admin') {
      this.loadAdminStats();
    } else {
      this.loadStats();
      this.loadCouponCount();
    }
  },

  // ========== 用户端统计 ==========
  async loadStats() {
    const userId = app.globalData.userInfo?.id || 1;
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: {
          sql: `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'serving' THEN 1 ELSE 0 END) as serving,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as waitReview
            FROM orders WHERE user_id = ${userId}`
        }
      });
      if (res.result && res.result.data && res.result.data.length > 0) {
        const d = res.result.data[0];
        this.setData({
          stats: {
            totalOrders: d.total || 0,
            pending: d.pending || 0,
            serving: d.serving || 0,
            waitReview: d.waitReview || 0
          }
        });
      }
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  },

  async loadCouponCount() {
    const userId = app.globalData.userInfo?.id || 1;
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: {
          sql: `SELECT COUNT(*) as cnt FROM user_coupons WHERE user_id = ${userId} AND status = 0 AND expired_at > NOW()`
        }
      });
      if (res.result && res.result.data && res.result.data.length > 0) {
        this.setData({ totalCoupons: res.result.data[0].cnt || 0 });
      }
    } catch (err) { /* 忽略 */ }
  },

  // ========== 师傅端统计 ==========
  async loadWorkerStats() {
    const workerId = app.globalData.workerId;
    if (!workerId) {
      console.warn('workerId未设置，跳过统计加载');
      return;
    }
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: {
          sql: `SELECT 
            COUNT(*) as totalTodayOrders,
            SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as pendingOrders,
            SUM(CASE WHEN status = 'serving' THEN 1 ELSE 0 END) as servingOrders,
            SUM(CASE WHEN status = 'completed' AND DATE(completed_at) = CURDATE() THEN 1 ELSE 0 END) as completedToday,
            COALESCE(SUM(CASE WHEN status = 'completed' OR status = 'finished' THEN actual_price ELSE 0 END), 0) as totalEarnings
            FROM orders WHERE worker_id = ${workerId} AND DATE(created_at) = CURDATE()`
        }
      });
      if (res.result && res.result.data && res.result.data.length > 0) {
        const d = res.result.data[0];
        this.setData({
          workerStats: {
            todayOrders: d.totalTodayOrders || 0,
            pendingOrders: d.pendingOrders || 0,
            servingOrders: d.servingOrders || 0,
            completedToday: d.completedToday || 0,
            totalEarnings: d.totalEarnings || 0
          }
        });
      }
    } catch (err) {
      console.error('加载师傅统计失败:', err);
    }
  },

  // ========== 管理员端统计 ==========
  async loadAdminStats() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: {
          sql: `SELECT
            (SELECT COUNT(*) FROM users) as totalUsers,
            (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()) as todayOrders,
            (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pendingOrders,
            (SELECT COUNT(*) FROM workers WHERE status = 1) as totalWorkers,
            COALESCE((SELECT SUM(actual_price) FROM orders WHERE pay_status = 1), 0) as totalRevenue
            FROM dual`
        }
      });
      if (res.result && res.result.data && res.result.data.length > 0) {
        const d = res.result.data[0];
        this.setData({
          adminStats: {
            totalUsers: d.totalUsers || 0,
            todayOrders: d.todayOrders || 0,
            pendingOrders: d.pendingOrders || 0,
            totalWorkers: d.totalWorkers || 0,
            totalRevenue: d.totalRevenue || 0
          }
        });
      }
    } catch (err) {
      console.error('加载管理统计失败:', err);
    }
  },

  // ========== 登录 ==========
  onLogin() {
    if (this.data.isLogin) return;
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        this.setData({
          isLogin: true,
          userInfo: {
            nickname: res.userInfo.nickName,
            avatar: res.userInfo.avatarUrl,
            balance: 0,
            points: 0
          }
        });
        wx.login({
          success: (loginRes) => {
            wx.cloud.callFunction({
              name: 'userLogin',
              data: {
                code: loginRes.code,
                nickname: res.userInfo.nickName,
                avatar: res.userInfo.avatarUrl
              }
            });
          }
        });
      }
    });
  },

  // ========== 导航 ==========
  onNavigate(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.navigateTo({ url });
    }
  },

  onGoOrderList(e) {
    const tab = e.currentTarget.dataset.tab || 0;
    wx.switchTab({ url: '/pages/order-list/order-list' });
    wx.setStorageSync('order_active_tab', tab);
  },

  onViewWorkerOrders() {
    wx.navigateTo({ url: '/pages/order-list/order-list' });
    wx.setStorageSync('order_active_tab', 2);
  },

  onViewAdminOrders() {
    wx.navigateTo({ url: '/pages/order-list/order-list' });
    wx.setStorageSync('order_active_tab', 0);
  },

  onContactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-xxx-xxxx\n工作时间：9:00-21:00',
      showCancel: true,
      cancelText: '取消',
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({ phoneNumber: '4000000000' });
        }
      }
    });
  }
});
