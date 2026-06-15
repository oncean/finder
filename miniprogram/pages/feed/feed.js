const postService = require('../../services/post');
const { getCurrentLocation } = require('../../utils/location');

Page({
  data: {
    recommendations: [],
    location: null,
    loading: false,
    hasMore: true,
    page: 1
  },

  async onLoad() {
    await this.getLocation();
    this.loadRecommendations();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true });
    this.loadRecommendations().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadRecommendations();
    }
  },

  // 获取位置
  async getLocation() {
    try {
      const location = await getCurrentLocation();
      this.setData({ location });
    } catch (error) {
      console.error('获取位置失败:', error);
    }
  },

  // 加载推荐列表
  async loadRecommendations() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    try {
      const params = {
        page: this.data.page,
        pageSize: 10
      };
      
      if (this.data.location) {
        params.lat = this.data.location.lat;
        params.lng = this.data.location.lng;
      }
      
      const data = await postService.getRecommendations(params);
      
      this.setData({
        recommendations: this.data.page === 1 ? data.list : [...this.data.recommendations, ...data.list],
        hasMore: data.list.length === 10,
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载推荐失败:', error);
    }
  },

  // 点击帖子
  onTapPost(e) {
    const { postId } = e.detail;
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${postId}`
    });
  },

  // 点击店铺
  onTapShop(e) {
    const { shopId } = e.detail;
    wx.navigateTo({
      url: `/pages/shop-detail/shop-detail?id=${shopId}`
    });
  }
});
