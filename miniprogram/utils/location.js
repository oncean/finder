function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        resolve({
          lat: res.latitude,
          lng: res.longitude
        });
      },
      fail: (err) => {
        wx.showModal({
          title: '需要位置权限',
          content: '获取位置信息用于推荐附近美食',
          showCancel: false
        });
        reject(err);
      }
    });
  });
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
  chooseLocation,
  openLocation,
  calculateDistance,
  formatDistance
};
