// ==================== 内容安全（前端第一道过滤） ====================
// ⚠️ 这只是体验层的快速拦截，真正的拦截在 server/worker.js（服务端，用户绕不过）。
// 词库是起步版，上线后请持续补充；量大建议接入阿里云/腾讯云「内容安全」文本审核接口。
const Safety = {
  WORDS: ["色情", "淫秽", "裸体", "裸照", "性交", "做爱", "强奸", "轮奸", "约炮", "嫖娼", "卖淫", "招嫖", "幼女", "恋童", "porn", "hentai", "nude", "rape", "fuck", "杀人", "砍人", "血腥", "斩首", "碎尸", "屠杀", "虐杀", "恐怖袭击", "恐怖分子", "制造炸弹", "爆炸物", "自杀", "自残", "毒品", "吸毒", "冰毒", "海洛因", "摇头丸", "赌博", "赌场", "博彩", "洗钱", "诈骗", "买卖枪支", "傻逼", "煞笔", "操你妈", "去死吧", "反动", "颠覆国家", "分裂国家", "法轮功", "台独", "藏独", "疆独", "港独", "六四事件", "天安门事件", "习近平"],

  _normed: null,

  // 统一归一化：全角转半角、转小写、去掉所有空格/标点/符号（防止「杀 人」「杀-人」绕过）
  norm(s) {
    return String(s || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  },

  _getWords() {
    if (!this._normed) this._normed = this.WORDS.map(w => this.norm(w)).filter(Boolean);
    return this._normed;
  },

  // 检查任意文本，返回 { ok, word }
  check(text) {
    const n = this.norm(text);
    if (!n) return { ok: false, word: "" };
    const words = this._getWords();
    for (let i = 0; i < words.length; i++) {
      if (n.indexOf(words[i]) !== -1) return { ok: false, word: words[i] };
    }
    return { ok: true };
  },

  // 检查两个输入概念：长度 + 敏感词
  checkInputs(a, b) {
    const max = (typeof CONFIG !== "undefined" && CONFIG.MAX_INPUT_LEN) || 12;
    const list = [a, b];
    for (let i = 0; i < list.length; i++) {
      const t = String(list[i] || "").trim();
      if (!t || !this.norm(t)) return { ok: false, msg: "请输入有效的文字概念（不能只有符号）" };
      if (Array.from(t).length > max) return { ok: false, msg: "每个概念最多 " + max + " 个字，请精简一下" };
      if (!this.check(t).ok) return { ok: false, msg: "输入内容不合规，请换一个概念试试" };
    }
    return { ok: true };
  }
};
