const chatService = require('../../services/chat');
const app = getApp();

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
        this.loadOnlineUsers();
        this.startOnlineUsersTimer();
      }
    },

    detached() {
      if (this.onlineUsersTimer) {
        clearInterval(this.onlineUsersTimer);
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

    startOnlineUsersTimer() {
      if (this.onlineUsersTimer) {
        clearInterval(this.onlineUsersTimer);
      }
      this.onlineUsersTimer = setInterval(() => {
        this.loadOnlineUsers();
      }, 5000);
    },

    async loadOnlineUsers() {
      if (!this.properties.groupId) return;

      try {
        const data = await chatService.getOnlineUsers(this.properties.groupId);
        this.setData({
          onlineCount: data.totalCount || 0,
          onlineUsers: data.list || []
        });
      } catch (error) {
        console.error('加载在线用户失败:', error);
      }
    }
  }
});
