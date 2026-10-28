// ==================== 留存系统：签到连续奖励 / 每日挑战词 / 成就图鉴 / 战斗连胜 ====================
const Retention = {
  key: "absurd_retention",

  // 每日挑战词池（按日期轮换，也可以当成每天发抖音/小红书的选题）
  DAILY_WORDS: ["996", "周一", "奶茶", "外卖", "老板", "相亲", "蚊子", "闹钟", "快递", "加班",
    "减肥", "泡面", "键盘", "月亮", "西红柿", "打工人", "内卷", "咖啡", "地铁", "双十一",
    "考研", "红包", "鸡蛋", "拖延症", "蟑螂", "暴富", "WiFi", "充电宝", "火锅", "晚高峰"],

  ACHIEVEMENTS: [
    { id: "first",    name: "初出茅庐", desc: "合成第一个生物",   reward: 1 },
    { id: "col5",     name: "小有收藏", desc: "收藏 5 个生物",     reward: 2 },
    { id: "col10",    name: "收藏家",   desc: "收藏 10 个生物",    reward: 3 },
    { id: "legend",   name: "欧皇附体", desc: "获得 1 个传说生物", reward: 3 },
    { id: "evolve",   name: "进化先锋", desc: "完成 1 次进化",     reward: 2 },
    { id: "win3",     name: "三连胜",   desc: "战斗连胜 3 场",     reward: 2 },
    { id: "win10",    name: "十连胜",   desc: "战斗连胜 10 场",    reward: 5 },
    { id: "streak7",  name: "坚持不懈", desc: "连续签到 7 天",     reward: 5 },
    { id: "daily3",   name: "挑战达人", desc: "累计完成 3 次每日挑战", reward: 3 }
  ],

  data: null,

  // ---------- 存取 ----------
  load() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(this.key) || "{}"); } catch (e) { d = {}; }
    this.data = Object.assign({
      lastCheckin: "", streak: 0, bestStreakDays: 0,
      challengeDate: "", challengeTotal: 0,
      winStreak: 0, bestWinStreak: 0, winsDate: "", winsToday: 0,
      unlocked: {}, everLegend: false, evolveCount: 0, combineCount: 0
    }, d);
  },
  save() {
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { console.warn("留存数据保存失败", e); }
  },

  today() {
    const d = new Date();
    const m = ("0" + (d.getMonth() + 1)).slice(-2), day = ("0" + d.getDate()).slice(-2);
    return d.getFullYear() + "-" + m + "-" + day;
  },
  dayIndex() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); },
  dailyWord() { return this.DAILY_WORDS[this.dayIndex() % this.DAILY_WORDS.length]; },

  // ---------- 提示 ----------
  toast(msg) {
    let box = document.getElementById("toastBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "toastBox";
      box.className = "fixed top-4 left-1/2 -translate-x-1/2 z-[60] space-y-2 pointer-events-none";
      document.body.appendChild(box);
    }
    const t = document.createElement("div");
    t.className = "bg-slate-800 border border-amber-500/60 text-amber-200 text-sm px-4 py-2 rounded-full shadow-xl";
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  },

  // ---------- 初始化 + 签到 ----------
  init() {
    this.load();
    this.checkIn();
    this.render();
  },

  checkIn() {
    const d = this.data, today = this.today();
    if (d.lastCheckin === today) return;

    const y = new Date(); y.setDate(y.getDate() - 1);
    const ym = ("0" + (y.getMonth() + 1)).slice(-2), yd = ("0" + y.getDate()).slice(-2);
    const yesterday = y.getFullYear() + "-" + ym + "-" + yd;

    d.streak = d.lastCheckin === yesterday ? d.streak + 1 : 1;
    d.bestStreakDays = Math.max(d.bestStreakDays, d.streak);
    d.lastCheckin = today;

    // 连续签到奖励：第 3 天 +2，第 7 天 +5，其余 +1
    let reward = 1;
    if (d.streak % 7 === 0) reward = 5;
    else if (d.streak % 3 === 0) reward = 2;
    AdsManager.addBonus(reward);
    this.save();
    this.toast("🔥 连续签到 " + d.streak + " 天，奖励 +" + reward + " 次");
    if (d.streak >= 7) this.unlock("streak7");
  },

  // ---------- 事件 ----------
  onCombine(a, b, creature) {
    const d = this.data;
    d.combineCount += 1;
    if (creature && creature.rarity === "传说") d.everLegend = true;

    // 每日挑战：用了今日词，每天首次 +2 次
    const word = this.dailyWord();
    const used = [a, b].some(function (x) { return String(x).trim().toLowerCase() === word.toLowerCase(); });
    if (used && d.challengeDate !== this.today()) {
      d.challengeDate = this.today();
      d.challengeTotal += 1;
      AdsManager.addBonus(2);
      this.toast("🎯 完成今日挑战「" + word + "」，奖励 +2 次");
      if (d.challengeTotal >= 3) this.unlock("daily3");
    }
    this.unlock("first");
    if (d.everLegend) this.unlock("legend");
    this.save();
    this.render();
  },

  onCollect(collection) {
    if (collection.length >= 5) this.unlock("col5");
    if (collection.length >= 10) this.unlock("col10");
    if (collection.some(function (c) { return c.rarity === "传说"; })) { this.data.everLegend = true; this.unlock("legend"); }
    this.save();
    this.render();
  },

  onEvolve() {
    this.data.evolveCount += 1;
    this.unlock("evolve");
    this.save();
    this.render();
  },

  getWinStreak() { return this.data.winStreak || 0; },

  onBattleWin() {
    const d = this.data, today = this.today();
    d.winStreak += 1;
    d.bestWinStreak = Math.max(d.bestWinStreak, d.winStreak);
    if (d.winsDate !== today) { d.winsDate = today; d.winsToday = 0; }
    d.winsToday += 1;
    // 每天前 3 场胜利 +1 次合成机会：战斗 → 合成 的循环
    if (d.winsToday <= 3) {
      AdsManager.addBonus(1);
      this.toast("🏆 今日第 " + d.winsToday + " 场胜利，奖励 +1 次（每天前 3 场）");
    }
    if (d.winStreak >= 3) this.unlock("win3");
    if (d.winStreak >= 10) this.unlock("win10");
    this.save();
    this.render();
  },

  onBattleLoss() {
    this.data.winStreak = 0;
    this.save();
    this.render();
  },

  unlock(id) {
    if (this.data.unlocked[id]) return;
    const a = this.ACHIEVEMENTS.find(function (x) { return x.id === id; });
    if (!a) return;
    this.data.unlocked[id] = this.today();
    AdsManager.addBonus(a.reward);
    this.toast("🏅 成就解锁「" + a.name + "」，奖励 +" + a.reward + " 次");
  },

  // ---------- 渲染 ----------
  render() {
    const d = this.data;
    if (!d) return;

    const bar = document.getElementById("dailyBar");
    if (bar) {
      const word = this.dailyWord();
      const done = d.challengeDate === this.today();
      bar.innerHTML =
        '<span class="px-3 py-1 rounded-full bg-orange-900/40 text-orange-300">🔥 连续签到 ' + d.streak + ' 天</span>' +
        '<span class="px-3 py-1 rounded-full ' + (done ? 'bg-emerald-900/40 text-emerald-300' : 'bg-violet-900/50 text-violet-200') + '">' +
          (done ? '✅ 今日挑战已完成' : '🎯 今日挑战词：「' + word + '」用它合成 +2次') + '</span>' +
        '<span class="px-3 py-1 rounded-full bg-sky-900/40 text-sky-300">⚔️ 连胜 ' + d.winStreak + '（最高 ' + d.bestWinStreak + '）</span>';
    }

    const panel = document.getElementById("achievePanel");
    if (panel) {
      const total = this.ACHIEVEMENTS.length;
      const got = Object.keys(d.unlocked).length;
      let html = '<div class="text-xs text-slate-400 mb-2">已解锁 ' + got + ' / ' + total + '，解锁还能领取次数奖励</div>';
      html += '<div class="grid grid-cols-1 gap-2">';
      this.ACHIEVEMENTS.forEach(function (a) {
        const ok = !!d.unlocked[a.id];
        html += '<div class="flex items-center justify-between rounded-lg px-3 py-2 text-xs ' +
          (ok ? 'bg-emerald-900/30 border border-emerald-700/50' : 'bg-slate-800/70 border border-slate-700') + '">' +
          '<div><div class="font-medium ' + (ok ? 'text-emerald-300' : 'text-slate-300') + '">' + (ok ? '✅ ' : '🔒 ') + a.name + '</div>' +
          '<div class="text-slate-500 mt-0.5">' + a.desc + '</div></div>' +
          '<div class="text-amber-400 shrink-0">+' + a.reward + '次</div></div>';
      });
      html += '</div>';
      panel.innerHTML = html;
    }
  }
};
