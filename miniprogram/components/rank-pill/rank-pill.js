const RANK_LABELS = ['', '第一', '第二', '第三', '第四', '第五', '第六', '第七', '第八', '第九', '第十'];

Component({
  properties: {
    rank: {
      type: Number,
      value: null,
      observer: 'onRankChange'
    }
  },

  data: {
    rankText: ''
  },

  methods: {
    onRankChange(newVal) {
      if (newVal && newVal >= 1 && newVal <= 10) {
        this.setData({ rankText: `推荐榜${RANK_LABELS[newVal]}` });
      } else {
        this.setData({ rankText: '' });
      }
    }
  },

  lifetimes: {
    attached() {
      this.onRankChange(this.properties.rank);
    }
  }
});