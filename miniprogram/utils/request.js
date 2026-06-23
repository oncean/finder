const BASE_URL = 'http://localhost:3000/api/v1';

function request(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    console.log(`[Request] ${options.method || 'GET'} ${options.url}, token: ${token ? '存在' : '不存在'}`);
    
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Authorization': token ? 'Bearer ' + token : '',
        'Content-Type': 'application/json'
      },
      success: (res) => {
        console.log(`[Response] ${options.url}, statusCode: ${res.statusCode}, data:`, res.data);
        
        if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          reject(new Error('登录已过期'));
          return;
        }
        
        if (res.data && res.data.code === 0) {
          resolve(res.data.data);
        } else {
          const msg = res.data ? res.data.message : '请求失败';
          wx.showToast({ title: msg, icon: 'none' });
          reject(res.data || new Error(msg));
        }
      },
      fail: (err) => {
        console.error('[Request Failed]', options.url, err);
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
          if (data.code === 0) {
            resolve(data.data);
          } else {
            reject(data);
          }
        },
        fail: reject
      });
    });
  }
};
