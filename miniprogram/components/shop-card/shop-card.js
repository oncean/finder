Component({
  properties: {
    shop: {
      type: Object,
      value: {}
    },
    showSummary: {
      type: Boolean,
      value: true
    },
    showDistance: {
      type: Boolean,
      value: true
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', { shopId: this.data.shop.id });
    },

    onNavigate() {
      const { shop } = this.data;
      if (shop.location) {
        const { openLocation } = require('../../utils/location');
        openLocation(shop.location.lat, shop.location.lng, shop.name, shop.address);
      }
    }
  }
});
