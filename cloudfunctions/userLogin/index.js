// cloudfunctions/userLogin/index.js - 用户登录
const cloud = require('wx-server-sdk');
const cloudbase = require('@cloudbase/node-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const cbApp = cloudbase.init({ env: 'cloud1-d0gp6uby24f1cac99' });
const models = cbApp.models;

exports.main = async (event, context) => {
  const { code } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, message: '无法获取openid，请确保小程序已绑定云开发环境' };
  }

  if (!code) {
    return { success: false, message: '缺少code' };
  }

  try {
    // 查询或创建用户
    const rawToRows = (r) => r.data?.executeResultList || r.data || [];
    const userResRaw = await models.$runSQLRaw(`SELECT * FROM users WHERE openid = '${openid.replace(/'/g, "''")}'`);
    let user = rawToRows(userResRaw)[0];

    if (!user) {
      await models.$runSQLRaw(`INSERT INTO users (openid, nickname, avatar, created_at) VALUES ('${openid.replace(/'/g, "''")}', '微信用户', '', NOW())`);
      const newRes = await models.$runSQLRaw(`SELECT * FROM users WHERE openid = '${openid.replace(/'/g, "''")}'`);
      user = rawToRows(newRes)[0];
    }

    return { success: true, data: user };
  } catch (err) {
    console.error('userLogin error:', err);
    return { success: false, message: err.message };
  }
};
