// custom-tab-bar/index.js - 自定义 Tab Bar 组件
Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '首页', icon: '🏠', selectedIcon: '🏠' },
      { pagePath: '/pages/category/category', text: '分类', icon: '📋', selectedIcon: '📋' },
      { pagePath: '/pages/order-list/order-list', text: '订单', icon: '📦', selectedIcon: '📦' },
      { pagePath: '/pages/mine/mine', text: '我的', icon: '👤', selectedIcon: '👤' }
    ]
  },
  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const url = this.data.list[index].pagePath;
      wx.switchTab({ url });
    }
  }
});
