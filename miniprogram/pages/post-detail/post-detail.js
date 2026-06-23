const postService = require('../../services/post');

Page({
  data: {
    post: {},
    loading: true
  },

  onLoad(options) {
    const { id, shopId } = options;
    if (id) {
      this.loadPostDetail(id);
    } else if (shopId) {
      // 从店铺详情页AI总结"查看"跳转过来，加载该店铺的推荐帖子
      this.loadPostByShopId(shopId);
    }
  },

  // 通过 shopId 加载推荐帖子
  async loadPostByShopId(shopId) {
    try {
      const data = await postService.getRecommendations({ page: 1, pageSize: 20 });
      const post = data.list.find(p => p.shopId === shopId) || data.list[0];
      if (post) {
        this.loadPostDetail(post.id);
      } else {
        this.setData({ loading: false });
        wx.showToast({ title: '暂无评价', icon: 'none' });
      }
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载评价失败:', error);
    }
  },

  // 加载帖子详情
  async loadPostDetail(postId) {
    try {
      const post = await postService.getPostDetail(postId);
      this.setData({ post, loading: false });
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载帖子详情失败:', error);
    }
  },

  // 预览图片
  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset;
    const urls = this.data.post.images || [];
    wx.previewImage({
      current: url,
      urls
    });
  },

  // 返回
  onBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/feed/feed' });
    }
  },

  // 点击店铺卡片
  onTapShop() {
    if (this.data.post.shopId) {
      wx.navigateTo({
        url: `/pages/shop-detail/shop-detail?id=${this.data.post.shopId}`
      });
    }
  },

  // 分享
  onShareTap() {
    wx.showShareMenu({ withShareTicket: true });
    wx.showToast({ title: '请点击右上角分享', icon: 'none' });
  },

  onShareAppMessage() {
    return {
      title: this.data.post.title,
      path: `/pages/post-detail/post-detail?id=${this.data.post.id}`
    };
  }
});
