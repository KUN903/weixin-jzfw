// cloudfunctions/orderCancel/index.js - 订单取消
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: 'cloud1-d0gp6uby24f1cac99' });
const models = app.models;

exports.main = async (event, context) => {
  const { orderNo, reason = '用户取消' } = event;

  if (!orderNo) return { success: false, message: '缺少订单号' };
  const rows = (r) => r.data?.executeResultList || r.data || [];

  try {
    const esc = s => (s || '').replace(/'/g, "''");
    
    // 查询订单
    const orderRes = await models.$runSQLRaw(`SELECT * FROM orders WHERE order_no = '${esc(orderNo)}'`);
    const order = rows(orderRes)[0];
    if (!order) return { success: false, message: '订单不存在' };

    // 只能取消 pending/accepted 状态的订单
    if (!['pending', 'accepted'].includes(order.status)) {
      return { success: false, message: `订单状态为"${order.status}"，无法取消` };
    }

    // 更新订单状态
    await models.$runSQLRaw(`UPDATE orders SET status = 'cancelled', cancel_reason = '${esc(reason)}', updated_at = NOW() WHERE order_no = '${esc(orderNo)}'`);

    // 退还优惠券
    if (order.coupon_id) {
      await models.$runSQLRaw(`UPDATE user_coupons SET status = 0, used_at = NULL WHERE id = (SELECT id FROM (SELECT uc.id FROM user_coupons uc WHERE uc.user_id = ${order.user_id} AND uc.coupon_id = ${order.coupon_id} AND uc.status = 1 ORDER BY uc.used_at DESC LIMIT 1) t)`);
    }

    // 记录日志
    await models.$runSQLRaw(`INSERT INTO order_logs (order_id, action, content, operator_type) SELECT id, 'cancel', '${esc(reason)}', 'user' FROM orders WHERE order_no = '${esc(orderNo)}'`);

    return { success: true, message: '取消成功' };
  } catch (err) {
    console.error('orderCancel error:', err);
    return { success: false, message: err.message };
  }
};
