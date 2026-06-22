// cloudfunctions/dbExecute/index.js - 写操作SQL
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: 'cloud1-d0gp6uby24f1cac99' });
const models = app.models;

exports.main = async (event, context) => {
  const { sql } = event;

  if (!sql || !sql.trim()) {
    return { success: false, message: 'SQL不能为空' };
  }

  // 禁止危险操作
  const upper = sql.trim().toUpperCase();
  const blocked = ['DROP DATABASE', 'DROP TABLE', 'TRUNCATE', 'ALTER TABLE'];
  for (const word of blocked) {
    if (upper.startsWith(word)) {
      return { success: false, message: `不允许执行 ${word} 操作` };
    }
  }

  try {
    const result = await models.$runSQLRaw(sql);
    const rows = result.data?.executeResultList || result.data || result;
    // 尝试提取受影响行数
    let affectedRows = -1;
    if (result.data?.affectedRows !== undefined) {
      affectedRows = result.data.affectedRows;
    } else if (Array.isArray(rows) && rows.length > 0 && rows[0].affectedRows !== undefined) {
      affectedRows = rows[0].affectedRows;
    }
    return { success: true, message: '执行成功', affectedRows };
  } catch (err) {
    console.error('dbExecute error:', err);
    return { success: false, message: err.message || '执行失败' };
  }
};
