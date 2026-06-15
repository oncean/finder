const store = require('./store/index');
const { checkLogin } = require('./services/auth');

App({
  globalData: {
    userInfo: null,
    location: null,
    systemInfo: null
  },

  onLaunch() {
    this.getSystemInfo();
    this.checkLoginStatus();
  },

  // 获取系统信息
  getSystemInfo() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
      }
    });
  },

  // 检查登录状态
  async checkLoginStatus() {
    try {
      const token = wx.getStorageSync('token');
      if (!token) {
        await this.wxLogin();
      } else {
        const userInfo = await checkLogin();
        this.globalData.userInfo = userInfo;
        store.set('userInfo', userInfo);
      }
    } catch (error) {
      console.error('登录检查失败:', error);
      await this.wxLogin();
    }
  },

  // 微信登录
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: async (res) => {
          if (res.code) {
            try {
              const { login } = require('./services/auth');
              const result = await login(res.code);
              wx.setStorageSync('token', result.token);
              this.globalData.userInfo = result.user;
              store.set('userInfo', result.user);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          } else {
            reject(new Error('登录失败'));
          }
        },
        fail: reject
      });
    });
  }
});
