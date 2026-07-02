const store = require('./store/index');
const {
  CLOUD_ENV_ID
} = require('./utils/config');

App({
  globalData: {
    userInfo: null,
    location: null,
    statusBarHeight: wx.getWindowInfo().statusBarHeight || 20
  },

  onLaunch() {
    console.log('App onLaunch');
    this.initCloud();
    this.checkLogin();
  },

  initCloud() {
    if (!CLOUD_ENV_ID || !wx.cloud) {
      return;
    }

    wx.cloud.init({
      env: CLOUD_ENV_ID
    });
    console.log('微信云托管环境已初始化:', CLOUD_ENV_ID);
  },

  checkLogin() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (!token || !userInfo) {
      wx.redirectTo({ url: '/pages/index/index' });
    }
  }
});
