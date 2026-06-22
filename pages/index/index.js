// pages/index/index.js - 首页
const app = getApp();

Page({
  data: {
    // 轮播图
    banners: [
      { id: 1, image: '', title: '新用户首单立减20元', color: '#E8F8EF' },
      { id: 2, image: '', title: '家电清洗限时特惠', color: '#FFF3E0' },
      { id: 3, image: '', title: '搬家服务品质升级', color: '#E3F2FD' }
    ],
    // 服务分类
    categories: [],
    // 热门推荐
    hotServices: [],
    // 附近师傅
    nearWorkers: [],
    // 当前位置
    city: '定位中...',
    district: '',
    locating: false,
    // 搜索关键词
    searchKeyword: ''
  },

  onLoad() {
    this.syncLocation();
    this.loadData();
  },

  onShow() {
    // 更新 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this.syncLocation();
    if (app.globalData.location) {
      this.loadNearWorkers();
    }
  },

  // 同步城市名
  syncLocation() {
    const city = app.globalData.city || '上海市';
    const district = app.globalData.district || '';
    if (city && city !== this.data.city) {
      this.setData({ city, district });
    }
  },

  // 加载首页所有数据
  async loadData() {
    wx.showLoading({ title: '加载中...' });
    try {
      await Promise.all([
        this.loadCategories(),
        this.loadHotServices(),
        this.loadNearWorkers()
      ]);
    } catch (err) {
      console.error('首页数据加载失败:', err);
    }
    wx.hideLoading();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载服务分类
  async loadCategories() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: {
          sql: 'SELECT id, name, icon FROM service_categories WHERE status = 1 ORDER BY sort_order ASC'
        }
      });
      if (res.result && res.result.data) {
        this.setData({ categories: res.result.data });
      }
    } catch (err) {
      console.error('加载分类失败:', err);
      // 降级使用本地数据
      this.setData({
        categories: [
          { id: 1, name: '保洁打扫', icon: '🧹' },
          { id: 2, name: '家电清洗', icon: '🔧' },
          { id: 3, name: '居家维修', icon: '🔨' },
          { id: 4, name: '衣物护理', icon: '👔' },
          { id: 5, name: '收纳整理', icon: '📦' },
          { id: 6, name: '搬家服务', icon: '🚛' },
          { id: 7, name: '废品回收', icon: '♻️' }
        ]
      });
    }
  },

  // 加载热门服务
  async loadHotServices() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: {
          sql: 'SELECT id, name, cover_image, price, original_price, unit, sales, rating, duration FROM service_products WHERE status = 1 AND is_recommended = 1 ORDER BY sales DESC LIMIT 6'
        }
      });
      if (res.result && res.result.data) {
        const services = res.result.data.map(s => ({
          ...s,
          cp2: (s.name || '').substring(0, 2)
        }));
        this.setData({ hotServices: services });
      }
    } catch (err) {
      console.error('加载热门服务失败:', err);
      // 降级数据
      this.setData({
        hotServices: [
          { id: 1, name: '日常保洁2小时', cp2: '日常', price: 99, original_price: 129, unit: '次', sales: 1520, rating: 4.8, duration: 120 },
          { id: 4, name: '空调清洗', cp2: '空调', price: 129, original_price: 169, unit: '台', sales: 2300, rating: 4.8, duration: 60 },
          { id: 10, name: '普通干洗', cp2: '普通', price: 29, original_price: 39, unit: '件', sales: 3200, rating: 4.9, duration: 2880 },
          { id: 5, name: '油烟机清洗', cp2: '油烟', price: 159, original_price: 199, unit: '台', sales: 1860, rating: 4.7, duration: 90 }
        ]
      });
    }
  },

  // 加载附近师傅
  async loadNearWorkers() {
    const loc = app.globalData.location || { lat: 31.2304, lng: 121.4737 };
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: {
          sql: `SELECT id, name, avatar, rating, total_orders, good_rate, intro, service_category_ids, lat, lng,
                (6371 * acos(cos(radians(${loc.lat})) * cos(radians(lat)) * cos(radians(lng) - radians(${loc.lng})) + sin(radians(${loc.lat})) * sin(radians(lat)))) AS distance
                FROM workers WHERE status = 1 AND verify_status = 1
                ORDER BY distance ASC LIMIT 6`
        }
      });
      if (res.result && res.result.data) {
        const workers = this.formatWorkers(res.result.data);
        this.setData({ nearWorkers: workers });
      }
    } catch (err) {
      console.error('加载师傅失败:', err);
      this.setData({
        nearWorkers: this.formatWorkers([
          { id: 1, name: '张师傅', rating: 4.9, total_orders: 328, good_rate: 98.5, intro: '从事保洁行业8年，服务认真细致', service_category_ids: '[1,2]', distance: 2.3 },
          { id: 2, name: '李师傅', rating: 4.8, total_orders: 256, good_rate: 97.8, intro: '20年水电维修经验，持证上岗', service_category_ids: '[3]', distance: 3.1 },
          { id: 3, name: '王阿姨', rating: 4.9, total_orders: 412, good_rate: 99.2, intro: '金牌保洁收纳师', service_category_ids: '[1,5]', distance: 1.8 },
          { id: 4, name: '刘师傅', rating: 4.7, total_orders: 198, good_rate: 96.5, intro: '专业家电清洗技师', service_category_ids: '[2]', distance: 4.5 }
        ])
      });
    }
  },

  // 格式化师傅数据（处理 WXML 不支持的方法调用）
  formatWorkers(workers) {
    return workers.map(w => ({
      ...w,
      ratingText: (w.rating || 5.0).toFixed(1),
      distanceText: w.distance !== undefined ? w.distance.toFixed(1) + 'km' : '附近',
      goodRateText: Math.round(w.good_rate || 100) + '%'
    }));
  },

  // 点击搜索框
  onTapSearch() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  // 点击分类
  onTapCategory(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    wx.navigateTo({ url: `/pages/category/category?categoryId=${id}&categoryName=${name}` });
  },

  // 点击服务
  onTapService(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${id}` });
  },

  // 点击师傅
  onTapWorker(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/service-detail/service-detail?workerId=${id}` });
  },

  // 查看更多师傅
  onMoreWorkers() {
    wx.switchTab({ url: '/pages/category/category' });
  },

  // 切换城市 / 刷新定位
  onSwitchCity() {
    if (this.data.locating) return;
    this.setData({ locating: true, city: '定位中...' });
    // 重新获取位置
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        app.globalData.location = { lat: res.latitude, lng: res.longitude };
        app.reverseGeocode(res.latitude, res.longitude);
        // 等待逆地理编码完成后刷新
        setTimeout(() => {
          this.syncLocation();
          this.loadNearWorkers();
          this.setData({ locating: false });
        }, 1500);
      },
      fail: () => {
        wx.showToast({ title: '定位失败，请检查权限', icon: 'none' });
        this.setData({ locating: false, city: '上海市' });
      }
    });
  }
});
