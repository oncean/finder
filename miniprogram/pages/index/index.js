const app = getApp();
const { getCurrentLocation } = require('../../utils/location');
const store = require('../../store/index');
const { silentLogin } = require('../../services/auth');

Page({
  data: {
    loading: false,
    loggedIn: false
  },

  onLoad() {
    this.init();
  },

  async init() {
    try {
      await this.initLocation();
      await this.doLogin();
    } catch (error) {
      console.error('初始化失败:', error);
    }
  },

  async initLocation() {
    try {
      const location = await getCurrentLocation();
      console.log('获取位置成功:', location);
      app.globalData.location = location;
      store.set('location', location);
    } catch (error) {
      console.warn('获取位置失败，使用默认位置:', error);
      const defaultLocation = {
        lat: 32.0603,
        lng: 118.7969,
        city: '南京市'
      };
      app.globalData.location = defaultLocation;
      store.set('location', defaultLocation);
    }
  },

  async doLogin() {
    this.setData({ loading: true });

    try {
      await silentLogin();
      this.setData({ loading: false, loggedIn: true });
    } catch (error) {
      console.error('登录失败:', error);
      this.setData({ loading: false, loggedIn: false });
    }
  },

  onEnter() {
    if (!this.data.loggedIn) {
      return;
    }
    wx.redirectTo({
      url: '/pages/home/home'
    });
  }
});
