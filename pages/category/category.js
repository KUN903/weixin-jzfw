// pages/category/category.js - 分类页
Page({
  data: {
    categories: [],
    activeCategoryId: 0,
    services: [],
    loading: true,
    categoryName: '全部分类'
  },

  onLoad(options) {
    if (options.categoryId) {
      this.setData({ 
        activeCategoryId: parseInt(options.categoryId),
        categoryName: options.categoryName || ''
      });
    }
    this.loadCategories();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },

  async loadCategories() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: { sql: 'SELECT id, name, icon FROM service_categories WHERE status = 1 ORDER BY sort_order ASC' }
      });
      if (res.result && res.result.data) {
        this.setData({ categories: res.result.data });
        if (res.result.data.length > 0) {
          if (this.data.activeCategoryId === 0) {
            this.setData({ activeCategoryId: res.result.data[0].id });
          }
          this.loadServices();
        }
      }
    } catch (err) {
      this.setData({
        categories: [
          { id: 1, name: '保洁打扫', icon: '🧹' },
          { id: 2, name: '家电清洗', icon: '🔧' },
          { id: 3, name: '居家维修', icon: '🔨' },
          { id: 4, name: '衣物护理', icon: '👔' },
          { id: 5, name: '收纳整理', icon: '📦' },
          { id: 6, name: '搬家服务', icon: '🚛' },
          { id: 7, name: '废品回收', icon: '♻️' }
        ],
        activeCategoryId: 1
      });
      this.loadServices();
    }
  },

  async loadServices() {
    this.setData({ loading: true });
    try {
      const cid = this.data.activeCategoryId;
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: { sql: `SELECT id, name, cover_image, price, original_price, unit, sales, rating, duration FROM service_products WHERE status = 1 AND category_id = ${cid} ORDER BY sort_order ASC, sales DESC` }
      });
      if (res.result && res.result.data) {
        const services = res.result.data.map(s => ({
          ...s,
          cp2: (s.name || '').substring(0, 2)
        }));
        this.setData({ services });
      } else {
        this.setData({ services: [] });
      }
    } catch (err) {
      console.error('加载服务失败:', err);
      this.loadLocalServices();
    }
    this.setData({ loading: false });
  },

  loadLocalServices() {
    const localData = {
      1: [{ id: 1, name: '日常保洁2小时', price: 99, original_price: 129, unit: '次', sales: 1520, rating: 4.8 },
          { id: 2, name: '深度保洁3小时', price: 199, original_price: 259, unit: '次', sales: 980, rating: 4.9 },
          { id: 3, name: '开荒保洁', price: 399, original_price: 499, unit: '次', sales: 560, rating: 4.7 }],
      2: [{ id: 4, name: '空调清洗', price: 129, original_price: 169, unit: '台', sales: 2300, rating: 4.8 },
          { id: 5, name: '油烟机清洗', price: 159, original_price: 199, unit: '台', sales: 1860, rating: 4.7 },
          { id: 6, name: '洗衣机清洗', price: 129, original_price: 159, unit: '台', sales: 1450, rating: 4.8 }],
      3: [{ id: 7, name: '水管疏通', price: 99, original_price: 139, unit: '次', sales: 890, rating: 4.6 },
          { id: 8, name: '电路检修', price: 149, original_price: 189, unit: '次', sales: 620, rating: 4.7 }],
      4: [{ id: 10, name: '普通干洗', price: 29, original_price: 39, unit: '件', sales: 3200, rating: 4.9 }],
      5: [{ id: 11, name: '全屋收纳整理', price: 299, original_price: 399, unit: '次', sales: 420, rating: 4.8 }],
      6: [{ id: 12, name: '小型搬家', price: 399, original_price: 499, unit: '次', sales: 760, rating: 4.6 }],
      7: [{ id: 13, name: '上门回收', price: 0, original_price: 0, unit: '次', sales: 5200, rating: 4.5 }]
    };
    this.setData({ services: localData[this.data.activeCategoryId] || [] });
  },

  onTapCategory(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    this.setData({ activeCategoryId: id, categoryName: name });
    this.loadServices();
  },

  onTapService(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${id}` });
  }
});
