// pages/favorites/favorites.js
Page({
  data: { favorites: [], loading: true },
  onShow() { this.loadFavorites(); },
  async loadFavorites() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({ name: 'dbQuery', data: { sql: `SELECT f.id as fid, s.id, s.name, s.price, s.original_price, s.unit, s.sales, s.rating FROM favorites f LEFT JOIN service_products s ON f.service_id = s.id WHERE f.user_id = 1 ORDER BY f.created_at DESC` } });
      if (res.result && res.result.data) this.setData({ favorites: res.result.data });
    } catch(err) { this.setData({ favorites: [] }); }
    this.setData({ loading: false });
  },
  onTap(e) { const id = e.currentTarget.dataset.id; wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${id}` }); }
});
