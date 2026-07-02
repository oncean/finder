const {
  API_URL,
  CLOUD_ENV_ID,
  CLOUD_SERVICE,
  USE_CLOUD_CONTAINER
} = require('./config');

const { handle401 } = require('../services/auth');

function doRawRequest(options) {
  return new Promise((resolve, reject) => {
    const method = options.method || 'GET';
    const data = options.data;
    const header = options.header || { 'content-type': 'application/json' };

    if (shouldUseCloudContainer()) {
      wx.cloud.callContainer({
        config: { env: CLOUD_ENV_ID },
        path: `/api/v1${options.url}`,
        method: method,
        data: data,
        header: {
          ...header,
          'X-WX-SERVICE': CLOUD_SERVICE
        },
        success: (res) => resolve(res),
        fail: (err) => reject(err)
      });
      return;
    }

    wx.request({
      url: API_URL + options.url,
      method: method,
      data: data,
      header: header,
      success: (res) => resolve(res),
      fail: (err) => reject(err)
    });
  });
}

function request(options) {
  const token = wx.getStorageSync('token');
  const header = {
    'Authorization': token ? 'Bearer ' + token : '',
    'content-type': 'application/json'
  };

  return doRawRequest({
    url: options.url,
    method: options.method || 'GET',
    data: options.data,
    header
  }).then((res) => {
    return new Promise((resolve, reject) => {
      handleResponse(res, resolve, reject);
    });
  }).catch((error) => {
    if (error && error.statusCode === 401) {
      return handle401(options).then((newToken) => {
        // 用新 token 重试当前请求
        return request(options);
      });
    }
    throw error;
  });
}

function handleResponse(res, resolve, reject) {
  // 401 登录过期 — 返回带 statusCode 的错误，由外层处理
  if (res.statusCode === 401) {
    const err = new Error('登录已过期');
    err.statusCode = 401;
    reject(err);
    return;
  }

  // HTTP 状态码错误
  if (res.statusCode < 200 || res.statusCode >= 300) {
    const msg = res.data && res.data.message ? res.data.message : '请求失败';
    wx.showToast({ title: msg, icon: 'none' });
    reject(new Error(msg));
    return;
  }

  // 业务错误（后端返回 { code, message }）
  if (res.data && res.data.code !== undefined) {
    const msg = res.data.message || '请求失败';
    wx.showToast({ title: msg, icon: 'none' });
    reject(res.data);
    return;
  }

  // 成功：直接返回后端响应体
  resolve(res.data);
}

function shouldUseCloudContainer() {
  return !!(
    USE_CLOUD_CONTAINER &&
    CLOUD_ENV_ID &&
    CLOUD_SERVICE &&
    wx.cloud &&
    wx.cloud.callContainer
  );
}

module.exports = {
  get: (url, data) => request({ url, method: 'GET', data }),
  post: (url, data) => request({ url, method: 'POST', data }),
  put: (url, data) => request({ url, method: 'PUT', data }),
  del: (url, data) => request({ url, method: 'DELETE', data }),
  doRawRequest,
  handleResponse
};
