const uploadService = require('../../services/upload');
const chatService = require('../../services/chat');

Page({
  data: {
    photos: []
  },

  // 返回
  onBack() {
    wx.navigateBack();
  },

  // 选择照片
  onChoosePhoto() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const photos = res.tempFiles.map(file => file.tempFilePath);
        this.setData({ 
          photos: [...this.data.photos, ...photos]
        });
      }
    });
  },

  // 删除照片
  onDeletePhoto(e) {
    const { index } = e.currentTarget.dataset;
    
    this.setData({
      photos: this.data.photos.filter((_, i) => i !== index)
    });
  },

  // 发送照片
  async onSendPhotos() {
    if (this.data.photos.length === 0) {
      wx.showToast({ title: '请选择照片', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发送中...' });

    try {
      const pages = getCurrentPages();
      const chatPage = pages.find(p => p.route === 'pages/chat/chat');
      
      if (!chatPage) {
        wx.hideLoading();
        wx.showToast({ title: '发送失败', icon: 'none' });
        return;
      }

      // 上传所有照片
      for (const photo of this.data.photos) {
        const result = await uploadService.uploadImage(photo);
        await chatService.sendMessage(
          chatPage.data.groupId,
          'image',
          result.fileId
        );
      }

      wx.hideLoading();
      wx.navigateBack();
    } catch (error) {
      wx.hideLoading();
      console.error('发送照片失败:', error);
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  }
});
