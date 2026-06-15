const shopService = require('../../services/shop');
const { openLocation } = require('../../utils/location');

Page({
  data: {
    shop: {},
    reviews: [],
    loading: true,
    reviewPage: 1,
    hasMoreReviews: true
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.loadShopDetail(id);
      this.loadReviews(id);
    }
  },

  // 加载店铺详情
  async loadShopDetail(shopId) {
    try {
      const shop = await shopService.getShopDetail(shopId);
      this.setData({ shop, loading: false });
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载店铺详情失败:', error);
    }
  },

  // 加载测评列表
  async loadReviews(shopId) {
    if (this.data.loading || !this.data.hasMoreReviews) return;
    
    try {
      const data = await shopService.getShopReviews(shopId, this.data.reviewPage);
      this.setData({
        reviews: this.data.reviewPage === 1 ? data.list : [...this.data.reviews, ...data.list],
        hasMoreReviews: data.list.length === 20,
        reviewPage: this.data.reviewPage + 1
      });
    } catch (error) {
      console.error('加载测评失败:', error);
    }
  },

  // 导航到店铺
  onNavigate() {
    const { shop } = this.data;
    if (shop.location) {
      openLocation(shop.location.lat, shop.location.lng, shop.name, shop.address);
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: this.data.shop.name,
      path: `/pages/shop-detail/shop-detail?id=${this.data.shop.id}`
    };
  },

  // 上拉加载更多测评
  onReachBottom() {
    if (this.data.hasMoreReviews) {
      this.loadReviews(this.data.shop.id);
    }
  }
});
