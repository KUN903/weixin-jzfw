// cloudfunctions/dbQuery/index.js - 只读SQL查询
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: 'cloud1-d0gp6uby24f1cac99' });
const models = app.models;

exports.main = async (event, context) => {
  const { sql } = event;

  // 安全检查：只允许 SELECT 语句
  if (!sql || !sql.trim().toUpperCase().startsWith('SELECT')) {
    return { success: false, message: '仅支持SELECT查询' };
  }

  try {
    const result = await models.$runSQLRaw(sql);
    const rows = result.data?.executeResultList || result.data || [];
    const total = result.data?.total || result.total || (Array.isArray(rows) ? rows.length : 0);
    return { success: true, data: rows, total };
  } catch (err) {
    console.error('dbQuery error:', err);
    return { success: false, message: err.message || '查询失败', data: [] };
  }
};
