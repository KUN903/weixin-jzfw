// pages/mine/mine.js - 个人中心（含角色切换）
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
    // 角色相关
    role: 'user', // user | worker | admin
    roleAlias: '普通用户',
    roles: [
      { key: 'user', name: '客户端', icon: '\u{1F3E0}' },
      { key: 'worker', name: '师傅端', icon: '\u{1F468}\u200D\u{1F527}' },
      { key: 'admin', name: '管理端', icon: '\u{1F4CA}' }
    ],
    showRolePicker: false,
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
    // 从存储恢复角色
    const savedRole = wx.getStorageSync('app_role') || 'user';
    app.globalData.role = savedRole;
    this.setData({ role: savedRole, roleAlias: this.getRoleAlias(savedRole) });
    this.getUserInfo();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
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

  getRoleAlias(role) {
    const map = { user: '普通用户', worker: '服务师傅', admin: '管理员' };
    return map[role] || '普通用户';
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

  // ========== 角色切换 ==========
  onToggleRolePicker() {
    this.setData({ showRolePicker: !this.data.showRolePicker });
  },

  onSwitchRole(e) {
    const role = e.currentTarget.dataset.role;
    if (role === this.data.role) {
      this.setData({ showRolePicker: false });
      return;
    }
    app.switchRole(role);
    this.setData({
      role,
      roleAlias: this.getRoleAlias(role),
      showRolePicker: false
    });
    // 切换到师傅端时，查询 workers 表获取 workerId
    if (role === 'worker') {
      this.loadWorkerIdentity().then(() => this.loadRoleData());
    } else {
      this.loadRoleData();
    }
  },

  // 通过 phone 匹配，找到当前用户在 workers 表中的 ID
  async loadWorkerIdentity() {
    const userId = app.globalData.userInfo?.id || 1;
    try {
      // 1. 先尝试用 phone 关联
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
    } catch (err) {
      console.warn('phone匹配worker失败:', err);
    }
    // 2. 降级：通过最近订单反查师傅（适用于已下单后查看的demo场景）
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
    } catch (err) {
      console.warn('通过订单反查worker失败:', err);
    }
    // 3. 最后降级：取第一个可用师傅
    try {
      const fallback = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: { sql: 'SELECT id FROM workers WHERE status = 1 AND verify_status = 1 LIMIT 1' }
      });
      if (fallback.result?.data?.length > 0) {
        app.globalData.workerId = fallback.result.data[0].id;
      }
    } catch (err) {
      console.error('获取workerId失败:', err);
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

  // 师傅端-查看今日订单
  onViewWorkerOrders() {
    wx.navigateTo({ url: '/pages/order-list/order-list' });
    wx.setStorageSync('order_active_tab', 2); // 进行中tab
  },

  // 管理员端-查看待处理订单
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
