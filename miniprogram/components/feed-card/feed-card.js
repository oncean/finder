Component({
  properties: {
    post: {
      type: Object,
      value: {}
    }
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
    }
  }
});
