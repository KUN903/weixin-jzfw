// pages/address-edit/address-edit.js
const app = getApp();

Page({
  data: { id: null, contactName: '', contactPhone: '', province: '', city: '', district: '', detail: '', isDefault: false, saving: false, locating: false },
  
  onLoad(options) {
    if (options.id) {
      this.setData({ id: parseInt(options.id) });
      this.loadAddress();
    }
  },

  async loadAddress() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: { sql: `SELECT * FROM addresses WHERE id = ${this.data.id}` }
      });
      if (res.result && res.result.data && res.result.data.length > 0) {
        const a = res.result.data[0];
        this.setData({
          contactName: a.contact_name || '',
          contactPhone: a.contact_phone || '',
          province: a.province || '',
          city: a.city || '',
          district: a.district || '',
          detail: a.detail || '',
          isDefault: a.is_default === 1
        });
      }
    } catch (e) {
      wx.showToast({ title: '加载地址失败', icon: 'none' });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  onSwitchDefault(e) {
    this.setData({ isDefault: e.detail.value });
  },

  // GPS自动获取位置填充省市区
  onAutoLocate() {
    if (this.data.locating) return;
    this.setData({ locating: true });
    wx.getLocation({
      type: 'gcj02',
      success: (locRes) => {
        const key = 'WWDBZ-6SKEF-25RJ5-JYX5V-CRKX6-CXBCF';
        wx.request({
          url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${locRes.latitude},${locRes.longitude}&key=${key}&get_poi=0`,
          success: (apiRes) => {
            if (apiRes.data && apiRes.data.status === 0) {
              const ad = apiRes.data.result.ad_info;
              const addr = apiRes.data.result.address || '';
              this.setData({
                province: ad.province || '',
                city: (ad.city || '').replace('市', ''),
                district: ad.district || '',
                detail: addr + ' ' + this.data.detail
              });
              wx.showToast({ title: '已定位到当前位置', icon: 'success' });
            } else {
              wx.showToast({ title: '位置解析失败', icon: 'none' });
            }
          },
          fail: () => wx.showToast({ title: '网络错误', icon: 'none' }),
          complete: () => this.setData({ locating: false })
        });
      },
      fail: (err) => {
        console.error('定位失败:', err);
        wx.showToast({ title: '定位失败，请检查权限', icon: 'none' });
        this.setData({ locating: false });
      }
    });
  },

  async onSave() {
    const { id, contactName, contactPhone, province, city, district, detail, isDefault, saving } = this.data;
    if (saving) return;

    // 校验
    if (!contactName.trim()) { wx.showToast({ title: '请输入联系人', icon: 'none' }); return; }
    if (!contactPhone.trim() || !/^1\d{10}$/.test(contactPhone)) { wx.showToast({ title: '请输入正确的手机号', icon: 'none' }); return; }
    if (!detail.trim()) { wx.showToast({ title: '请输入详细地址', icon: 'none' }); return; }

    this.setData({ saving: true });

    const userId = app.globalData.userId || 1;
    const esc = (s) => (s || '').replace(/'/g, "''").replace(/\\/g, '\\\\');

    try {
      // 如果设为默认，先取消其他默认
      if (isDefault) {
        await wx.cloud.callFunction({
          name: 'dbExecute',
          data: { sql: `UPDATE addresses SET is_default = 0 WHERE user_id = ${userId} AND is_default = 1` }
        });
      }

      if (id) {
        // 更新
        await wx.cloud.callFunction({
          name: 'dbExecute',
          data: {
            sql: `UPDATE addresses SET contact_name='${esc(contactName)}', contact_phone='${esc(contactPhone)}', province='${esc(province)}', city='${esc(city)}', district='${esc(district)}', detail='${esc(detail)}', is_default=${isDefault ? 1 : 0}, updated_at=NOW() WHERE id = ${id} AND user_id = ${userId}`
          }
        });
      } else {
        // 新增
        await wx.cloud.callFunction({
          name: 'dbExecute',
          data: {
            sql: `INSERT INTO addresses (user_id, contact_name, contact_phone, province, city, district, detail, is_default, created_at, updated_at) VALUES (${userId}, '${esc(contactName)}', '${esc(contactPhone)}', '${esc(province)}', '${esc(city)}', '${esc(district)}', '${esc(detail)}', ${isDefault ? 1 : 0}, NOW(), NOW())`
          }
        });
      }

      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (err) {
      console.error('保存地址失败:', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
