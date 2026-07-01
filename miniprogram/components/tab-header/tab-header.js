const chatService = require('../../services/chat');
const app = getApp();
const eventBus = require('../../utils/event-bus');

Component({
  properties: {
    activeTab: {
      type: String,
      value: 'chat'
    },
    location: {
      type: String,
      value: ''
    },
    groupId: {
      type: String,
      value: ''
    }
  },

  data: {
    onlineCount: 0,
    onlineUsers: [],
    statusBarHeight: 0
  },

  lifetimes: {
    attached() {
      this.setData({ statusBarHeight: app.globalData.statusBarHeight });
      if (this.properties.activeTab === 'chat') {
        this.loadOnlineUsersFromGlobal();
        this.bindOnlineUsersEvent();
      }
    },

    detached() {
      if (this.onlineUsersEventListener) {
        eventBus.off('onlineUsersUpdated', this.onlineUsersEventListener);
      }
    }
  },

  methods: {
    onTabChange(e) {
      const { tab } = e.currentTarget.dataset;
      if (tab !== this.properties.activeTab) {
        const url = tab === 'chat' ? '/pages/chat/chat' : '/pages/feed/feed';
        wx.redirectTo({ url });
      }
    },

    loadOnlineUsersFromGlobal() {
      const onlineUsers = app.globalData.onlineUsers || [];
      const onlineCount = app.globalData.onlineCount || 0;
      this.setData({
        onlineCount,
        onlineUsers
      });
    },

    bindOnlineUsersEvent() {
      this.onlineUsersEventListener = () => {
        this.loadOnlineUsersFromGlobal();
      };
      eventBus.on('onlineUsersUpdated', this.onlineUsersEventListener);
    }
  }
});
