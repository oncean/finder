Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    preventBubble() {},

    onClose() {
      this.triggerEvent('close');
    },

    onSelectShop() {
      this.triggerEvent('selectShop');
    },

    onSelectPhoto() {
      this.triggerEvent('selectPhoto');
    }
  }
});
