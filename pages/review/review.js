// pages/review/review.js
Page({
  data: { orderNo: '', rating: 0, content: '', isAnonymous: false, submitting: false },

  onLoad(options) {
    this.setData({ orderNo: options.orderNo || '' });
  },

  onRate(e) {
    this.setData({ rating: parseInt(e.currentTarget.dataset.index) });
  },

  onInput(e) {
    this.setData({ content: e.detail.value });
  },

  onSwitchAnon(e) {
    this.setData({ isAnonymous: e.detail.value });
  },

  async onSubmit() {
    const { orderNo, rating, content, isAnonymous, submitting } = this.data;
    if (submitting) return;
    if (rating === 0) { wx.showToast({ title: '请评分', icon: 'none' }); return; }

    this.setData({ submitting: true });
    const esc = (s) => (s || '').replace(/'/g, "''");

    try {
      // 查询订单获取 service_id 和 worker_id
      const orderRes = await wx.cloud.callFunction({
        name: 'dbQuery',
        data: { sql: `SELECT id, service_id, worker_id, user_id FROM orders WHERE order_no = '${esc(orderNo)}'` }
      });

      const order = orderRes.result?.data?.[0];
      if (!order) { wx.showToast({ title: '订单不存在', icon: 'none' }); return; }

      // 插入评价
      await wx.cloud.callFunction({
        name: 'dbExecute',
        data: {
          sql: `INSERT INTO reviews (order_id, user_id, service_id, worker_id, rating, content, is_anonymous, status, created_at) 
                VALUES (${order.id}, ${order.user_id}, ${order.service_id}, ${order.worker_id || 'NULL'}, ${rating}, '${esc(content)}', ${isAnonymous ? 1 : 0}, 1, NOW())`
        }
      });

      // 更新订单状态为已完成
      await wx.cloud.callFunction({
        name: 'dbExecute',
        data: {
          sql: `UPDATE orders SET status = 'finished', finished_at = NOW(), updated_at = NOW() WHERE order_no = '${esc(orderNo)}'`
        }
      });

      // 记录日志
      await wx.cloud.callFunction({
        name: 'dbExecute',
        data: {
          sql: `INSERT INTO order_logs (order_id, action, content, operator_type) 
                SELECT id, 'review', '用户已评价', 'user' FROM orders WHERE order_no = '${esc(orderNo)}'`
        }
      });

      wx.showToast({ title: '评价成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (err) {
      console.error('评价失败:', err);
      wx.showToast({ title: '评价失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
