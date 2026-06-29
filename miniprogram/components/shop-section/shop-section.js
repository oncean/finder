const { openLocation } = require('../../utils/location');

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
    },
    showShare: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onTapShop() {
      this.triggerEvent('tapShop', {
        shopId: this.data.shopId
      });
    },

    onNavigate() {
      const shop = this.data.shop || {};
      const location = shop.location || {};
      const lat = Number(location.lat || location.latitude);
      const lng = Number(location.lng || location.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        wx.showToast({ title: '暂无店铺位置', icon: 'none' });
        return;
      }

      openLocation(lat, lng, shop.name || this.data.shopName, shop.address || this.data.location);
    },

    onShareTap() {
    }
  }
});
