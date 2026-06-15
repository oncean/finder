const postService = require('../../services/post');

Page({
  data: {
    post: {},
    relatedPosts: [],
    loading: true
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.loadPostDetail(id);
      this.loadRelatedPosts(id);
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

  // 加载相关推荐
  async loadRelatedPosts(postId) {
    try {
      const relatedPosts = await postService.getRelatedPosts(postId);
      this.setData({ relatedPosts });
    } catch (error) {
      console.error('加载相关推荐失败:', error);
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

  // 点击相关推荐
  onTapRelated(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${id}`
    });
  },

  // 点击店铺
  onTapShop() {
    if (this.data.post.shopId) {
      wx.navigateTo({
        url: `/pages/shop-detail/shop-detail?id=${this.data.post.shopId}`
      });
    }
  }
});
