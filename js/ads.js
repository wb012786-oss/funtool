// ==================== 激励广告 & 次数控制 ====================

const AdsManager = {
  storageKey: "absurd_ads_data",

  // 获取今日数据
  getTodayData() {
    const today = new Date().toDateString();
    let data = JSON.parse(localStorage.getItem(this.storageKey) || "{}");
    
    if (data.date !== today) {
      // 新的一天，重置
      data = {
        date: today,
        used: 0,
        adWatched: 0,
        remain: CONFIG.DAILY_FREE_TIMES
      };
      this.save(data);
    }
    return data;
  },

  save(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  },

  // 获取剩余次数
  getRemain() {
    return this.getTodayData().remain;
  },

  // 消耗一次
  consume() {
    const data = this.getTodayData();
    if (data.remain <= 0) return false;
    data.remain -= 1;
    data.used += 1;
    this.save(data);
    this.updateUI();
    return true;
  },

  // 失败退还 1 次（生成失败/被拦截时调用）
  refund() {
    const data = this.getTodayData();
    data.remain += 1;
    data.used = Math.max(0, data.used - 1);
    this.save(data);
    this.updateUI();
  },

  // 活动/签到/成就等奖励次数
  addBonus(n) {
    const data = this.getTodayData();
    data.remain += n;
    this.save(data);
    this.updateUI();
  },

  // 看广告奖励
  async watchRewardedAd() {
    const data = this.getTodayData();
    
    if (data.adWatched >= CONFIG.MAX_DAILY_AD) {
      alert("今天看广告次数已达上限，明天再来吧～");
      return false;
    }

    // ========== 这里替换成真实激励视频 SDK ==========
    // 示例（伪代码）：
    // await window.tt.rewardVideoAd.show()  // 抖音
    // await window.wx.createRewardedVideoAd(...) // 微信
    // 穿山甲 / 优量汇 等

    // 当前用模拟
    return new Promise((resolve) => {
      const confirmed = confirm("【模拟激励广告】\n\n点击确定 = 看完广告\n将获得 +" + CONFIG.AD_REWARD_TIMES + " 次生成机会");
      
      if (confirmed) {
        data.remain += CONFIG.AD_REWARD_TIMES;
        data.adWatched += 1;
        this.save(data);
        this.updateUI();
        alert(`广告观看成功！获得 ${CONFIG.AD_REWARD_TIMES} 次，当前剩余 ${data.remain} 次`);
        resolve(true);
      } else {
        resolve(false);
      }
    });
  },

  updateUI() {
    const el = document.getElementById("remainCount");
    if (el) el.textContent = this.getRemain();
  },

  // 初始化
  init() {
    this.updateUI();
  }
};

// 全局函数方便调用
function watchAd() {
  AdsManager.watchRewardedAd();
}