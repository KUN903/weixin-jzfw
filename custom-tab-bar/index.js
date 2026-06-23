// custom-tab-bar/index.js - 自定义 Tab Bar（角色感知 + 登录页隐藏）
const app = getApp()

// 用户端 Tab 配置
const USER_TABS = [
  { pagePath: '/pages/index/index', text: '首页', icon: '🏠' },
  { pagePath: '/pages/category/category', text: '分类', icon: '📋' },
  { pagePath: '/pages/order-list/order-list', text: '订单', icon: '📦' },
  { pagePath: '/pages/mine/mine', text: '我的', icon: '👤' }
]

// 师傅端 Tab 配置
const WORKER_TABS = [
  { pagePath: '/pages/today-orders/today-orders', text: '工单', icon: '📋' },
  { pagePath: '/pages/mine/mine', text: '我的', icon: '👷' }
]

// 登录页路由（这些页面不显示 TabBar）
const HIDE_TABBAR_PAGES = [
  'pages/login/login'
]

Component({
  data: {
    selected: 0,
    list: USER_TABS,
    role: 'user',
    showTabBar: true       // 登录页隐藏
  },

  lifetimes: {
    attached() {
      this.updateTabs()
    }
  },

  pageLifetimes: {
    show() {
      this.updateTabs()
    }
  },

  methods: {
    updateTabs() {
      // 检测当前页面是否需隐藏 TabBar
      const pages = getCurrentPages()
      const currentRoute = pages.length > 0 ? pages[pages.length - 1].route : ''
      const shouldHide = HIDE_TABBAR_PAGES.includes(currentRoute)
      if (shouldHide) {
        this.setData({ showTabBar: false })
        return
      }

      // 正常显示
      const role = app.globalData.role || wx.getStorageSync('app_role') || 'user'
      const tabs = role === 'worker' ? WORKER_TABS : USER_TABS

      let selected = tabs.findIndex(t => t.pagePath === '/' + currentRoute)
      if (selected === -1) selected = this.data.selected

      this.setData({ list: tabs, selected, role, showTabBar: true })
    },

    switchTab(e) {
      const index = e.currentTarget.dataset.index
      const url = this.data.list[index].pagePath
      wx.switchTab({ url })
    }
  }
})
