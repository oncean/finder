const app = getApp();
const chatService = require('../../services/chat');
const ws = require('../../utils/websocket');
const store = require('../../store/index');

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
    showUserInfoModal: false,
    pendingMessage: null
  },

  async onLoad() {
    console.log('Chat page onLoad');
    if (this.data.isInitialized) {
      console.log('已初始化，跳过');
      return;
    }
    this.data.isInitialized = true;
    
    await this.checkAndLogin();
    
    const userInfo = store.get('userInfo');
    console.log('User info:', userInfo);
    this.setData({ userId: userInfo ? userInfo.id : '' });
    
    if (!this.checkUserInfo()) {
      console.log('用户未完善信息，弹出获取用户信息弹窗');
      this.setData({ showUserInfoModal: true });
    }
    
    this.initChat();
  },

  async checkAndLogin() {
    const token = wx.getStorageSync('token');
    const userInfo = app.globalData.userInfo || store.get('userInfo');
    
    if (!token || !userInfo || !userInfo.id) {
      console.log('用户未登录，启动静默登录');
      try {
        await app.silentLogin();
        console.log('静默登录成功');
      } catch (error) {
        console.error('静默登录失败:', error);
      }
    } else {
      console.log('用户已登录，用户ID:', userInfo.id);
    }
  },

  onUnload() {
    ws.close();
    this.data.isInitialized = false;
  },

  async initChat() {
    console.log('initChat start');
    try {
      const groupInfo = await chatService.getGroupInfo('default');
      console.log('Group info:', groupInfo);
      this.setData({ 
        groupId: groupInfo.id,
        groupInfo
      });
      this.connectWebSocket();
    } catch (error) {
      console.error('初始化群聊失败:', error);
    }
  },

  async loadMessages() {
    if (this.data.loading || !this.data.hasMore || !this.data.groupId) return;
    
    this.setData({ loading: true });
    try {
      const lastId = this.data.messages.length > 0 ? this.data.messages[0].id : null;
      const messages = await chatService.getMessages(this.data.groupId, lastId);
      
      this.setData({
        messages: [...messages, ...this.data.messages],
        hasMore: messages.length === 20,
        loading: false
      });
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

  connectWebSocket() {
    if (this.unsubscribeMessage) {
      console.log('取消之前的消息订阅');
      this.unsubscribeMessage();
    }
    
    ws.connect(this.data.groupId);
    
    this.unsubscribeMessage = ws.onMessage((data) => {
      console.log('chat 页面收到 WebSocket 消息:', data);
      switch (data.type) {
        case 'message':
          console.log('收到新消息:', data.data);
          this.setData({
            messages: [...this.data.messages, data.data]
          });
          this.scrollToBottom();
          break;
        case 'history':
          console.log('收到历史消息:', data.data.messages);
          this.setData({
            messages: data.data.messages
          });
          this.scrollToBottom();
          break;
      }
    });
  },

  checkUserInfo() {
    const userInfo = app.globalData.userInfo;
    return !!(userInfo && userInfo.nickname);
  },

  async onSendMessage(e) {
    const { content } = e.detail;
    
    // 检测用户是否有用户信息
    if (!this.checkUserInfo()) {
      console.log('用户未获取用户信息，弹出获取用户信息弹窗');
      this.setData({ 
        showUserInfoModal: true,
        pendingMessage: content
      });
      return;
    }
    
    // 已有用户信息，直接发送消息
    this.sendMessage(content);
  },

  sendMessage(content) {
    try {
      ws.send({
        type: 'message',
        content: content
      });
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  },

  onCloseUserInfoModal() {
    this.setData({ 
      showUserInfoModal: false,
      pendingMessage: null
    });
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  useRandomUser() {
    const randomNum = Math.random().toString(36).substr(2, 6);
    const randomNick = '用户' + randomNum;
    const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';
    
    app.globalData.userInfo = {
      ...app.globalData.userInfo,
      nickname: randomNick,
      avatar: defaultAvatar
    };
    store.set('userInfo', app.globalData.userInfo);
    
    wx.showToast({ title: '已设置随机昵称', icon: 'success' });
    
    this.setData({
      showUserInfoModal: false
    });
    
    if (this.data.pendingMessage) {
      this.sendMessage(this.data.pendingMessage);
      this.setData({ pendingMessage: null });
    }
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        console.log('用户同意授权:', res.userInfo);
        
        const userInfo = {
          nickName: res.userInfo.nickName,
          avatarUrl: res.userInfo.avatarUrl
        };
        
        // 保存用户信息到全局
        app.globalData.userInfo = {
          ...app.globalData.userInfo,
          nickname: userInfo.nickName,
          avatar: userInfo.avatarUrl
        };
        store.set('userInfo', app.globalData.userInfo);
        
        wx.showToast({ title: '获取成功', icon: 'success' });
        
        this.setData({
          showUserInfoModal: false
        });
        
        // 获取成功后发送之前待发送的消息
        if (this.data.pendingMessage) {
          this.sendMessage(this.data.pendingMessage);
          this.setData({ pendingMessage: null });
        }
      },
      fail: (error) => {
        console.log('用户拒绝授权:', error);
        wx.showToast({ title: '已取消', icon: 'none' });
        this.setData({
          showUserInfoModal: false
        });
      }
    });
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
      url: `/pages/comment-detail/comment-detail?id=${shopId}`
    });
  },

  scrollToBottom() {
    wx.createSelectorQuery()
      .select('#message-list')
      .boundingClientRect()
      .exec((res) => {
        if (res[0]) {
          this.setData({
            scrollTop: res[0].height
          });
        }
      });
  }
});
