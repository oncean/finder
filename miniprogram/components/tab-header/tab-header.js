const app = getApp();

Component({
  properties: {
    activeTab: {
      type: String,
      value: 'chat'
    }
  },

  data: {
    statusBarHeight: 0
  },

  lifetimes: {
    attached() {
      this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    }
  },

  methods: {
    onTabChange(e) {
      const { tab } = e.currentTarget.dataset;
      if (tab !== this.properties.activeTab) {
        this.triggerEvent('tabchange', { tab });
      }
    },
    
    onBack() {
      wx.navigateBack({
        fail: () => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      });
    }
  }
});
