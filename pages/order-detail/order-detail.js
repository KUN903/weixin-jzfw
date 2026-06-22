// pages/order-detail/order-detail.js - 订单详情/跟踪
Page({
  data: {
    orderNo: '',
    order: {},
    statusText: '',
    statusSteps: [],
    currentStep: 0,
    canCancel: false,
    canPay: false,
    canConfirmComplete: false,
    canReview: false,
    orderLogs: []
  },

  onLoad(options) {
    const orderNo = options.orderNo || '';
    this.setData({ orderNo });
    this.loadOrderDetail(orderNo);
  },

  onShow() {
    if (this.data.orderNo) {
      this.loadOrderDetail(this.data.orderNo);
    }
  },

  async loadOrderDetail(orderNo) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: {
          sql: `SELECT o.*, s.name as service_name, s.price as service_price, s.unit,
                a.contact_name, a.contact_phone, a.detail as address_detail,
                w.name as worker_name, w.phone as worker_phone, w.avatar as worker_avatar
                FROM orders o
                LEFT JOIN service_products s ON o.service_id = s.id
                LEFT JOIN addresses a ON o.address_id = a.id
                LEFT JOIN workers w ON o.worker_id = w.id
                WHERE o.order_no = '${orderNo}'`
        }
      });
      if (res.result && res.result.data && res.result.data.length > 0) {
        const order = res.result.data[0];
        this.setData({ order });
        this.buildStatusSteps(order.status);
        this.setActionButtons(order.status);
        this.loadOrderLogs();
      }
    } catch (err) {
      console.error('加载订单详情失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
    wx.hideLoading();
  },

  async loadOrderLogs() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: {
          sql: `SELECT ol.action, ol.content, ol.created_at, ol.operator_type
                FROM order_logs ol
                INNER JOIN orders o ON ol.order_id = o.id
                WHERE o.order_no = '${this.data.orderNo}'
                ORDER BY ol.created_at DESC LIMIT 10`
        }
      });
      if (res.result && res.result.data) {
        this.setData({ orderLogs: res.result.data });
      }
    } catch (err) {
      console.error('加载日志失败:', err);
    }
  },

  buildStatusSteps(status) {
    const steps = [
      { label: '下单成功', key: 'created', done: true },
      { label: '师傅接单', key: 'accepted', done: ['accepted', 'serving', 'completed', 'finished'].includes(status) },
      { label: '开始服务', key: 'serving', done: ['serving', 'completed', 'finished'].includes(status) },
      { label: '服务完成', key: 'completed', done: ['completed', 'finished'].includes(status) },
      { label: '评价完成', key: 'finished', done: status === 'finished' }
    ];

    if (status === 'cancelled' || status === 'refunded') {
      steps.length = 0;
      steps.push({ label: '下单成功', key: 'created', done: true });
      steps.push({ label: '订单取消', key: 'cancelled', done: true, isEnd: true });
    }

    const statusMap = {
      'pending': '等待师傅接单',
      'accepted': '师傅已接单',
      'serving': '服务进行中',
      'completed': '服务完成，待评价',
      'finished': '已完成',
      'cancelled': '订单已取消',
      'refunded': '已退款'
    };

    let currentStep = 0;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].done) { currentStep = i; break; }
    }

    this.setData({
      statusSteps: steps,
      currentStep,
      statusText: statusMap[status] || status
    });
  },

  setActionButtons(status) {
    this.setData({
      canCancel: status === 'pending',
      canPay: status === 'pending' || (status === 'accepted' && this.data.order.pay_status === 0),
      canConfirmComplete: status === 'serving',
      canReview: status === 'completed'
    });
  },

  // ========== 操作按钮 ==========

  onCancelOrder() {
    wx.showModal({
      title: '取消订单',
      content: '确定要取消此订单吗？取消后优惠券将退回。',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' });
          try {
            const result = await wx.cloud.callFunction({
              name: 'orderCancel',
              data: { orderNo: this.data.orderNo, reason: '用户主动取消' }
            });
            wx.hideLoading();
            if (result.result && result.result.success) {
              wx.showToast({ title: '已取消', icon: 'success' });
              setTimeout(() => this.loadOrderDetail(this.data.orderNo), 1500);
            } else {
              wx.showToast({ title: result.result?.message || '取消失败', icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '网络错误', icon: 'none' });
          }
        }
      }
    });
  },

  onPayOrder() {
    wx.showModal({
      title: '确认支付',
      content: `确认支付 ¥${this.data.order.actual_price}？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '支付中...' });
          try {
            // 更新支付状态
            const updateRes = await wx.cloud.callFunction({
              name: 'dbExecute',
              data: {
                sql: `UPDATE orders SET pay_status = 1, updated_at = NOW() WHERE order_no = '${this.data.orderNo}'`
              }
            });
            if (!updateRes.result || !updateRes.result.success) {
              throw new Error(updateRes.result?.message || '支付状态更新失败');
            }
            // 确认影响行数>0
            if (updateRes.result.affectedRows !== undefined && updateRes.result.affectedRows === 0) {
              throw new Error('订单不存在或已支付');
            }
            // 记录支付日志
            const logRes = await wx.cloud.callFunction({
              name: 'dbExecute',
              data: {
                sql: `INSERT INTO order_logs (order_id, action, content, operator_type) 
                  SELECT id, 'pay', '用户完成支付', 'user' FROM orders WHERE order_no = '${this.data.orderNo}'`
              }
            });
            if (!logRes.result || !logRes.result.success) {
              console.warn('支付日志写入失败:', logRes.result?.message);
            }
            wx.hideLoading();
            wx.showToast({ title: '支付成功', icon: 'success' });
            setTimeout(() => this.loadOrderDetail(this.data.orderNo), 1500);
          } catch (err) {
            wx.hideLoading();
            console.error('支付失败:', err);
            wx.showToast({ title: '支付失败，请重试', icon: 'none' });
          }
        }
      }
    });
  },

  onStartService() {
    wx.showModal({
      title: '开始服务',
      content: '确认师傅已到达并开始服务？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          try {
            await wx.cloud.callFunction({
              name: 'dbExecute',
              data: {
                sql: `UPDATE orders SET status = 'serving', serving_at = NOW(), updated_at = NOW() WHERE order_no = '${this.data.orderNo}'`
              }
            });
            // 记录日志
            await wx.cloud.callFunction({
              name: 'dbExecute',
              data: {
                sql: `INSERT INTO order_logs (order_id, action, content, operator_type) 
                  SELECT id, 'start_service', '师傅开始服务', 'system' FROM orders WHERE order_no = '${this.data.orderNo}'`
              }
            });
            wx.hideLoading();
            wx.showToast({ title: '服务已开始', icon: 'success' });
            setTimeout(() => this.loadOrderDetail(this.data.orderNo), 1500);
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  onConfirmComplete() {
    wx.showModal({
      title: '确认服务完成',
      content: '确认服务已完成？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          try {
            await wx.cloud.callFunction({
              name: 'dbExecute',
              data: {
                sql: `UPDATE orders SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE order_no = '${this.data.orderNo}'`
              }
            });
            await wx.cloud.callFunction({
              name: 'dbExecute',
              data: {
                sql: `INSERT INTO order_logs (order_id, action, content, operator_type) 
                  SELECT id, 'complete', '服务已完成', 'system' FROM orders WHERE order_no = '${this.data.orderNo}'`
              }
            });
            wx.hideLoading();
            wx.showToast({ title: '确认完成', icon: 'success' });
            setTimeout(() => this.loadOrderDetail(this.data.orderNo), 1500);
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  onCallWorker() {
    const phone = this.data.order.worker_phone;
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone });
    } else {
      wx.showToast({ title: '暂无师傅信息', icon: 'none' });
    }
  },

  onCopyOrderNo() {
    wx.setClipboardData({ data: this.data.orderNo });
    wx.showToast({ title: '已复制', icon: 'success' });
  },

  onGoReview() {
    const { orderNo } = this.data;
    wx.navigateTo({ url: `/pages/review/review?orderNo=${orderNo}` });
  },

  onContactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-123-4567\n工作时间：9:00-21:00',
      showCancel: true,
      cancelText: '关闭',
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({ phoneNumber: '4001234567' });
        }
      }
    });
  },

  onGoBack() {
    wx.navigateBack({ delta: 1 });
  }
});
