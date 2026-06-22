// cloudfunctions/adminApi/index.js - 后台管理API（HTTP模式）
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: 'cloud1-d0gp6uby24f1cac99' });
const models = app.models;

exports.main = async (event, context) => {
  let params = event;

  // HTTP 模式下从 body 解析
  if (event.body) {
    try { params = JSON.parse(event.body); } catch(e) { params = event; }
  }

  const { action, data: d = {} } = params;

  // API路由表
  const routes = [
    'getDashboard', 'listServices', 'saveService', 'deleteService',
    'listCategories', 'saveCategory', 'deleteCategory',
    'listOrders', 'getOrderDetail', 'assignOrder', 'updateOrderStatus',
    'listWorkers', 'saveWorker', 'verifyWorker',
    'listUsers', 'listReviews',
    'listCoupons', 'saveCoupon',
    'listMerchants', 'saveMerchant'
  ];

  const sql = async (s) => {
    const res = await models.$runSQLRaw(s);
    return res.data?.executeResultList || res.data || [];
  };

  const handlers = {
    // 数据看板
    getDashboard: async () => {
      const [orderStats, todayStats, svcCnt, wkrCnt, userCnt] = await Promise.all([
        sql(`SELECT COUNT(*) as total, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending, SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END) as accepted, SUM(CASE WHEN status='serving' THEN 1 ELSE 0 END) as serving, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status='finished' THEN 1 ELSE 0 END) as finished, SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled, COALESCE(SUM(CASE WHEN status!='cancelled' AND status!='refunded' THEN actual_price ELSE 0 END),0) as total_amount FROM orders WHERE YEAR(created_at)=YEAR(NOW()) AND MONTH(created_at)=MONTH(NOW())`),
        sql(`SELECT COUNT(*) as today_orders, COALESCE(SUM(actual_price),0) as today_amount FROM orders WHERE DATE(created_at)=CURDATE()`),
        sql(`SELECT COUNT(*) as cnt FROM service_products WHERE status=1`),
        sql(`SELECT COUNT(*) as total, SUM(status=1) as online FROM workers`),
        sql(`SELECT COUNT(*) as cnt FROM users`)
      ]);
      return {
        orderStats: orderStats[0] || {},
        todayStats: todayStats[0] || {},
        serviceCount: svcCnt[0]?.cnt || 0,
        workerCount: wkrCnt[0]?.total || 0,
        workerOnline: wkrCnt[0]?.online || 0,
        userCount: userCnt[0]?.cnt || 0,
        incomeTrend: []
      };
    },

    // 服务管理
    listServices: async () => {
      const rows = await sql(`SELECT sp.*, c.name as category_name FROM service_products sp LEFT JOIN categories c ON sp.category_id=c.id ORDER BY sp.id DESC`);
      return { data: { list: rows, total: rows.length } };
    },

    saveService: async (d) => {
      const esc = s => (s||'').replace(/'/g,"''").replace(/\\/g,'\\\\');
      if (d.id) {
        await sql(`UPDATE service_products SET name='${esc(d.name)}',category_id=${d.category_id},price=${d.price},original_price=${d.original_price||'NULL'},unit='${esc(d.unit)}',description='${esc(d.description)}',service_flow='${esc(d.service_flow)}',notice='${esc(d.notice)}',duration=${d.duration},is_recommended=${d.is_recommended},status=${d.status} WHERE id=${d.id}`);
      } else {
        await sql(`INSERT INTO service_products (name,category_id,price,original_price,unit,description,service_flow,notice,duration,is_recommended,status,created_at) VALUES ('${esc(d.name)}',${d.category_id},${d.price},${d.original_price||'NULL'},'${esc(d.unit)}','${esc(d.description)}','${esc(d.service_flow)}','${esc(d.notice)}',${d.duration},${d.is_recommended},${d.status},NOW())`);
      }
      return { message: '保存成功' };
    },

    deleteService: async (d) => {
      await sql(`UPDATE service_products SET status=0 WHERE id=${d.id}`);
      return { message: '已下架' };
    },

    // 分类管理
    listCategories: async () => ({ data: await sql(`SELECT * FROM categories ORDER BY sort_order ASC`) }),

    saveCategory: async (d) => {
      const esc = s => (s||'').replace(/'/g,"''");
      if (d.id) {
        await sql(`UPDATE categories SET name='${esc(d.name)}',icon='${esc(d.icon)}',sort_order=${d.sort_order} WHERE id=${d.id}`);
      } else {
        await sql(`INSERT INTO categories (name,icon,sort_order) VALUES ('${esc(d.name)}','${esc(d.icon)}',${d.sort_order})`);
      }
      return { message: '保存成功' };
    },

    deleteCategory: async (d) => {
      await sql(`DELETE FROM categories WHERE id=${d.id}`);
      return { message: '已删除' };
    },

    // 订单管理
    listOrders: async (d) => {
      const page = d.page||1, ps = d.pageSize||20, off = (page-1)*ps;
      const where = d.status ? `WHERE o.status='${d.status}'` : '';
      const [rows, cnt] = await Promise.all([
        sql(`SELECT o.*,s.name as service_name,u.nickname as user_name,w.name as worker_name FROM orders o LEFT JOIN service_products s ON o.service_id=s.id LEFT JOIN users u ON o.user_id=u.id LEFT JOIN workers w ON o.worker_id=w.id ${where} ORDER BY o.created_at DESC LIMIT ${ps} OFFSET ${off}`),
        sql(`SELECT COUNT(*) as total FROM orders o ${where}`)
      ]);
      return { data: { list: rows, total: cnt[0]?.total||0 } };
    },

    getOrderDetail: async (d) => {
      const esc = s => (s||'').replace(/'/g,"''");
      const rows = await sql(`SELECT o.*, s.name as service_name, s.price as service_price, s.unit, u.nickname as user_name, u.phone as user_phone, w.name as worker_name, w.phone as worker_phone, a.contact_name, a.contact_phone, a.detail as address_detail FROM orders o LEFT JOIN service_products s ON o.service_id = s.id LEFT JOIN users u ON o.user_id = u.id LEFT JOIN workers w ON o.worker_id = w.id LEFT JOIN addresses a ON o.address_id = a.id WHERE o.order_no = '${esc(d.orderNo)}'`);
      return { data: rows[0] || null };
    },

    assignOrder: async (d) => {
      const esc = s => (s||'').replace(/'/g,"''");
      await sql(`UPDATE orders SET worker_id=${d.workerId},status='accepted',accepted_at=NOW() WHERE order_no='${esc(d.orderNo)}'`);
      await sql(`INSERT INTO order_logs (order_id, action, content, operator_type) SELECT id, 'admin_assign', '管理员派单', 'system' FROM orders WHERE order_no='${esc(d.orderNo)}'`);
      return { message: '派单成功' };
    },

    updateOrderStatus: async (d) => {
      const esc = s => (s||'').replace(/'/g,"''");
      const reason = d.reason ? esc(d.reason) : '';
      const sets = [`status='${esc(d.status)}'`, `updated_at=NOW()`];
      if (d.status === 'cancelled') sets.push(`cancel_reason='${reason}'`);
      if (d.status === 'completed') sets.push(`completed_at=NOW()`);
      if (d.status === 'finished') sets.push(`finished_at=NOW()`);
      await sql(`UPDATE orders SET ${sets.join(',')} WHERE order_no='${esc(d.orderNo)}'`);
      await sql(`INSERT INTO order_logs (order_id, action, content, operator_type) SELECT id, 'admin_update', '管理员更新状态为${esc(d.status)}${reason?' - '+reason:''}', 'system' FROM orders WHERE order_no='${esc(d.orderNo)}'`);
      return { message: '状态已更新' };
    },

    // 师傅管理
    listWorkers: async () => ({ data: await sql(`SELECT * FROM workers ORDER BY id DESC`) }),

    saveWorker: async (d) => {
      const esc = s => (s||'').replace(/'/g,"''");
      if (d.id) {
        await sql(`UPDATE workers SET name='${esc(d.name)}',phone='${esc(d.phone)}',city='${esc(d.city)}',district='${esc(d.district)}',intro='${esc(d.intro)}',service_category_ids='${esc(d.service_category_ids)}',status=${d.status} WHERE id=${d.id}`);
      } else {
        await sql(`INSERT INTO workers (name,phone,city,district,intro,service_category_ids,status,verify_status,rating,created_at) VALUES ('${esc(d.name)}','${esc(d.phone)}','${esc(d.city)}','${esc(d.district)}','${esc(d.intro)}','${esc(d.service_category_ids)}',${d.status},1,5.0,NOW())`);
      }
      return { message: '保存成功' };
    },

    verifyWorker: async (d) => {
      await sql(`UPDATE workers SET verify_status=${d.verify_status} WHERE id=${d.id}`);
      return { message: '已更新认证状态' };
    },

    // 用户/评价/优惠券/商家管理
    listUsers: async () => ({ data: await sql(`SELECT * FROM users ORDER BY created_at DESC`) }),
    listReviews: async () => ({ data: await sql(`SELECT r.*,u.nickname,s.name as service_name FROM reviews r LEFT JOIN users u ON r.user_id=u.id LEFT JOIN service_products s ON r.service_id=s.id ORDER BY r.created_at DESC`) }),
    listCoupons: async () => ({ data: await sql(`SELECT * FROM coupons ORDER BY id DESC`) }),

    saveCoupon: async (d) => {
      const esc = s => (s||'').replace(/'/g,"''");
      if (d.id) {
        await sql(`UPDATE coupons SET name='${esc(d.name)}',type='${esc(d.type)}',discount_value=${d.discount_value},condition_price=${d.condition_price},total_count=${d.total_count},valid_days=${d.valid_days} WHERE id=${d.id}`);
      } else {
        await sql(`INSERT INTO coupons (name,type,discount_value,condition_price,total_count,issued_count,valid_days,status) VALUES ('${esc(d.name)}','${esc(d.type)}',${d.discount_value},${d.condition_price},${d.total_count},0,${d.valid_days},1)`);
      }
      return { message: '保存成功' };
    },

    listMerchants: async () => ({ data: await sql(`SELECT * FROM merchants ORDER BY id DESC`) }),

    saveMerchant: async (d) => {
      const esc = s => (s||'').replace(/'/g,"''");
      if (d.id) {
        await sql(`UPDATE merchants SET name='${esc(d.name)}',phone='${esc(d.phone)}',city='${esc(d.city)}',address='${esc(d.address)}',status=${d.status} WHERE id=${d.id}`);
      } else {
        await sql(`INSERT INTO merchants (name,phone,city,address,status,created_at) VALUES ('${esc(d.name)}','${esc(d.phone)}','${esc(d.city)}','${esc(d.address)}',${d.status},NOW())`);
      }
      return { message: '保存成功' };
    }
  };

  if (!action || !routes.includes(action)) {
    return { success: false, message: `未知操作: ${action}` };
  }

  const handler = handlers[action];
  if (!handler) {
    return { success: false, message: `处理函数未定义: ${action}` };
  }

  try {
    const result = await handler(d);
    return { success: true, ...result };
  } catch (err) {
    console.error(`adminApi/${action} error:`, err);
    return { success: false, message: err.message || '服务器内部错误' };
  }
};
