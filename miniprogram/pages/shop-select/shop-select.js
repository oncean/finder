const shopService = require('../../services/shop');
const chatService = require('../../services/chat');
const { getCurrentLocation } = require('../../utils/location');

Page({
  data: {
    shops: [],
    keyword: '',
    location: null,
    loading: false,
    selectedShop: null
  },

  async onLoad() {
    await this.getLocation();
    this.loadShops();
  },

  // 获取位置
  async getLocation() {
    try {
      const location = await getCurrentLocation();
      this.setData({ location });
    } catch (error) {
      console.error('获取位置失败:', error);
    }
  },

  // 加载店铺列表
  async loadShops() {
    this.setData({ loading: true });
    try {
      const params = {
        keyword: this.data.keyword,
        page: 1,
        pageSize: 20
      };
      
      if (this.data.location) {
        params.lat = this.data.location.lat;
        params.lng = this.data.location.lng;
      }
      
      const data = await shopService.getShops(params);
      this.setData({ shops: data.list, loading: false });
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载店铺失败:', error);
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  // 搜索确认
  onSearchConfirm() {
    this.loadShops();
  },

  // 选择店铺
  onSelectShop(e) {
    const { shop } = e.currentTarget.dataset;
    this.setData({ selectedShop: shop });
  },

  // 发送店铺卡片
  async onSendShop() {
    if (!this.data.selectedShop) {
      wx.showToast({ title: '请选择店铺', icon: 'none' });
      return;
    }

    try {
      const pages = getCurrentPages();
      const chatPage = pages.find(p => p.route === 'pages/chat/chat');
      
      if (chatPage) {
        await chatService.sendMessage(
          chatPage.data.groupId,
          'shop_card',
          this.data.selectedShop.id
        );
        wx.navigateBack();
      } else {
        wx.showToast({ title: '发送失败', icon: 'none' });
      }
    } catch (error) {
      console.error('发送店铺卡片失败:', error);
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  }
});
