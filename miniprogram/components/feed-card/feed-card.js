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
    // 可能以分为单位
    return (amount / 100).toFixed(2);
  }
  return Number(amount).toFixed(2);
}

Component({
  properties: {
    post: {
      type: Object,
      value: {}
    }
  },

  observers: {
    'post': function (post) {
      if (!post || !post.id) return;

      const rank = post.recommendRank;
      const rankText = rank && rank >= 1 && rank <= 10
        ? `推荐榜${RANK_LABELS[rank]}`
        : '';

      const dateText = formatDate(post.eventTime);
      const locationText = post.city || '';

      const amount = post.consumeRecord?.amount;
      const amountText = formatAmount(amount);

      this.setData({
        rankText,
        dateText,
        locationText,
        amountText,
      });
    }
  },

  data: {
    rankText: '',
    dateText: '',
    locationText: '',
    amountText: '0.00',
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', {
        postId: this.data.post.id,
        shopId: this.data.post.shopId
      });
    },

    onViewReview() {
      this.triggerEvent('tapReview', {
        postId: this.data.post.id,
        shopId: this.data.post.shopId
      });
    },

    onTapShop(e) {
      const { shopId } = e.detail;
      this.triggerEvent('tapShop', {
        shopId: shopId || this.data.post.shopId
      });
    }
  }
});
