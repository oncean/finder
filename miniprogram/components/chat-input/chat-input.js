Component({
  properties: {
    placeholder: {
      type: String,
      value: '说点什么...'
    }
  },

  data: {
    inputValue: ''
  },

  methods: {
    onInput(e) {
      this.setData({ inputValue: e.detail.value });
    },

    onSend() {
      const { inputValue } = this.data;
      if (!inputValue.trim()) return;
      
      this.triggerEvent('send', { content: inputValue.trim() });
      this.setData({ inputValue: '' });
    },

    onShowAddSheet() {
      this.triggerEvent('showAddSheet');
    }
  }
});
