// cloudfunctions/orderStateManager/index.js - 订单状态定时管理
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: 'cloud1-d0gp6uby24f1cac99' });
const models = app.models;

exports.main = async (event, context) => {
  const run = async (s) => {
    try { const r = await models.$runSQLRaw(s); return r; }
    catch(e) { console.error('SQL error:', e); return { data: [] }; }
  };
  const results = [];

  // 1. 超时未支付 -> 取消（30分钟）
  const r1 = await run(`UPDATE orders SET status = 'cancelled', cancel_reason = '超时未支付', updated_at = NOW() WHERE status = 'pending' AND pay_status = 0 AND TIMESTAMPDIFF(MINUTE, created_at, NOW()) > 30`);
  results.push({ action: 'auto_cancel_unpaid', affected: r1.affected_rows || 0 });

  if (r1.affected_rows > 0) {
    await run("INSERT INTO order_logs (order_id, action, content, operator_type) SELECT id, 'auto_cancel', '系统自动取消：超时未支付', 'system' FROM orders WHERE status = 'cancelled' AND cancel_reason = '超时未支付' AND updated_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)");
  }

  // 2. 到预约日期且已支付 -> 开始服务
  const r2 = await run(`UPDATE orders SET status = 'serving', serving_at = NOW(), updated_at = NOW() WHERE status = 'accepted' AND pay_status = 1 AND service_date <= CURDATE()`);
  results.push({ action: 'auto_start_serving', affected: r2.affected_rows || 0 });

  if (r2.affected_rows > 0) {
    await run("INSERT INTO order_logs (order_id, action, content, operator_type) SELECT id, 'auto_start_serving', '系统自动开始服务', 'system' FROM orders WHERE status = 'serving' AND serving_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)");
  }

  // 3. 服务超时 -> 自动完成（8小时）
  const r3 = await run(`UPDATE orders SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE status = 'serving' AND serving_at IS NOT NULL AND TIMESTAMPDIFF(MINUTE, serving_at, NOW()) > 480`);
  results.push({ action: 'auto_complete_timeout', affected: r3.affected_rows || 0 });

  if (r3.affected_rows > 0) {
    await run("INSERT INTO order_logs (order_id, action, content, operator_type) SELECT id, 'auto_complete', '系统自动完成（超时）', 'system' FROM orders WHERE status = 'completed' AND completed_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)");
  }

  // 4. 完成3天未评价 -> 自动完结
  const r4 = await run(`UPDATE orders SET status = 'finished', finished_at = NOW(), updated_at = NOW() WHERE status = 'completed' AND completed_at IS NOT NULL AND TIMESTAMPDIFF(DAY, completed_at, NOW()) >= 3`);
  results.push({ action: 'auto_finish', affected: r4.affected_rows || 0 });

  if (r4.affected_rows > 0) {
    await run("INSERT INTO order_logs (order_id, action, content, operator_type) SELECT id, 'auto_finish', '系统自动完成（超时未评价）', 'system' FROM orders WHERE status = 'finished' AND finished_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)");
  }

  // 5. 超时未被接单 -> 取消
  const r5 = await run(`UPDATE orders SET status = 'cancelled', cancel_reason = '超时未被接单', updated_at = NOW() WHERE status = 'pending' AND service_date < CURDATE() AND created_at < DATE_SUB(NOW(), INTERVAL 1 DAY)`);
  results.push({ action: 'auto_cancel_no_accept', affected: r5.affected_rows || 0 });

  // 6. 更新服务销量和评分
  await run(`UPDATE service_products sp SET sales = (SELECT COUNT(*) FROM orders o WHERE o.service_id = sp.id AND o.status NOT IN ('cancelled', 'refunded')), rating = (SELECT COALESCE(AVG(r.rating), 5.0) FROM reviews r WHERE r.service_id = sp.id) WHERE sp.id > 0`);
  results.push({ action: 'update_sales_rating', status: 'done' });

  // 7. 更新师傅统计
  await run(`UPDATE workers w SET total_orders = (SELECT COUNT(*) FROM orders o WHERE o.worker_id = w.id AND o.status IN ('accepted', 'serving', 'completed', 'finished')), good_rate = COALESCE((SELECT AVG(r.rating) / 5 * 100 FROM reviews r WHERE r.worker_id = w.id), 100), rating = COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.worker_id = w.id), 5.0) WHERE w.id > 0`);
  results.push({ action: 'update_worker_stats', status: 'done' });

  // 8. 更新商家统计
  await run(`UPDATE merchants m SET total_orders = (SELECT COUNT(*) FROM orders o WHERE o.merchant_id = m.id AND o.status NOT IN ('cancelled', 'refunded')) WHERE m.id > 0`);
  results.push({ action: 'update_merchant_stats', status: 'done' });

  return { success: true, results };
};
