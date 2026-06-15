const request = require('../utils/request');

function getShops(params) {
  return request.get('/shops', params);
}

function getShopDetail(shopId) {
  return request.get(`/shops/${shopId}`);
}

function getShopReviews(shopId, page = 1, pageSize = 20) {
  return request.get(`/shops/${shopId}/reviews`, { page, pageSize });
}

module.exports = {
  getShops,
  getShopDetail,
  getShopReviews
};
