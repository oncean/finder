const store = require('./store/index');
const { login, checkLogin, updateMe } = require('./services/auth');
const { getCurrentLocation } = require('./utils/location');

App({
  globalData: {
    userInfo: null,
    location: null
  },

  async onLaunch() {
    console.log('App onLaunch');
    await this.checkLoginStatus();
    await this.initLocation();
  },

  async checkLoginStatus() {
    try {
      const token = wx.getStorageSync('token');
      console.log('检查登录状态, token:', token ? '存在' : '不存在');
      if (!token) {
        console.log('无token，等待用户手动登录');
        return;
      } else {
        console.log('有token，验证登录状态');
        try {
          const userInfo = await checkLogin();
          console.log('登录验证成功，用户信息:', userInfo);
          if (userInfo && userInfo.id) {
            this.globalData.userInfo = userInfo;
            store.set('userInfo', userInfo);
            console.log('用户信息已保存到全局和store');
          } else {
            console.error('登录验证返回无效用户信息:', userInfo);
            throw new Error('无效用户信息');
          }
        } catch (checkError) {
          console.error('checkLogin 失败:', checkError);
          wx.removeStorageSync('token');
        }
      }
    } catch (error) {
      console.error('登录检查失败:', error);
    }
  },

  async initLocation() {
    try {
      const location = await getCurrentLocation();
      console.log('获取到的位置信息:', location);
      this.globalData.location = location;
      store.set('location', location);
      
      const userInfo = this.globalData.userInfo;
      if (userInfo && location) {
        console.log('上传位置到服务器:', location);
        await updateMe({ location });
      }
    } catch (error) {
      console.error('获取位置失败:', error);
    }
  },

  async wxLogin(userInfo = null) {
    return new Promise((resolve, reject) => {
      console.log('开始微信登录');

      wx.login({
        success: async (res) => {
          console.log('wx.login 成功, code:', res.code);
          if (res.code) {
            try {
              let loginData = { 
                code: res.code
              };
              
              if (userInfo) {
                loginData.userInfo = userInfo;
              }
              
              const location = this.globalData.location;
              if (location) {
                loginData.location = location;
              }

              console.log('调用后端登录接口, 参数:', loginData);
              const result = await login(loginData);
              console.log('后端登录成功, 返回结果:', result);
              
              wx.setStorageSync('token', result.token);
              this.globalData.userInfo = result.user;
              store.set('userInfo', result.user);
              console.log('用户信息已保存:', result.user);
              resolve(result);
            } catch (error) {
              console.error('后端登录失败:', error);
              reject(error);
            }
          } else {
            console.error('wx.login 失败: 未返回code');
            reject(new Error('登录失败'));
          }
        },
        fail: (error) => {
          console.error('wx.login 调用失败:', error);
          reject(error);
        }
      });
    });
  },

  async silentLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: async (res) => {
          console.log('静默登录, code:', res.code);
          if (res.code) {
            try {
              const loginData = { 
                code: res.code
              };
              
              const location = this.globalData.location;
              if (location) {
                loginData.location = location;
              }

              const result = await login(loginData);
              console.log('静默登录成功:', result);
              
              wx.setStorageSync('token', result.token);
              this.globalData.userInfo = result.user;
              store.set('userInfo', result.user);
              resolve(result);
            } catch (error) {
              console.error('静默登录失败:', error);
              reject(error);
            }
          } else {
            reject(new Error('登录失败'));
          }
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  }
});
