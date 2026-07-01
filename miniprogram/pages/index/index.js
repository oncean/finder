const app = getApp();
const { getCurrentLocation } = require('../../utils/location');
const store = require('../../store/index');
const { login } = require('../../services/auth');

Page({
  data: {
    loading: false
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
      const code = await this.getWxCode();
      if (!code) {
        throw new Error('登录失败');
      }

      let loginData = { code };

      const location = app.globalData.location;
      if (location) {
        loginData.location = location;
      }

      console.log('调用后端登录接口, 参数:', loginData);
      const result = await login(loginData);
      console.log('后端登录成功, 返回结果:', result);

      wx.setStorageSync('token', result.token);
      app.globalData.userInfo = result.user;
      store.set('userInfo', result.user);
      
      this.setData({ loading: false });
    } catch (error) {
      console.error('登录失败:', error);
      this.setData({ loading: false });
    }
  },

  getWxCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          console.log('wx.login 成功, code:', res.code);
          resolve(res.code);
        },
        fail: (error) => {
          console.error('wx.login 调用失败:', error);
          reject(error);
        }
      });
    });
  },

  onEnter() {
    wx.redirectTo({
      url: '/pages/chat/chat'
    });
  }
});