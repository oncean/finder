Component({
  properties: {
    post: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', { postId: this.data.post.id });
    },

    onTapShop() {
      if (this.data.post.shopId) {
        this.triggerEvent('tapShop', { shopId: this.data.post.shopId });
      }
    }
  }
});
