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
    },

    formatTime(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  }
});