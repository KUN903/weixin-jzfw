// pages/address-list/address-list.js
Page({
  data: { addresses: [] },
  onShow() { this.loadAddresses(); },
  async loadAddresses() {
    try {
      const res = await wx.cloud.callFunction({ name: 'dbQuery', data: { sql: 'SELECT * FROM addresses WHERE user_id = 1 ORDER BY is_default DESC, updated_at DESC' } });
      if (res.result && res.result.data) this.setData({ addresses: res.result.data });
    } catch(err) { this.setData({ addresses: [] }); }
  },
  onAdd() { wx.navigateTo({ url: '/pages/address-edit/address-edit' }); },
  onEdit(e) { const id = e.currentTarget.dataset.id; wx.navigateTo({ url: `/pages/address-edit/address-edit?id=${id}` }); }
});
