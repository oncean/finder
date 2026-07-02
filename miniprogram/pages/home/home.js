const app = getApp();
const chatService = require('../../services/chat');
const store = require('../../store/index');
const { updateMe } = require('../../services/auth');
const { getCurrentLocation } = require('../../utils/location');

Page({
  data: {
    activeTab: 'chat',
    swiperIndex: 0,
    groupId: '',
    groupInfo: {},
    userId: '',
    isInitialized: false,
    noGroup: false
  },

  async onLoad() {
    console.log('Home page onLoad');
    if (this.data.isInitialized) {
      console.log('已初始化，跳过');
      return;
    }
    this.data.isInitialized = true;

    const userInfo = store.get('userInfo');
    this.setData({ userId: userInfo ? userInfo.id : '' });

    await this.initChat();
  },

  onUnload() {
    this.data.isInitialized = false;
  },

  // ==================== Tab / Swiper 切换 ====================

  onTabChange(e) {
    const { tab } = e.detail;
    const swiperIndex = tab === 'chat' ? 0 : 1;
    this.setData({ activeTab: tab, swiperIndex });
  },

  onSwiperChange(e) {
    const { current } = e.detail;
    const tab = current === 0 ? 'chat' : 'feed';
    this.setData({ activeTab: tab, swiperIndex: current });
  },

  // ==================== 初始化 ====================

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
    } catch (error) {
      console.error('初始化群聊失败:', error);
      this.setData({ noGroup: true });
    }
  },

  async ensureLocation() {
    if (app.globalData.location) {
      return;
    }
    if (app.initLocationPromise) {
      await app.initLocationPromise;
      if (app.globalData.location) {
        return;
      }
    }
    try {
      const location = await getCurrentLocation();
      app.globalData.location = location;
      store.set('location', location);

      const userInfo = store.get('userInfo');
      if (userInfo && location) {
        await updateMe({ location });
      }
    } catch (error) {
      console.error('获取位置失败:', error);
    }
  }
});
