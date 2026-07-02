const app = getApp();
const postService = require('../../services/post');

Component({
  properties: {
    // 父组件控制是否激活
    active: {
      type: Boolean,
      value: false
    }
  },

  data: {
    recommendations: [],
    loading: false,
    refreshing: false,
    hasMore: true,
    page: 1,
    scrollTop: 0,
    showLatestFloat: false
  },

  lifetimes: {
    attached() {
      this.loadRecommendations();
    }
  },

  observers: {
    'active': function(active) {
      if (active && this.data.recommendations.length === 0 && !this.data.loading) {
        this.loadRecommendations();
      }
    }
  },

  methods: {
    loadRecommendations() {
      if (this.data.loading) return;

      this.setData({ loading: true });
      const params = {
        page: this.data.page,
        pageSize: 10
      };

      const location = app.globalData.location;
      if (location) {
        params.lat = location.lat;
        params.lng = location.lng;
      }

      postService.getRecommendations(params).then(data => {
        this.setData({
          recommendations: this.data.page === 1 ? data.list : [...this.data.recommendations, ...data.list],
          hasMore: data.list.length === 10,
          loading: false
        });
      }).catch(error => {
        this.setData({ loading: false });
        console.error('加载推荐失败:', error);
      });
    },

    onPullDownRefresh() {
      if (this.data.loading) {
        this.setData({ refreshing: false });
        wx.stopPullDownRefresh();
        return;
      }

      this.setData({ refreshing: true, page: 1 });
      this.loadRecommendations();
      wx.nextTick(() => {
        this.setData({ refreshing: false });
        wx.stopPullDownRefresh();
      });
    },

    onReachBottom() {
      if (this.data.hasMore && !this.data.loading) {
        const nextPage = this.data.page + 1;
        this.setData({ loading: true });
        const params = {
          page: nextPage,
          pageSize: 10
        };

        const location = app.globalData.location;
        if (location) {
          params.lat = location.lat;
          params.lng = location.lng;
        }

        postService.getRecommendations(params).then(data => {
          const nextList = data.list || [];
          this.setData({
            recommendations: [...this.data.recommendations, ...nextList],
            page: nextPage,
            hasMore: nextList.length === 10,
            loading: false,
            showLatestFloat: nextList.length > 0
          });
        }).catch(error => {
          this.setData({ loading: false });
          console.error('下拉加载推荐失败:', error);
        });
      }
    },

    onViewLatest() {
      this.setData({
        scrollTop: 1,
        showLatestFloat: false
      });
      setTimeout(() => {
        this.setData({ scrollTop: 0 });
      }, 0);
    },

    onTapPost(e) {
      const { shopId, postId } = e.detail;
      if (postId) {
        wx.navigateTo({
          url: `/pages/comment-detail/comment-detail?commentId=${postId}`
        });
      } else if (shopId) {
        wx.navigateTo({
          url: `/pages/shop-detail/shop-detail?shopId=${shopId}`
        });
      }
    },

    onTapReview(e) {
      const { shopId } = e.detail;
      if (shopId) {
        wx.navigateTo({
          url: `/pages/shop-detail/shop-detail?shopId=${shopId}`
        });
      }
    },

    onTapShop(e) {
      const { shopId } = e.detail;
      if (shopId) {
        wx.navigateTo({
          url: `/pages/shop-detail/shop-detail?shopId=${shopId}`
        });
      }
    }
  }
});
