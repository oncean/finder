Component({
  properties: {
    summary: {
      type: Object,
      value: {}
    },
    title: {
      type: String,
      value: 'AI总结'
    },
    showTitle: {
      type: Boolean,
      value: true
    },
    showFooter: {
      type: Boolean,
      value: false
    },
    showView: {
      type: Boolean,
      value: false
    },
    testerCount: {
      type: String,
      value: '2000+'
    },
    authorAvatar: {
      type: String,
      value: 'http://192.168.2.103/static/default-avatar.png'
    }
  }
});
