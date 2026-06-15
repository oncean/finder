Component({
  properties: {
    message: {
      type: Object,
      value: {}
    },
    isSelf: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onTapShopCard() {
      if (this.data.message.shopCard) {
        this.triggerEvent('tapShop', { shopId: this.data.message.shopCard.shopId });
      }
    },

    onPreviewImage() {
      if (this.data.message.type === 'image') {
        wx.previewImage({
          urls: [this.data.message.content]
        });
      }
    }
  }
});
