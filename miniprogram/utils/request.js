const {
  API_URL,
  CLOUD_ENV_ID,
  CLOUD_SERVICE,
  USE_CLOUD_CONTAINER
} = require('./config');

function request(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    const method = options.method || 'GET';
    const header = {
      'Authorization': token ? 'Bearer ' + token : '',
      'content-type': 'application/json'
    };
    const requestOptions = {
      method,
      data: options.data,
      header,
      success: (res) => handleResponse(res, resolve, reject),
      fail: (err) => {
        wx.showToast({ title: '网络错误', icon: 'none' });
        reject(err);
      }
    };

    if (shouldUseCloudContainer()) {
      wx.cloud.callContainer({
        ...requestOptions,
        config: {
          env: CLOUD_ENV_ID
        },
        path: `/api/v1${options.url}`,
        header: {
          ...header,
          'X-WX-SERVICE': CLOUD_SERVICE
        }
      });
      return;
    }

    wx.request({
      ...requestOptions,
      url: API_URL + options.url
    });
  });
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

function handleResponse(res, resolve, reject) {
  // 401 登录过期
  if (res.statusCode === 401) {
    wx.removeStorageSync('token');
    wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
    reject(new Error('登录已过期'));
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

module.exports = {
  get: (url, data) => request({ url, method: 'GET', data }),
  post: (url, data) => request({ url, method: 'POST', data }),
  put: (url, data) => request({ url, method: 'PUT', data }),
  del: (url, data) => request({ url, method: 'DELETE', data })
};
