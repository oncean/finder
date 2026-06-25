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

  data: {
    displayTime: ''
  },

  observers: {
    'message.createdAt': function(createdAt) {
      this.setData({
        displayTime: this.formatMessageTime(createdAt)
      });
    }
  },

  lifetimes: {
    attached() {
      this.setData({
        displayTime: this.formatMessageTime(this.data.message.createdAt)
      });
    }
  },

  methods: {
    onTapShopCard() {
      if (this.data.message.shopCard) {
        this.triggerEvent('tapShop', {
          shopId: this.data.message.shopCard.shopId || this.data.message.shopId
        });
      }
    },

    onPreviewImage() {
      if (this.data.message.type === 'image') {
        wx.previewImage({
          urls: [this.data.message.content]
        });
      }
    },

    formatMessageTime(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return '';

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const period = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      if (hours === 0) hours = 12;
      const timeText = `${hours}:${minutes} ${period}`;

      if (messageDay.getTime() === today.getTime()) {
        return timeText;
      }

      if (messageDay.getTime() === yesterday.getTime()) {
        return `昨天 ${timeText}`;
      }

      if (date.getFullYear() === now.getFullYear()) {
        return `${date.getMonth() + 1}月${date.getDate()}日 ${timeText}`;
      }

      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${timeText}`;
    }
  }
});
