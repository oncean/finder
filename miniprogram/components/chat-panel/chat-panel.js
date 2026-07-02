const app = getApp();
const chatService = require('../../services/chat');
const store = require('../../store/index');
const eventBus = require('../../utils/event-bus');

const POLL_INTERVAL = 3000;
let _tempMsgId = 0;

Component({
  properties: {
    // 由父组件传入的控制属性
    groupId: {
      type: String,
      value: ''
    },
    groupInfo: {
      type: Object,
      value: {}
    },
    userId: {
      type: String,
      value: ''
    },
    // 父组件控制是否激活（用于轮询启停）
    active: {
      type: Boolean,
      value: true
    }
  },

  data: {
    messages: [],
    showAddSheet: false,
    loading: false,
    refreshing: false,
    hasMore: true,
    lastSeenId: '',
    scrollIntoView: '',
    showNewMsgTip: false,
    newMsgCount: 0,
    // header-info 相关
    location: '',
    onlineCount: 0,
    onlineUsers: []
  },

  lifetimes: {
    attached() {
      this.loadOnlineUsersFromGlobal();
      this.bindOnlineUsersEvent();
    },

    detached() {
      this.stopPolling();
      if (this.onlineUsersEventListener) {
        eventBus.off('onlineUsersUpdated', this.onlineUsersEventListener);
      }
    }
  },

  observers: {
    'groupId': function(groupId) {
      if (groupId) {
        this.loadInitialMessages();
        if (this.properties.active) {
          this.startPolling();
        }
      }
    },
    'active': function(active) {
      if (active) {
        this.startPolling();
        this.pollNewMessages();
      } else {
        this.stopPolling();
      }
    },
    'groupInfo': function(groupInfo) {
      if (groupInfo) {
        const location = groupInfo.district || groupInfo.city || '';
        this.setData({ location });
      }
    }
  },

  methods: {
    // ==================== 轮询控制 ====================

    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },

    startPolling() {
      if (this.pollTimer || !this.properties.groupId || !this.properties.active) {
        return;
      }
      console.log('[chat-panel] 开始轮询');
      this.pollTimer = setInterval(() => {
        this.pollNewMessages();
      }, POLL_INTERVAL);
    },

    // ==================== 消息加载 ====================

    async loadInitialMessages() {
      this.setData({ loading: true });
      try {
        const messages = await chatService.getMessages(this.properties.groupId, null, 100);
        const lastSeenId = messages.length > 0 ? messages[messages.length - 1].id : '';
        this.setData({
          messages,
          hasMore: messages.length === 100,
          loading: false,
          lastSeenId
        });
        this.scrollToBottom();
      } catch (error) {
        this.setData({ loading: false });
        console.error('加载消息失败:', error);
      }
    },

    async loadMessages() {
      if (this.data.loading || !this.data.hasMore || !this.properties.groupId) return;

      this.setData({ loading: true });
      try {
        const lastId = this.data.messages.length > 0 ? this.data.messages[0].id : null;
        const newMessages = await chatService.getMessages(this.properties.groupId, lastId);

        this.setData({
          messages: [...newMessages, ...this.data.messages],
          hasMore: newMessages.length === 100,
          loading: false
        });

        if (newMessages.length >= 3) {
          const anchorIndex = newMessages.length - 3;
          const anchorId = newMessages[anchorIndex].id;
          wx.nextTick(() => {
            this.setData({ scrollIntoView: 'msg-' + anchorId });
          });
        }
      } catch (error) {
        this.setData({ loading: false });
        console.error('加载消息失败:', error);
      }
    },

    async onPullDownRefresh() {
      this.setData({ refreshing: true });
      try {
        await this.loadMessages();
      } finally {
        this.setData({ refreshing: false });
        wx.stopPullDownRefresh();
      }
    },

    // ==================== 轮询 ====================

    async pollNewMessages() {
      if (!this.properties.groupId || this._polling) return;
      this._polling = true;

      try {
        const result = await chatService.poll(this.properties.groupId, this.data.lastSeenId);

        if (result.messages && result.messages.length > 0) {
          const currentMessages = this.data.messages;
          const existingIds = new Set(currentMessages.map(m => m.id));
          const uniqueNewMessages = result.messages.filter(m => !existingIds.has(m.id));

          if (uniqueNewMessages.length > 0) {
            const updatedMessages = [...currentMessages, ...uniqueNewMessages];
            const otherMessages = uniqueNewMessages.filter(m => !m.sender || m.sender.id !== this.properties.userId);

            this.setData({
              messages: updatedMessages,
              lastSeenId: result.messages[result.messages.length - 1].id
            });

            if (otherMessages.length > 0) {
              this.setData({
                showNewMsgTip: true,
                newMsgCount: this.data.newMsgCount + otherMessages.length
              });
            }
          }
        }

        if (result.onlineCount !== undefined) {
          this.setData({ onlineCount: result.onlineCount });
        }

        if (result.onlineUsers) {
          app.globalData.onlineUsers = result.onlineUsers;
          app.globalData.onlineCount = result.onlineCount;
          eventBus.trigger('onlineUsersUpdated');
        }
      } catch (error) {
        console.error('轮询失败:', error);
      } finally {
        this._polling = false;
      }
    },

    // ==================== 发送消息 ====================

    async sendMessage(content) {
      if (this._sending) return;
      this._sending = true;

      try {
        this.setData({ showNewMsgTip: false, newMsgCount: 0 });

        const tempId = 'temp-' + (++_tempMsgId);
        const userInfo = store.get('userInfo');
        const tempMsg = {
          id: tempId,
          _tempId: tempId,
          _temp: true,
          groupId: this.properties.groupId,
          sender: {
            id: this.properties.userId,
            nickname: userInfo ? userInfo.nickname : '',
            avatar: userInfo ? userInfo.avatar : ''
          },
          type: 'text',
          content: content,
          loading: true,
          createdAt: new Date().toISOString()
        };

        this.setData({
          messages: [...this.data.messages, tempMsg]
        });
        this.scrollToBottom();

        const serverMsg = await chatService.sendMessage(this.properties.groupId, 'text', content);

        const messages = this.data.messages;
        const tempIdx = messages.findIndex(m => m._temp && m._tempId === tempId);
        if (tempIdx !== -1) {
          this.setData({
            messages: messages.map((m, i) =>
              i === tempIdx ? { ...serverMsg, _temp: false, loading: false } : m
            )
          });
        }
      } catch (error) {
        console.error('发送消息失败:', error);
        const messages = this.data.messages;
        const failedIdx = messages.findIndex(m => m._temp && m._tempId === tempId);
        if (failedIdx !== -1) {
          this.setData({
            messages: messages.map((m, i) =>
              i === failedIdx ? { ...m, loading: false, failed: true } : m
            )
          });
        }
      } finally {
        this._sending = false;
      }
    },

    onSendMessage(e) {
      const { content } = e.detail;
      this.sendMessage(content);
    },

    // ==================== 交互事件 ====================

    onShowAddSheet() {
      this.setData({ showAddSheet: true });
    },

    onCloseAddSheet() {
      this.setData({ showAddSheet: false });
    },

    onSelectShop() {
      this.setData({ showAddSheet: false });
      wx.navigateTo({ url: '/pages/shop-select/shop-select' });
    },

    onSelectPhoto() {
      this.setData({ showAddSheet: false });
      wx.navigateTo({ url: '/pages/photo-select/photo-select' });
    },

    onTapShopCard(e) {
      const { shopId } = e.detail;
      wx.navigateTo({
        url: `/pages/shop-detail/shop-detail?shopId=${shopId}`
      });
    },

    scrollToBottom() {
      const messages = this.data.messages;
      if (messages.length === 0) return;

      const lastMessageId = messages[messages.length - 1].id;
      if (!lastMessageId) return;

      wx.nextTick(() => {
        this.setData({ scrollIntoView: 'msg-' + lastMessageId });
      });
    },

    onTapNewMsgTip() {
      this.setData({ showNewMsgTip: false, newMsgCount: 0 });
      this.scrollToBottom();
    },

    // ==================== 在线用户 ====================

    loadOnlineUsersFromGlobal() {
      const onlineUsers = app.globalData.onlineUsers || [];
      const onlineCount = app.globalData.onlineCount || 0;
      this.setData({ onlineCount, onlineUsers });
    },

    bindOnlineUsersEvent() {
      this.onlineUsersEventListener = () => {
        this.loadOnlineUsersFromGlobal();
      };
      eventBus.on('onlineUsersUpdated', this.onlineUsersEventListener);
    }
  }
});
