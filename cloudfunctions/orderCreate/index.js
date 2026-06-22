// cloudfunctions/orderCreate/index.js - 订单创建
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: 'cloud1-d0gp6uby24f1cac99' });
const models = app.models;

exports.main = async (event, context) => {
  let { userId, serviceId, addressId, serviceDate, serviceTimeSlot, couponId, remark, orderNo, price: clientPrice, userLat, userLng } = event;

  if (!userId) userId = 1; // 默认用户ID（TODO: 对接真实登录）
  const rows = (r) => r.data?.executeResultList || r.data || [];

  try {
    // 1. 查询服务信息
    const svcRes = await models.$runSQLRaw(`SELECT id, name, price, unit, duration, category_id, merchant_id FROM service_products WHERE id = ${serviceId} AND status = 1`);
    const service = rows(svcRes)[0];
    if (!service) return { success: false, message: '服务不存在' };

    // 2. 查询地址
    const addrRes = await models.$runSQLRaw(`SELECT id, city, district FROM addresses WHERE id = ${addressId}`);
    const address = rows(addrRes)[0];
    if (!address) return { success: false, message: '地址不存在' };

    // 3. 计算价格
    let price = clientPrice || service.price || 99;
    let discount = 0;

    // 处理优惠券
    if (couponId) {
      couponId = parseInt(couponId);
      const cpnRes = await models.$runSQLRaw(`SELECT * FROM coupons WHERE id = ${couponId} AND status = 1`);
      const coupon = rows(cpnRes)[0];
      if (!coupon) return { success: false, message: '优惠券无效' };

      const validRes = await models.$runSQLRaw(
        `SELECT * FROM user_coupons WHERE user_id = ${userId} AND coupon_id = ${couponId} AND status = 0 AND expired_at > NOW() LIMIT 1`
      );
      const userCoupon = rows(validRes)[0];
      if (!userCoupon) return { success: false, message: '优惠券不可用' };

      if (price >= (coupon.condition_price || 0)) {
        if (coupon.type === 'amount') {
          discount = Math.min(coupon.discount_value, price);
        } else if (coupon.type === 'rate') {
          discount = price * (1 - coupon.discount_value / 100);
        }
        discount = Math.round(discount * 100) / 100;
      }
    }

    const actualPrice = Math.max(0, price - discount);

    // 4. 寻找最佳师傅（优先同区同服务类别，按距离排序）
    let workerId = null;
    const escDist = (addr.district||'').replace(/'/g,"''");
    
    if (userLat && userLng) {
      // 有用户坐标：用 Haversine 公式按距离排序
      const distSql = `SELECT id FROM workers WHERE status = 1 AND verify_status = 1 AND district = '${escDist}' AND service_category_ids LIKE '%${service.category_id}%' ORDER BY (6371 * acos(cos(radians(${userLat})) * cos(radians(lat)) * cos(radians(lng) - radians(${userLng})) + sin(radians(${userLat})) * sin(radians(lat)))) ASC, total_orders ASC LIMIT 1`;
      const distRes = await models.$runSQLRaw(distSql);
      const nearWorker = rows(distRes)[0];
      
      if (nearWorker) {
        workerId = nearWorker.id;
      } else {
        // 同区没找到，不限区按距离最近
        const allDistRes = await models.$runSQLRaw(`SELECT id FROM workers WHERE status = 1 AND verify_status = 1 AND service_category_ids LIKE '%${service.category_id}%' ORDER BY (6371 * acos(cos(radians(${userLat})) * cos(radians(lat)) * cos(radians(lng) - radians(${userLng})) + sin(radians(${userLat})) * sin(radians(lat)))) ASC, total_orders ASC LIMIT 1`);
        workerId = rows(allDistRes)[0]?.id || null;
      }
    } else {
      // 无坐标：降级为原有逻辑
      const wkrSql = `SELECT id FROM workers WHERE status = 1 AND verify_status = 1 AND district = '${escDist}' AND service_category_ids LIKE '%${service.category_id}%' ORDER BY total_orders ASC LIMIT 1`;
      const wkrRes = await models.$runSQLRaw(wkrSql);
      workerId = rows(wkrRes)[0]?.id || null;
    }
    
    // 最终兜底
    if (!workerId) {
      const anyRes = await models.$runSQLRaw(`SELECT id FROM workers WHERE status = 1 AND verify_status = 1 ORDER BY total_orders ASC LIMIT 1`);
      workerId = rows(anyRes)[0]?.id || null;
    }

    // 5. 使用客户端提供的订单号或生成新的
    if (!orderNo) {
      const now = new Date();
      orderNo = 'JZ' + [
        now.getFullYear(),
        String(now.getMonth()+1).padStart(2,'0'),
        String(now.getDate()).padStart(2,'0'),
        String(now.getHours()).padStart(2,'0'),
        String(now.getMinutes()).padStart(2,'0'),
        String(now.getSeconds()).padStart(2,'0'),
        String(Math.floor(Math.random()*10000)).padStart(4,'0')
      ].join('');
    }

    const status = workerId ? 'accepted' : 'pending'; // 有师傅就直接接单

    // 6. 创建订单
    const esc = s => (s || '').replace(/'/g, "''").replace(/\\/g, '\\\\');
    await models.$runSQLRaw(`INSERT INTO orders (order_no, user_id, service_id, address_id, worker_id, merchant_id, service_date, service_time_slot, price, discount, actual_price, coupon_id, status, pay_status, remark, created_at, updated_at) VALUES ('${orderNo}', ${userId}, ${serviceId}, ${addressId}, ${workerId || 'NULL'}, ${service.merchant_id || 'NULL'}, '${esc(serviceDate)}', '${esc(serviceTimeSlot)}', ${price}, ${discount}, ${actualPrice}, ${couponId || 'NULL'}, '${status}', 0, '${esc(remark)}', NOW(), NOW())`);

    // 7. 核销优惠券
    if (couponId) {
      await models.$runSQLRaw(`UPDATE user_coupons SET status = 1, used_at = NOW() WHERE user_id = ${userId} AND coupon_id = ${couponId} AND status = 0 LIMIT 1`);
    }

    // 8. 记录日志
    await models.$runSQLRaw(`INSERT INTO order_logs (order_id, action, content, operator_type) SELECT id, 'create', '用户创建订单', 'user' FROM orders WHERE order_no = '${orderNo}'`);

    if (status === 'accepted') {
      await models.$runSQLRaw(`INSERT INTO order_logs (order_id, action, content, operator_type) SELECT id, 'accept', '系统自动分配师傅', 'system' FROM orders WHERE order_no = '${orderNo}'`);
    }

    // 9. 查询完整订单返回
    const orderRes = await models.$runSQLRaw(`SELECT o.*, s.name as service_name, a.detail as address_detail FROM orders o LEFT JOIN service_products s ON o.service_id = s.id LEFT JOIN addresses a ON o.address_id = a.id WHERE o.order_no = '${orderNo}'`);
    return { success: true, data: rows(orderRes)[0] };
  } catch (err) {
    console.error('orderCreate error:', err);
    return { success: false, message: err.message };
  }
};
