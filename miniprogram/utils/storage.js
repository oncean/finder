module.exports = {
  set(key, value) {
    try {
      wx.setStorageSync(key, value);
    } catch (e) {
      console.error('存储失败:', e);
    }
  },

  get(key, defaultValue = null) {
    try {
      return wx.getStorageSync(key) || defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  remove(key) {
    try {
      wx.removeStorageSync(key);
    } catch (e) {
      console.error('删除失败:', e);
    }
  },

  clear() {
    try {
      wx.clearStorageSync();
    } catch (e) {
      console.error('清空失败:', e);
    }
  }
};
