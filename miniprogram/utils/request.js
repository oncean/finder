const BASE_URL = 'http://localhost:3000/api/v1';

function request(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Authorization': token ? 'Bearer ' + token : '',
        'Content-Type': 'application/json'
      },
      success: (res) => {
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
      },
      fail: (err) => {
        wx.showToast({ title: '网络错误', icon: 'none' });
        reject(err);
      }
    });
  });
}

module.exports = {
  get: (url, data) => request({ url, method: 'GET', data }),
  post: (url, data) => request({ url, method: 'POST', data }),
  put: (url, data) => request({ url, method: 'PUT', data }),
  del: (url, data) => request({ url, method: 'DELETE', data }),
  upload: (url, filePath) => {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('token');
      
      wx.uploadFile({
        url: BASE_URL + url,
        filePath: filePath,
        name: 'file',
        header: {
          'Authorization': 'Bearer ' + token
        },
        success: (res) => {
          const data = JSON.parse(res.data);
          // 上传接口返回原始数据
          resolve(data);
        },
        fail: reject
      });
    });
  }
};
