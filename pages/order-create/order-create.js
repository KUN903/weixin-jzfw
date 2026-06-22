// pages/order-create/order-create.js - 预约下单
const app = getApp();

Page({
  data: {
    step: 1, // 1=确认信息 2=确认支付
    serviceId: null,
    service: {},
    specInfo: {},
    specText: '',
    
    // 预约时间
    serviceDate: '',
    serviceTimeSlot: '',
    timeSlots: [
      '08:00-10:00', '10:00-12:00', '12:00-14:00',
      '14:00-16:00', '16:00-18:00', '18:00-20:00'
    ],
    today: '',
    next7Days: [],
    
    // 地址
    selectedAddress: null,
    addresses: [],
    
    // 备注
    remark: '',
    
    // 价格信息
    price: 0,
    originalPrice: 0,
    couponDiscount: 0,
    actualPrice: 0,
    selectedCoupon: null,
    myCoupons: [],
    
    // 提交状态
    submitting: false
  },

  onLoad(options) {
    const serviceId = options.serviceId;
    let specInfo = {};
    try {
      if (options.specInfo) {
        specInfo = JSON.parse(decodeURIComponent(options.specInfo));
      }
    } catch (e) {}

    // 构建规格文本
    const specParts = [];
    Object.keys(specInfo).forEach(key => {
      if (specInfo[key]) specParts.push(specInfo[key]);
    });
    const specText = specParts.length > 0 ? specParts.join(' / ') : '默认规格';

    // 生成未来7天
    const today = new Date();
    const next7Days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      next7Days.push({
        value: this.formatDate(d),
        label: `${d.getMonth() + 1}月${d.getDate()}日 ${i === 0 ? '今天' : i === 1 ? '明天' : weekNames[d.getDay()]}`
      });
    }

    this.setData({
      serviceId,
      specInfo,
      specText,
      today: this.formatDate(today),
      next7Days
    });

    this.loadServiceInfo(serviceId);
    this.loadAddresses();
  },

  onShow() {
    // 每次显示时刷新地址
    this.loadAddresses();
  },

  formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  async loadServiceInfo(id) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: { sql: `SELECT id, name, price, original_price, unit, duration FROM service_products WHERE id = ${id}` }
      });
      if (res.result && res.result.data && res.result.data.length > 0) {
        const s = res.result.data[0];
        this.setData({
          service: s,
          price: s.price,
          actualPrice: s.price
        });
      }
    } catch (err) {
      this.setData({
        service: { id, name: '家政服务', price: 99, original_price: 129, unit: '次' },
        price: 99, actualPrice: 99
      });
    }
  },

  async loadAddresses() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: { sql: 'SELECT * FROM addresses WHERE user_id = 1 ORDER BY is_default DESC, updated_at DESC' }
      });
      if (res.result && res.result.data) {
        this.setData({ addresses: res.result.data });
        // 自动选择默认地址
        const defaultAddr = res.result.data.find(a => a.is_default === 1);
        if (defaultAddr) {
          this.setData({ selectedAddress: defaultAddr });
        }
      }
    } catch (err) {
      this.setData({
        addresses: []
      });
    }
  },

  // 选择日期
  onSelectDate(e) {
    this.setData({ serviceDate: e.currentTarget.dataset.date });
  },

  // 选择时段
  onSelectTime(e) {
    this.setData({ serviceTimeSlot: e.currentTarget.dataset.slot });
  },

  // 选择地址
  onSelectAddress(e) {
    const id = e.currentTarget.dataset.id;
    const addr = this.data.addresses.find(a => a.id === id);
    if (addr) this.setData({ selectedAddress: addr });
  },

  // 添加新地址
  onAddAddress() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' });
  },

  // 输入备注
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  // 选择优惠券
  onSelectCoupon(e) {
    const id = e.currentTarget.dataset.id;
    const cp = this.data.myCoupons.find(c => c.id === id);
    if (cp) {
      let discount = 0;
      if (cp.type === 'amount') {
        discount = cp.discount_value;
      } else if (cp.type === 'rate') {
        discount = this.data.price * (1 - cp.discount_value / 100);
      }
      this.setData({
        selectedCoupon: cp,
        couponDiscount: discount,
        actualPrice: Math.max(0, this.data.price - discount)
      });
    }
  },

  // 下一步 / 提交订单
  onSubmitOrder() {
    const { step, selectedAddress, serviceDate, serviceTimeSlot, price, actualPrice, specText } = this.data;

    if (step === 1) {
      // 校验第一步信息
      if (!selectedAddress) {
        wx.showToast({ title: '请选择上门地址', icon: 'none' }); return;
      }
      if (!serviceDate) {
        wx.showToast({ title: '请选择服务日期', icon: 'none' }); return;
      }
      if (!serviceTimeSlot) {
        wx.showToast({ title: '请选择服务时段', icon: 'none' }); return;
      }
      this.setData({ step: 2 });
      return;
    }

    // 第二步：确认支付
    this.setData({ submitting: true });
    const orderNo = app.generateOrderNo();
    
    const loc = app.globalData.location || { lat: 31.2304, lng: 121.4737 };
    
    wx.cloud.callFunction({
      name: 'orderCreate',
      data: {
        orderNo,
        serviceId: parseInt(this.data.serviceId),
        addressId: selectedAddress.id,
        specInfo: JSON.stringify(this.data.specInfo),
        specText,
        price,
        actualPrice,
        serviceDate,
        serviceTimeSlot,
        remark: this.data.remark,
        couponId: this.data.selectedCoupon ? this.data.selectedCoupon.id : null,
        userLat: loc.lat,
        userLng: loc.lng
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.success) {
        // 请求支付确认
        wx.showModal({
          title: '确认支付',
          content: `订单金额：¥${actualPrice}\n订单编号：${orderNo}`,
          confirmText: '去支付',
          success: (modalRes) => {
            if (modalRes.confirm) {
              // 执行支付（更新pay_status并记录日志）
              wx.showLoading({ title: '支付中...' });
              wx.cloud.callFunction({
                name: 'dbExecute',
                data: {
                  sql: `UPDATE orders SET pay_status = 1, updated_at = NOW() WHERE order_no = '${orderNo}'`
                }
              }).then(updateRes => {
                // 检查UPDATE是否成功
                if (!updateRes.result || !updateRes.result.success) {
                  console.error('支付状态更新失败:', updateRes.result?.message);
                  throw new Error(updateRes.result?.message || '支付状态更新失败');
                }
                // 确认影响行数>0（说明确实更新了订单）
                if (updateRes.result.affectedRows !== undefined && updateRes.result.affectedRows === 0) {
                  console.error('支付更新未影响任何行，orderNo可能不匹配:', orderNo);
                  throw new Error('订单不存在或已支付');
                }
                // 记录支付日志
                return wx.cloud.callFunction({
                  name: 'dbExecute',
                  data: {
                    sql: `INSERT INTO order_logs (order_id, action, content, operator_type) 
                      SELECT id, 'pay', '用户完成支付', 'user' FROM orders WHERE order_no = '${orderNo}'`
                  }
                });
              }).then(logRes => {
                // 检查日志是否写入成功
                if (!logRes.result || !logRes.result.success) {
                  console.warn('支付日志写入失败:', logRes.result?.message);
                  // 日志失败不阻断主流程，支付状态已更新
                }
                wx.hideLoading();
                wx.showToast({ title: '支付成功', icon: 'success' });
                setTimeout(() => {
                  wx.redirectTo({ url: `/pages/order-detail/order-detail?orderNo=${orderNo}` });
                }, 1000);
              }).catch(err => {
                wx.hideLoading();
                console.error('支付更新失败:', err);
                wx.showToast({ title: '支付处理异常，请查看订单', icon: 'none' });
                setTimeout(() => {
                  wx.redirectTo({ url: `/pages/order-detail/order-detail?orderNo=${orderNo}` });
                }, 1500);
              });
            } else {
              // 用户取消支付，跳转到订单详情查看
              wx.redirectTo({ url: `/pages/order-detail/order-detail?orderNo=${orderNo}` });
            }
          },
          fail: () => {
            wx.redirectTo({ url: `/pages/order-detail/order-detail?orderNo=${orderNo}` });
          }
        });
      } else {
        wx.showToast({ title: res.result?.message || '下单失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '下单失败，请重试', icon: 'none' });
      console.error('下单失败:', err);
    }).finally(() => {
      this.setData({ submitting: false });
    });
  },

  // 返回上一步
  onPrevStep() {
    if (this.data.step === 2) {
      this.setData({ step: 1 });
    }
  }
});
