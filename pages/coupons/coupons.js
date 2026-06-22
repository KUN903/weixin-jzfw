// pages/coupons/coupons.js
Page({
  data: { coupons: [], loading: true },
  onShow() { this.loadCoupons(); },
  async loadCoupons() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({ name: 'dbQuery', data: { sql: `SELECT c.id, c.name, c.type, c.condition_price, c.discount_value, uc.status, uc.expired_at FROM user_coupons uc LEFT JOIN coupons c ON uc.coupon_id = c.id WHERE uc.user_id = 1 ORDER BY uc.status ASC, uc.created_at DESC` } });
      if (res.result && res.result.data) this.setData({ coupons: res.result.data });
    } catch(err) { this.setData({ coupons: [] }); }
    this.setData({ loading: false });
  }
});
