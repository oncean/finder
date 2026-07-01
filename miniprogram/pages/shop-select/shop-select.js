const shopService = require('../../services/shop');
const chatService = require('../../services/chat');
const { getCurrentLocation } = require('../../utils/location');
const app = getApp();
const store = require('../../store/index');

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

  onBack() {
    wx.navigateBack();
  },

  async getLocation() {
    try {
      const location = await getCurrentLocation ? getCurrentLocation() : null;
      this.setData({ location });
    } catch (error) {
      console.error('获取位置失败:', error);
    }
  },

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

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearchConfirm() {
    this.loadShops();
  },

  onSelectShop(e) {
    const { shop } = e.currentTarget.dataset;
    this.setData({ selectedShop: shop });
  },

  async onSendShop() {
    if (!this.data.selectedShop) {
      wx.showToast({ title: '请选择店铺', icon: 'none' });
      return;
    }

    const groupId = app.globalData.groupId || store.get('groupId');
    if (!groupId) {
      wx.showToast({ title: '聊天室未初始化', icon: 'none' });
      return;
    }

    try {
      const shop = this.data.selectedShop;
      await chatService.sendMessage(groupId, 'shop_card', shop.id, {
        shopId: shop.id,
        name: shop.name,
        address: shop.address,
        coverImage: shop.coverImage,
        distance: shop.distance || 0,
        summaryTags: shop.summaryTags,
        reviewCount: shop.reviewCount,
        rating: shop.rating
      });
      wx.navigateBack();
    } catch (error) {
      console.error('发送店铺卡片失败:', error);
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  }
});
