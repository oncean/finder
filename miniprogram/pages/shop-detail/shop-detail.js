const shopService = require('../../services/shop');
const { openLocation } = require('../../utils/location');
const app = getApp();

const RANK_LABELS = ['', '第一', '第二', '第三', '第四', '第五', '第六', '第七', '第八', '第九', '第十'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}-${day}`;
}

function formatAmount(amount) {
  if (amount === null || amount === undefined) return '0.00';
  if (typeof amount === 'number' && amount > 1000) {
    return (amount / 100).toFixed(2);
  }
  return Number(amount).toFixed(2);
}

function formatReviewItem(item) {
  const rank = item.recommendRank;
  const rankText = rank && rank >= 1 && rank <= 10
    ? `推荐榜${RANK_LABELS[rank]}`
    : '';
  const dateText = formatDate(item.eventTime || item.createdAt);
  const locationText = item.city || '';
  const amount = item.consumeRecord?.amount;
  const amountText = formatAmount(amount);

  return {
    ...item,
    rankText,
    dateText,
    locationText,
    amountText,
  };
}

Page({
  data: {
    shop: {},
    reviews: [],
    loading: true,
    loadingMore: false,
    noMore: false,
    page: 1,
    pageSize: 10,
    shopId: '',
    statusBarHeight: 0,
  },

  onLoad(options) {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    const { shopId } = options;
    if (shopId) {
      this.setData({ shopId });
      this.loadShopDetail(shopId);
      this.loadReviews(shopId, 1);
    }
  },

  // 加载店铺详情
  async loadShopDetail(shopId) {
    try {
      const shop = await shopService.getShopDetail(shopId);
      this.setData({ shop });
    } catch (error) {
      console.error('加载店铺详情失败:', error);
    }
  },

  // 加载评价列表
  async loadReviews(shopId, page) {
    try {
      const { pageSize } = this.data;
      const data = await shopService.getShopReviews(shopId, page, pageSize);
      const newReviews = data.list.map(formatReviewItem);

      const reviews = page === 1 ? newReviews : this.data.reviews.concat(newReviews);
      const noMore = newReviews.length < pageSize;

      this.setData({
        reviews,
        loading: false,
        loadingMore: false,
        noMore,
        page,
      });
    } catch (error) {
      this.setData({ loading: false, loadingMore: false });
      console.error('加载评价列表失败:', error);
    }
  },

  // 触底加载更多
  onReachBottom() {
    const { loadingMore, noMore, shopId, page } = this.data;
    if (loadingMore || noMore || !shopId) return;

    this.setData({ loadingMore: true });
    this.loadReviews(shopId, page + 1);
  },

  // 预览图片
  onPreviewImage(e) {
    const { url, images } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: images || []
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
    if (this.data.shop.id) {
      wx.navigateTo({
        url: `/pages/comment-detail/comment-detail?id=${this.data.shop.id}`
      });
    }
  },

  // 点击评论卡片跳转到评论详情
  onTapReview(e) {
    const { id } = e.currentTarget.dataset;
    if (id) {
      wx.navigateTo({
        url: `/pages/comment-detail/comment-detail?commentId=${id}`
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
      title: this.data.shop.name || '店铺详情',
      path: `/pages/shop-detail/shop-detail?shopId=${this.data.shopId}`
    };
  }
});
