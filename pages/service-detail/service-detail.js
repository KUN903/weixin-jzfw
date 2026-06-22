// pages/service-detail/service-detail.js - 服务详情 / 师傅详情
const app = getApp();

Page({
  data: {
    pageType: 'service', // 'service' | 'worker'
    // 服务模式
    serviceId: null,
    service: {},
    specs: [],
    selectedSpecs: {},
    serviceFlow: [],
    reviews: [],
    reviewCount: 0,
    isFavorited: false,
    // 师傅模式
    workerId: null,
    worker: {},
    workerServices: [],
    workerRatingText: '',
    workerGoodRateText: '',
    workerOrderCountText: ''
  },

  onLoad(options) {
    if (options.workerId) {
      // 师傅详情模式
      const workerId = options.workerId;
      this.setData({ pageType: 'worker', workerId });
      this.loadWorkerDetail(workerId);
      this.loadWorkerServices(workerId);
    } else if (options.id) {
      // 服务详情模式
      this.setData({ pageType: 'service', serviceId: options.id });
      this.loadServiceDetail(options.id);
      this.loadReviews(options.id);
      this.checkFavorite(options.id);
    }
  },

  // ========== 服务详情 ==========
  async loadServiceDetail(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: { sql: `SELECT * FROM service_products WHERE id = ${id} AND status = 1` }
      });
      if (res.result && res.result.data && res.result.data.length > 0) {
        const service = res.result.data[0];
        try {
          service.specs = service.specs ? (typeof service.specs === 'string' ? JSON.parse(service.specs) : service.specs) : [];
          service.service_flow = service.service_flow ? (typeof service.service_flow === 'string' ? JSON.parse(service.service_flow) : service.service_flow) : [];
        } catch (e) {
          service.specs = [];
          service.service_flow = [];
        }
        this.setData({
          service,
          specs: service.specs || [],
          serviceFlow: service.service_flow || [],
          selectedSpecs: {}
        });
      }
    } catch (err) {
      console.error('加载服务详情失败:', err);
      this.setData({
        service: {
          id: id, name: '日常保洁2小时', price: 99, original_price: 129, unit: '次',
          sales: 1520, rating: 4.8, duration: 120,
          description: '专业日常保洁，2小时深度清洁，包含客厅、卧室、厨房、卫生间的基础清洁服务。',
          notice: '请提前整理好贵重物品；如需增加时长可现场与师傅沟通补差价。'
        },
        specs: [{ name: '服务时长', options: ['2小时', '3小时', '4小时'] }, { name: '清洁面积', options: ['50㎡以下', '50-100㎡', '100-150㎡'] }],
        serviceFlow: ['确认预约时间', '师傅上门服务', '全屋基础清洁', '客户验收签字', '服务完成评价']
      });
    }
    wx.hideLoading();
  },

  async loadReviews(serviceId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: { sql: `SELECT r.id, r.rating, r.content, r.created_at, u.nickname FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.service_id = ${serviceId} AND r.status = 1 ORDER BY r.created_at DESC LIMIT 3` }
      });
      if (res.result && res.result.data) {
        this.setData({ 
          reviews: res.result.data,
          reviewCount: res.result.total || res.result.data.length
        });
      }
    } catch (err) {
      console.error('加载评价失败:', err);
    }
  },

  async checkFavorite(serviceId) {
    try {
      const userId = app.globalData.userInfo?.id || 1;
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: { sql: `SELECT id FROM favorites WHERE user_id = ${userId} AND service_id = ${serviceId}` }
      });
      if (res.result && res.result.data && res.result.data.length > 0) {
        this.setData({ isFavorited: true });
      }
    } catch (err) { /* 忽略 */ }
  },

  // ========== 师傅详情 ==========
  async loadWorkerDetail(workerId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: {
          sql: `SELECT id, name, avatar, phone, rating, total_orders, good_rate, intro, service_category_ids, district, address, verify_status
                FROM workers WHERE id = ${workerId} AND status = 1`
        }
      });
      if (res.result && res.result.data && res.result.data.length > 0) {
        const worker = res.result.data[0];
        // 格式化数据（避免 WXML 方法调用）
        this.setData({
          worker,
          workerRatingText: (worker.rating || 5.0).toFixed(1),
          workerGoodRateText: Math.round(worker.good_rate || 100) + '%',
          workerOrderCountText: (worker.total_orders || 0) + '单'
        });
      }
    } catch (err) {
      console.error('加载师傅详情失败:', err);
      this.setData({
        worker: {
          id: workerId, name: '师傅详情', rating: 5.0, total_orders: 0, good_rate: 100,
          intro: '加载失败，请稍后重试', district: '', address: ''
        },
        workerRatingText: '5.0',
        workerGoodRateText: '100%',
        workerOrderCountText: '0单'
      });
    }
    wx.hideLoading();
  },

  async loadWorkerServices(workerId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: {
          sql: `SELECT sp.id, sp.name, sp.cover_image, sp.price, sp.original_price, sp.unit, sp.sales, sp.rating, sp.duration
                FROM service_products sp
                INNER JOIN workers w ON FIND_IN_SET(sp.category_id, REPLACE(REPLACE(REPLACE(w.service_category_ids, '[', ''), ']', ''), ' ', ''))
                WHERE w.id = ${workerId} AND sp.status = 1
                ORDER BY sp.sales DESC LIMIT 10`
        }
      });
      if (res.result && res.result.data) {
        const services = res.result.data.map(s => ({
          ...s,
          cp2: (s.name || '服务').substring(0, 2)
        }));
        this.setData({ workerServices: services });
      } else {
        this.setData({ workerServices: [] });
      }
    } catch (err) {
      console.error('加载师傅服务失败:', err);
      this.setData({ workerServices: [] });
    }
  },

  // ========== 服务模式操作 ==========
  onSelectSpec(e) {
    const group = e.currentTarget.dataset.group;
    const value = e.currentTarget.dataset.value;
    const selectedSpecs = { ...this.data.selectedSpecs };
    selectedSpecs[group] = value;
    this.setData({ selectedSpecs });
  },

  async onToggleFavorite() {
    const { serviceId, isFavorited } = this.data;
    const newState = !isFavorited;
    this.setData({ isFavorited: newState });
    wx.showToast({ title: newState ? '已收藏' : '已取消收藏', icon: 'none' });

    try {
      const userId = app.globalData.userInfo?.id || 1;
      if (newState) {
        await wx.cloud.callFunction({
          name: 'dbExecute',
          data: { sql: `INSERT INTO favorites (user_id, service_id, created_at) VALUES (${userId}, ${serviceId}, NOW())` }
        });
      } else {
        await wx.cloud.callFunction({
          name: 'dbExecute',
          data: { sql: `DELETE FROM favorites WHERE user_id = ${userId} AND service_id = ${serviceId}` }
        });
      }
    } catch (err) {
      console.error('收藏操作失败:', err);
      this.setData({ isFavorited: !newState });
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  onBookNow() {
    const { service, selectedSpecs, specs } = this.data;
    if (specs.length > 0 && Object.keys(selectedSpecs).length < specs.length) {
      wx.showToast({ title: '请选择完整规格', icon: 'none' });
      return;
    }
    const specInfo = encodeURIComponent(JSON.stringify(selectedSpecs));
    wx.navigateTo({ 
      url: `/pages/order-create/order-create?serviceId=${service.id}&specInfo=${specInfo}`
    });
  },

  // ========== 师傅模式操作 ==========
  onTapWorkerService(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${id}` });
  },

  onBookWorker(e) {
    const sid = e.currentTarget.dataset.sid;
    // 列表项按钮传了 sid，底部大按钮兜底取第一个服务
    const targetId = sid || (this.data.workerServices[0] && this.data.workerServices[0].id);
    if (targetId) {
      wx.navigateTo({ url: `/pages/order-create/order-create?serviceId=${targetId}` });
    } else {
      wx.showToast({ title: '暂无可用服务', icon: 'none' });
    }
  },

  onCallWorkerPhone() {
    const phone = this.data.worker.phone;
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone });
    } else {
      wx.showToast({ title: '暂无联系电话', icon: 'none' });
    }
  },

  // ========== 公共 ==========
  onMoreReviews() {
    wx.showToast({ title: '查看更多评价', icon: 'none' });
  }
});
