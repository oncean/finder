const LOCATION_CACHE_KEY = 'current_location_cache';
const LOCATION_CACHE_TTL = 5 * 60 * 1000;
const LOCATION_MODAL_SHOWN_KEY = 'location_permission_modal_shown';

function getCurrentLocation(options = {}) {
  return new Promise((resolve, reject) => {
    const cached = wx.getStorageSync(LOCATION_CACHE_KEY);
    const now = Date.now();

    if (!options.force && cached && now - cached.timestamp < LOCATION_CACHE_TTL) {
      resolve(cached.location);
      return;
    }

    wx.getSetting({
      success: (settingRes) => {
        const locationAuth = settingRes.authSetting['scope.userLocation'];

        if (locationAuth === false) {
          showLocationPermissionModalOnce();
          reject(new Error('位置权限未开启'));
          return;
        }

        wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        console.log('wx.getLocation 原始返回:', res);
        const location = {
          lat: res.latitude,
          lng: res.longitude
        };
        console.log('解析后的位置:', location);

        wx.setStorageSync(LOCATION_CACHE_KEY, {
          location,
          timestamp: now
        });
        resolve(location);
      },
          fail: (err) => {
            showLocationPermissionModalOnce();
            reject(err);
          }
        });
      },
      fail: reject
    });
  });
}

function showLocationPermissionModalOnce() {
  if (wx.getStorageSync(LOCATION_MODAL_SHOWN_KEY)) {
    return;
  }

  wx.setStorageSync(LOCATION_MODAL_SHOWN_KEY, true);
  wx.showModal({
    title: '需要位置权限',
    content: '获取位置信息用于推荐附近美食。你也可以先浏览默认推荐内容。',
    confirmText: '知道了',
    showCancel: false
  });
}

function resetLocationPermissionTip() {
  wx.removeStorageSync(LOCATION_MODAL_SHOWN_KEY);
}

function clearLocationCache() {
  wx.removeStorageSync(LOCATION_CACHE_KEY);
}

function chooseLocation() {
  return new Promise((resolve, reject) => {
    wx.chooseLocation({
      success: resolve,
      fail: reject
    });
  });
}

function openLocation(lat, lng, name, address) {
  wx.openLocation({
    latitude: lat,
    longitude: lng,
    name: name,
    address: address
  });
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function formatDistance(distance) {
  if (distance < 1000) {
    return distance + 'm';
  }
  return (distance / 1000).toFixed(1) + 'km';
}

module.exports = {
  getCurrentLocation,
  resetLocationPermissionTip,
  clearLocationCache,
  chooseLocation,
  openLocation,
  calculateDistance,
  formatDistance
};
