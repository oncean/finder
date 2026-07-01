const app = getApp();
const chatService = require('../../services/chat');
const store = require('../../store/index');
const { updateMe } = require('../../services/auth');
const { getCurrentLocation } = require('../../utils/location');
const eventBus = require('../../utils/event-bus');

const POLL_INTERVAL = 3000;

Page({
  data: {
    messages: [],
    groupId: '',
    groupInfo: {},
    showAddSheet: false,
    userId: '',
    loading: false,
    refreshing: false,
    hasMore: true,
    isInitialized: false,
    noGroup: false,
    onlineCount: 0,
    lastSeenId: '',
    scrollIntoView: ''
  },

  async onLoad() {
    console.log('Chat page onLoad');
    if (this.data.isInitialized) {
      console.log('已初始化，跳过');
      return;
    }
    this.data.isInitialized = true;
    
    const userInfo = store.get('userInfo');
    console.log('User info:', userInfo);
    this.setData({ userId: userInfo ? userInfo.id : '' });
    
    await this.initChat();
  },

  onUnload() {
    this.stopPolling();
    this.data.isInitialized = false;
  },

  onHide() {
    this.stopPolling();
  },

  onShow() {
    if (this.data.isInitialized && this.data.groupId) {
      this.startPolling();
      this.pollNewMessages();
    }
  },

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  },

  async initChat() {
    console.log('initChat start');
    try {
      await this.ensureLocation();
      const location = app.globalData.location;
      const groupInfo = await chatService.getGroupInfo('default', location);
      console.log('Group info:', groupInfo);
      if (!groupInfo || !groupInfo.id) {
        console.log('Group info 为空，该区域未开通');
        this.setData({ noGroup: true });
        return;
      }
      this.setData({
        groupId: groupInfo.id,
        groupInfo
      });
      app.globalData.groupId = groupInfo.id;
      store.set('groupId', groupInfo.id);
      
      await this.loadInitialMessages();
      this.startPolling();
    } catch (error) {
      console.error('初始化群聊失败:', error);
      this.setData({ noGroup: true });
    }
  },

  async ensureLocation() {
    if (app.globalData.location) {
      console.log('全局位置信息已存在，跳过获取');
      return;
    }
    if (app.initLocationPromise) {
      console.log('等待 app.initLocationPromise 完成');
      await app.initLocationPromise;
      if (app.globalData.location) {
        console.log('app.initLocationPromise 完成，获取到位置');
        return;
      }
    }
    console.log('全局位置信息不存在，开始获取位置');
    try {
      const location = await getCurrentLocation();
      console.log('获取到位置信息:', location);
      app.globalData.location = location;
      store.set('location', location);
      
      const userInfo = app.globalData.userInfo;
      if (userInfo && location) {
        console.log('上传位置到服务器:', location);
        await updateMe({ location });
      }
    } catch (error) {
      console.error('获取位置失败:', error);
    }
  },

  async loadInitialMessages() {
    this.setData({ loading: true });
    try {
      const messages = await chatService.getMessages(this.data.groupId, null, 20);
      const lastSeenId = messages.length > 0 ? messages[messages.length - 1].id : '';
      this.setData({
        messages: messages,
        hasMore: messages.length === 20,
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
    if (this.data.loading || !this.data.hasMore || !this.data.groupId) return;
    
    this.setData({ loading: true });
    try {
      const lastId = this.data.messages.length > 0 ? this.data.messages[0].id : null;
      const newMessages = await chatService.getMessages(this.data.groupId, lastId);
      
      this.setData({
        messages: [...newMessages, ...this.data.messages],
        hasMore: newMessages.length === 20,
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

  startPolling() {
    if (this.pollTimer) {
      console.log('轮询已在运行');
      return;
    }
    
    console.log('开始轮询');
    this.pollTimer = setInterval(() => {
      this.pollNewMessages();
    }, POLL_INTERVAL);
  },

  async pollNewMessages() {
    if (!this.data.groupId) return;
    
    try {
      const result = await chatService.poll(this.data.groupId, this.data.lastSeenId);
      
      if (result.messages && result.messages.length > 0) {
        console.log('收到新消息:', result.messages);
        this.setData({
          messages: [...this.data.messages, ...result.messages],
          lastSeenId: result.messages[result.messages.length - 1].id
        });
        this.scrollToBottom();
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
    }
  },

  async sendMessage(content) {
    try {
      await chatService.sendMessage(this.data.groupId, 'text', content);
      await this.pollNewMessages();
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  },

  onSendMessage(e) {
    const { content } = e.detail;
    this.sendMessage(content);
  },

  onShowAddSheet() {
    this.setData({ showAddSheet: true });
  },

  onCloseAddSheet() {
    this.setData({ showAddSheet: false });
  },

  onSelectShop() {
    this.setData({ showAddSheet: false });
    wx.navigateTo({
      url: '/pages/shop-select/shop-select'
    });
  },

  onSelectPhoto() {
    this.setData({ showAddSheet: false });
    wx.navigateTo({
      url: '/pages/photo-select/photo-select'
    });
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
    
    wx.nextTick(() => {
      this.setData({
        scrollIntoView: 'msg-' + lastMessageId
      });
    });
  }
});