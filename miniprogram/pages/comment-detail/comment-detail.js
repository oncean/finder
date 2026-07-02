const shopService = require('../../services/shop');
const postService = require('../../services/post');
const { openLocation } = require('../../utils/location');
const RANK_LABELS = ['', '第一', '第二', '第三', '第四', '第五', '第六', '第七', '第八', '第九', '第十'];
Page({
  data: {
    shop: {},
    comment: {},
    reviews: [],
    galleryImages: [],
    loading: true,
  },

  onLoad(options) {
    const { commentId } = options;
    console.info("commentid"+ commentId)
    if (commentId) {
      this.loadCommentDetail(commentId);
    }
  },

  async loadCommentDetail(commentId) {
    try {
      const comment = await postService.getCommentDetail(commentId);
      const shopId = comment.shopId;

      let shop = comment.shop || {};
      if (shopId) {
        try {
          shop = await shopService.getShopDetail(shopId);
        } catch (e) {
          console.error('加载店铺详情失败:', e);
        }
      }
      this.setData({
        comment,
        shop,
        reviews: [comment],
        galleryImages: comment.images || [],
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载评价详情失败:', error);
    }
  },

  onBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.redirectTo({ url: '/pages/home/home' });
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

  onNavigate() {
    const { shop } = this.data;
    if (shop.location) {
      openLocation(shop.location.lat, shop.location.lng, shop.name, shop.address);
    }
  },

  onTapRecommendation(e) {
    const { id } = e.currentTarget.dataset;
    if (id) {
      wx.navigateTo({
        url: `/pages/shop-detail/shop-detail?shopId=${id}`
      });
    }
  },

  onPreviewImage(e) {
    const images = e.currentTarget.dataset.images || [];
    const current = e.currentTarget.dataset.url || images[0];

    if (!images.length) {
      return;
    }

    wx.previewImage({
      current,
      urls: images
    });
  },

  onShareAppMessage() {
    return {
      title: this.data.comment.title || this.data.shop.name,
      path: `/pages/comment-detail/comment-detail?commentId=${this.data.comment.id}`
    };
  }
});
