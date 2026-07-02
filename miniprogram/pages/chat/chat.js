const app = getApp();
const chatService = require('../../services/chat');
const store = require('../../store/index');
const { updateMe } = require('../../services/auth');
const { getCurrentLocation } = require('../../utils/location');
const eventBus = require('../../utils/event-bus');

const POLL_INTERVAL = 3000;
let _tempMsgId = 0;

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
    scrollIntoView: '',
    showNewMsgTip: false,
    newMsgCount: 0
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
      
      const userInfo = store.get('userInfo');
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
      const messages = await chatService.getMessages(this.data.groupId, null, 100);
      const lastSeenId = messages.length > 0 ? messages[messages.length - 1].id : '';
      this.setData({
        messages: messages,
        hasMore: messages.length === 100,
        loading: false,
        lastSeenId
      });
      console.log('[scroll] loadInitialMessages: 加载初始消息后调用scrollToBottom');
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
        hasMore: newMessages.length === 100,
        loading: false
      });
      
      if (newMessages.length >= 3) {
        const anchorIndex = newMessages.length - 3;
        const anchorId = newMessages[anchorIndex].id;
        console.log('[scroll] loadMessages: 滚动到锚点消息:', anchorId);
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
    if (!this.data.groupId || this._polling) return;
    this._polling = true;
    
    try {
      const result = await chatService.poll(this.data.groupId, this.data.lastSeenId);
      
      if (result.messages && result.messages.length > 0) {
        console.log('收到新消息:', result.messages);
        
        const currentMessages = this.data.messages;
        // 收集已存在的消息 id（包含临时消息和服务器消息）
        const existingIds = new Set(currentMessages.map(m => m.id));
        
        // 去重：只追加不存在的新消息
        const uniqueNewMessages = result.messages.filter(m => !existingIds.has(m.id));
        
        if (uniqueNewMessages.length > 0) {
          // 追加新消息（已去重，只追加不存在的消息）
          const updatedMessages = [...currentMessages, ...uniqueNewMessages];
          
          // 检查是否有其他人的消息
          const otherMessages = uniqueNewMessages.filter(m => !m.sender || m.sender.id !== this.data.userId);
          
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

  async sendMessage(content) {
    if (this._sending) return;
    this._sending = true;
    
    try {
      // 发送消息时清除浮窗提示
      this.setData({ showNewMsgTip: false, newMsgCount: 0 });
      
      // 生成唯一标识，用于后续轮询替换
      const tempId = 'temp-' + (++_tempMsgId);
      
      // 直接追加临时消息到列表
      const userInfo = store.get('userInfo');
      const tempMsg = {
        id: tempId,
        _tempId: tempId,
        _temp: true,
        groupId: this.data.groupId,
        sender: {
          id: this.data.userId,
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
      console.log('[scroll] sendMessage: 添加临时消息后调用scrollToBottom');
      this.scrollToBottom();
      
      // 发送消息到服务端
      const serverMsg = await chatService.sendMessage(this.data.groupId, 'text', content);
      
      // 发送成功，用服务端返回的消息替换临时消息
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
      // 发送失败，标记临时消息为失败状态
      const messages = this.data.messages;
      const failedIdx = messages.findIndex(
        m => m._temp && m._tempId === tempId
      );
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
    console.log('[scroll] scrollToBottom called, messages.length:', messages.length);
    
    if (messages.length === 0) {
      console.log('[scroll] scrollToBottom: 无消息，跳过');
      return;
    }
    
    const lastMessageId = messages[messages.length - 1].id;
    const messageContent = messages[messages.length -1].content;
    
    if (!lastMessageId) {
      console.log('[scroll] scrollToBottom: lastMessageId为空，跳过');
      return;
    }
    
    wx.nextTick(() => {
      console.log('[scroll] scrollToBottom: 设置scrollIntoView: msg-' + lastMessageId + "messageContent: "+ messageContent);
      this.setData({
        scrollIntoView: 'msg-' + lastMessageId
      });
    });
  },

  onTapNewMsgTip() {
    this.setData({
      showNewMsgTip: false,
      newMsgCount: 0
    });
    console.log('[scroll] onTapNewMsgTip: 点击新消息提示后调用scrollToBottom');
    this.scrollToBottom();
  }
});