// app.js - 家政上门服务平台
App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d0gp6uby24f1cac99',
        traceUser: true
      });
    }

    // 恢复角色信息
    this.globalData.role = wx.getStorageSync('app_role') || 'user';
    this.globalData.workerId = wx.getStorageSync('workerId') || null;
    this.globalData.token = wx.getStorageSync('token') || null;

    // 获取用户授权定位
    this.getUserLocation();

    // 微信登录
    this.doLogin();
  },

  // 微信登录
  doLogin() {
    wx.login({
      success: (res) => {
        if (res.code) {
          // 调用云函数登录
          wx.cloud.callFunction({
            name: 'userLogin',
            data: { code: res.code }
          }).then(result => {
            if (result.result && result.result.data) {
              this.globalData.userInfo = result.result.data;
              this.globalData.isLogin = true;
              // 触发登录成功回调
              if (this.loginCallback) this.loginCallback();
            }
          }).catch(err => {
            console.error('登录失败:', err);
          });
        }
      }
    });
  },

  // 获取用户位置（含逆地理编码）
  getUserLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const lat = res.latitude;
        const lng = res.longitude;
        this.globalData.location = { lat, lng };
        // 逆地理编码获取城市+区名
        this.reverseGeocode(lat, lng);
      },
      fail: (err) => {
        console.warn('定位失败:', err);
        // 默认位置：上海
        this.globalData.location = { lat: 31.2304, lng: 121.4737 };
        this.globalData.city = '上海市';
        // 通知页面定位完成（即使失败也用默认值）
        if (this._locationCallbacks) {
          this._locationCallbacks.forEach(cb => cb());
          this._locationCallbacks = null;
        }
      }
    });
  },

  // 逆地理编码：坐标 → 城市/区
  reverseGeocode(lat, lng) {
    // 微信内置逆地理编码（需在微信公众平台开通"腾讯定位服务"插件）
    // 降级方案：通过腾讯地图免费API
    const key = 'WWDBZ-6SKEF-25RJ5-JYX5V-CRKX6-CXBCF'; // 腾讯地图WebService Key（demo用）
    wx.request({
      url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&key=${key}&get_poi=0`,
      success: (res) => {
        if (res.data && res.data.status === 0) {
          const ad = res.data.result.ad_info;
          const city = ad.city.replace('市', '') || '上海';
          const district = ad.district || '';
          this.globalData.city = city;
          this.globalData.district = district;
        }
      },
      fail: () => {
        this.globalData.city = '上海市';
      },
      complete: () => {
        // 通知等待中的页面
        if (this._locationCallbacks) {
          this._locationCallbacks.forEach(cb => cb());
          this._locationCallbacks = null;
        }
      }
    });
  },

  // 异步获取位置（页面可await）
  getLocationAsync() {
    return new Promise((resolve) => {
      // 已有位置直接返回
      if (this.globalData.city && this.globalData.city !== '定位中...') {
        resolve(this.globalData.location);
        return;
      }
      // 等待定位完成
      if (!this._locationCallbacks) this._locationCallbacks = [];
      this._locationCallbacks.push(() => {
        resolve(this.globalData.location);
      });
    });
  },

  // 获取用户信息（公开方法，页面调用）
  getUserProfile(callback) {
    if (this.globalData.isLogin) {
      callback && callback(this.globalData.userInfo);
      return;
    }
    this.loginCallback = () => {
      callback && callback(this.globalData.userInfo);
    };
  },

  // 生成订单号
  generateOrderNo() {
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    const h = now.getHours().toString().padStart(2, '0');
    const mi = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `JZ${y}${m}${d}${h}${mi}${s}${r}`;
  },

  globalData: {
    userInfo: null,
    isLogin: false,
    location: { lat: 31.2304, lng: 121.4737 },
    city: '上海市',
    district: '',
    loginCallback: null,
    role: 'user', // user | worker | admin
    workerId: null  // 师傅端对应的 workers 表 ID
  },

  // 切换角色
  switchRole(role) {
    this.globalData.role = role;
    wx.setStorageSync('app_role', role);
  },

  // 获取当前角色
  getRole() {
    return this.globalData.role || wx.getStorageSync('app_role') || 'user';
  }
});
