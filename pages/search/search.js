// pages/search/search.js
const app = getApp();
Page({
  data: { keyword: '', history: [], hotKeywords: ['保洁', '空调清洗', '油烟机清洗', '搬家', '收纳整理', '家电维修'], results: [], searched: false, loading: false },
  onLoad() { const h = wx.getStorageSync('search_history') || []; this.setData({ history: h }); },
  onInput(e) { this.setData({ keyword: e.detail.value }); },
  onSearch() {
    const kw = this.data.keyword.trim();
    if (!kw) { wx.showToast({ title: '请输入搜索关键词', icon: 'none' }); return; }
    let history = this.data.history.filter(h => h !== kw);
    history.unshift(kw);
    if (history.length > 10) history = history.slice(0, 10);
    wx.setStorageSync('search_history', history);
    this.setData({ history, searched: true, loading: true });
    // 搜索
    wx.cloud.callFunction({ name: 'dbQuery', data: { sql: `SELECT id, name, price, original_price, unit, sales, rating, duration FROM service_products WHERE status = 1 AND name LIKE '%${kw}%' ORDER BY sales DESC LIMIT 20` } }).then(res => {
      if (res.result && res.result.data) { this.setData({ results: res.result.data }); }
    }).catch(() => { this.setData({ results: [] }); }).finally(() => { this.setData({ loading: false }); });
  },
  onTapKeyword(e) { const kw = e.currentTarget.dataset.kw; this.setData({ keyword: kw }); this.onSearch(); },
  onClearHistory() { this.setData({ history: [] }); wx.setStorageSync('search_history', []); },
  onTapResult(e) { const id = e.currentTarget.dataset.id; wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${id}` }); }
});
