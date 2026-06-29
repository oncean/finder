const app = getApp();
const chatService = require('../../services/chat');
const ws = require('../../utils/websocket');
const store = require('../../store/index');
const { updateMe } = require('../../services/auth');
const request = require('../../utils/request');
const { getCurrentLocation } = require('../../utils/location');

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
    pendingMessage: null,
    noGroup: false
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
    
    await this.initChat();
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
    this.disconnectWebSocket();
    this.data.isInitialized = false;
  },

  onHide() {
    this.disconnectWebSocket();
  },

  onShow() {
    if (this.data.isInitialized && this.data.groupId && !ws.isConnected()) {
      this.connectWebSocket();
    }
  },

  disconnectWebSocket() {
    if (this.unsubscribeMessage) {
      this.unsubscribeMessage();
      this.unsubscribeMessage = null;
    }
    ws.close();
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
      this.connectWebSocket();
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
          console.log('收到历史消息:', data.messages);
          const historyMessages = data.messages || [];
          if (this.data.messages.length === 0) {
            this.setData({
              messages: historyMessages
            });
          } else {
            const currentIds = new Set(this.data.messages.map(m => m.id));
            const newMessages = historyMessages.filter(m => !currentIds.has(m.id));
            if (newMessages.length > 0) {
              this.setData({
                messages: [...newMessages, ...this.data.messages]
              });
            }
          }
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

    // 从后端获取随机头像
    request.get('/admin/random-avatar').then(async (res) => {
      const avatarFileId = res.fileId;
      const avatarUrl = res.url;

      // 更新本地
      app.globalData.userInfo = {
        ...app.globalData.userInfo,
        nickname: randomNick,
        avatar: avatarFileId
      };
      store.set('userInfo', app.globalData.userInfo);

      // 同步到后端
      try {
        await updateMe({ nickname: randomNick, avatar: avatarFileId });
        console.log('匿名用户信息已同步到后端');
      } catch (error) {
        console.error('同步用户信息失败:', error);
      }

      wx.showToast({ title: '已设置', icon: 'success' });
      this.setData({ showUserInfoModal: false });

      if (this.data.pendingMessage) {
        this.sendMessage(this.data.pendingMessage);
        this.setData({ pendingMessage: null });
      }
    }).catch((error) => {
      console.error('获取随机头像失败:', error);
      wx.showToast({ title: '设置失败', icon: 'none' });
    });
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: async (res) => {
        console.log('用户同意授权:', res.userInfo);

        const nickname = res.userInfo.nickName;

        // 从后端获取随机头像
        try {
          const avatarRes = await request.get('/admin/random-avatar');
          const avatarFileId = avatarRes.fileId;

          // 更新本地
          app.globalData.userInfo = {
            ...app.globalData.userInfo,
            nickname,
            avatar: avatarFileId
          };
          store.set('userInfo', app.globalData.userInfo);

          // 同步到后端
          await updateMe({ nickname, avatar: avatarFileId });
          console.log('用户信息已同步到后端');
        } catch (error) {
          console.error('设置用户信息失败:', error);
          // 降级：只更新本地
          app.globalData.userInfo = {
            ...app.globalData.userInfo,
            nickname
          };
          store.set('userInfo', app.globalData.userInfo);
        }

        console.log('获取用户信息成功，完整用户数据:', app.globalData.userInfo);
        wx.showToast({ title: '获取成功', icon: 'success' });
        this.setData({ showUserInfoModal: false });

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
      url: `/pages/shop-detail/shop-detail?shopId=${shopId}`
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
