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
    }
  },

  // 加载店铺详情
  async loadShopDetail(shopId) {
    try {
      const shop = await shopService.getShopDetail(shopId);
      this.setData({ shop, loading: false });
      this.loadReviews(shopId);
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载店铺详情失败:', error);
    }
  },

  onBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/feed/feed' });
    }
  },

  onShareTap() {
    wx.showShareMenu({
      withShareTicket: true
    });
    wx.showToast({
      title: '请点击右上角分享',
      icon: 'none'
    });
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

  // 点击AI总结查看，跳转到评价详情页
  onViewReview() {
    const { shop } = this.data;
    // 跳转到 post-detail 页面，传 shopId 让其加载该店铺的推荐帖子
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?shopId=${shop.id}`
    });
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
