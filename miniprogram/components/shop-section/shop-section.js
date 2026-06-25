Component({
  properties: {
    shop: {
      type: Object,
      value: {}
    },
    shopName: {
      type: String,
      value: ''
    },
    location: {
      type: String,
      value: ''
    },
    summaryTags: {
      type: Object,
      value: null
    },
    commentAvatars: {
      type: Array,
      value: []
    },
    commentCount: {
      type: Number,
      value: 0
    },
    showAiSummary: {
      type: Boolean,
      value: false
    },
    shopId: {
      type: String,
      value: ''
    }
  },

  methods: {
    onViewReview() {
      this.triggerEvent('tapReview');
    },

    onTapShop() {
      this.triggerEvent('tapShop', {
        shopId: this.data.shopId
      });
    }
  }
});
