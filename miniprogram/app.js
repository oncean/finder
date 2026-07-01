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
  },

  initCloud() {
    if (!CLOUD_ENV_ID || !wx.cloud) {
      return;
    }

    wx.cloud.init({
      env: CLOUD_ENV_ID
    });
    console.log('微信云托管环境已初始化:', CLOUD_ENV_ID);
  }
});
