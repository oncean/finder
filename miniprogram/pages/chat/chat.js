const chatService = require('../../services/chat');
const ws = require('../../utils/websocket');
const store = require('../../store/index');

Page({
  data: {
    messages: [],
    groupId: 'group_001',
    groupInfo: {},
    onlineCount: 0,
    showAddSheet: false,
    userId: '',
    loading: false,
    hasMore: true
  },

  onLoad() {
    const userInfo = store.get('userInfo');
    this.setData({ userId: userInfo ? userInfo.id : '' });
    this.loadGroupInfo();
    this.loadMessages();
    this.connectWebSocket();
  },

  onUnload() {
    ws.close();
  },

  // 加载群聊信息
  async loadGroupInfo() {
    try {
      const groupInfo = await chatService.getGroupInfo(this.data.groupId);
      this.setData({ groupInfo, onlineCount: groupInfo.onlineCount });
    } catch (error) {
      console.error('加载群聊信息失败:', error);
    }
  },

  // 加载历史消息
  async loadMessages() {
    if (this.data.loading || !this.data.hasMore) return;
    
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

  // 连接 WebSocket
  connectWebSocket() {
    ws.connect(this.data.groupId);
    
    this.unsubscribeMessage = ws.onMessage((data) => {
      switch (data.type) {
        case 'message':
          this.setData({
            messages: [...this.data.messages, data.data]
          });
          this.scrollToBottom();
          break;
        case 'online_count':
          this.setData({ onlineCount: data.data.count });
          break;
      }
    });
  },

  // 发送文字消息
  async onSendMessage(e) {
    const { content } = e.detail;
    try {
      await chatService.sendMessage(this.data.groupId, 'text', content);
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  },

  // 显示添加弹窗
  onShowAddSheet() {
    this.setData({ showAddSheet: true });
  },

  // 关闭添加弹窗
  onCloseAddSheet() {
    this.setData({ showAddSheet: false });
  },

  // 选择店铺
  onSelectShop() {
    this.setData({ showAddSheet: false });
    wx.navigateTo({
      url: '/pages/shop-select/shop-select'
    });
  },

  // 选择照片
  onSelectPhoto() {
    this.setData({ showAddSheet: false });
    wx.navigateTo({
      url: '/pages/photo-select/photo-select'
    });
  },

  // 点击店铺卡片
  onTapShopCard(e) {
    const { shopId } = e.detail;
    wx.navigateTo({
      url: `/pages/shop-detail/shop-detail?id=${shopId}`
    });
  },

  // 滚动到底部
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
