const postService = require('../../services/post');
const { getCurrentLocation } = require('../../utils/location');

Page({
  data: {
    recommendations: [],
    location: null,
    loading: false,
    refreshing: false,
    hasMore: true,
    page: 1,
    scrollTop: 0,
    showLatestFloat: false
  },

  async onLoad() {
    await this.getLocation();
    this.loadRecommendations();
  },

  onPullDownRefresh() {
    if (this.data.loading) {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
      return;
    }

    this.setData({ refreshing: true, page: 1 });
    this.loadRecommendations().finally(() => {
      this.setData({ refreshing: false });
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

  // 下拉刷新时继续加载 10 条
  async loadNextRecommendations() {
    if (!this.data.hasMore) return;

    const nextPage = this.data.page + 1;
    this.setData({ loading: true });
    try {
      const params = {
        page: nextPage,
        pageSize: 10
      };
      
      if (this.data.location) {
        params.lat = this.data.location.lat;
        params.lng = this.data.location.lng;
      }
      
      const data = await postService.getRecommendations(params);
      const nextList = data.list || [];
      
      this.setData({
        recommendations: [...nextList, ...this.data.recommendations],
        page: nextPage,
        hasMore: nextList.length === 10,
        loading: false,
        showLatestFloat: nextList.length > 0
      });
    } catch (error) {
      this.setData({ loading: false });
      console.error('下拉加载推荐失败:', error);
    }
  },

  // 查看刚加载的最新内容
  onViewLatest() {
    this.setData({
      scrollTop: 1,
      showLatestFloat: false
    });
    setTimeout(() => {
      this.setData({ scrollTop: 0 });
    }, 0);
  },

  // 点击卡片普通区域 -> 店铺详情页
  onTapPost(e) {
    const { shopId, postId } = e.detail;
    if (shopId) {
      wx.navigateTo({
        url: `/pages/comment-detail/comment-detail?id=${shopId}`
      });
    } else if (postId) {
      wx.navigateTo({
        url: `/pages/shop-detail/shop-detail?id=${postId}`
      });
    }
  },

  // 点击 AI 总结区域 -> 店铺评价详情页
  onTapReview(e) {
    const { postId, shopId } = e.detail;
    if (shopId) {
      wx.navigateTo({
        url: `/pages/shop-detail/shop-detail?shopId=${shopId}`
      });
    } else if (postId) {
      wx.navigateTo({
        url: `/pages/shop-detail/shop-detail?id=${postId}`
      });
    }
  },

  // 点击店铺区域 -> 店铺详情页
  onTapShop(e) {
    const { shopId } = e.detail;
    if (shopId) {
      wx.navigateTo({
        url: `/pages/shop-detail/shop-detail?shopId=${shopId}`
      });
    }
  }
});
