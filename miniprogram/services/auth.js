const app = getApp();
const store = require('../store/index');

// 登录锁，防止多个 401 并发触发重复登录
let _isRefreshing = false;
let _retryQueue = [];

function login(data) {
  // 静默登录使用底层请求，不走 request 拦截器避免循环 401
  const { doRawRequest } = require('../utils/request');
  return doRawRequest({
    url: '/auth/login',
    method: 'POST',
    data
  });
}

function silentLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async (loginRes) => {
        try {
          const code = loginRes.code;
          const result = await login({ code });
          const data = result.data || result.result || result;
          wx.setStorageSync('token', data.token);
          if (data.user) {
            store.set('userInfo', data.user);
          }
          resolve(data.token);
        } catch (error) {
          console.error('静默登录失败:', error);
          reject(error);
        }
      },
      fail: (error) => {
        console.error('wx.login 失败:', error);
        reject(error);
      }
    });
  });
}

function handle401(options) {
  wx.removeStorageSync('token');

  if (_isRefreshing) {
    return new Promise((resolve, reject) => {
      _retryQueue.push({ resolve, reject, options });
    });
  }

  _isRefreshing = true;

  return silentLogin().then((newToken) => {
    _isRefreshing = false;
    wx.setStorageSync('token', newToken);
    const { doRawRequest, handleResponse } = require('../utils/request');
    _retryQueue.forEach((item) => {
      doRawRequest({
        url: item.options.url,
        method: item.options.method || 'GET',
        data: item.options.data,
        header: {
          'Authorization': 'Bearer ' + newToken,
          'content-type': 'application/json'
        }
      }).then((res) => handleResponse(res, item.resolve, item.reject))
        .catch((err) => item.reject(err));
    });
    _retryQueue = [];
    return newToken;
  }).catch((loginError) => {
    _isRefreshing = false;
    _retryQueue.forEach((item) => item.reject(loginError));
    _retryQueue = [];
    throw loginError;
  });
}

function checkLogin() {
  return require('../utils/request').get('/auth/me');
}

function updateMe(data) {
  return require('../utils/request').put('/auth/me', data);
}

module.exports = {
  login,
  silentLogin,
  handle401,
  checkLogin,
  updateMe
};
