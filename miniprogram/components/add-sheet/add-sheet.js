Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  methods: {
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
