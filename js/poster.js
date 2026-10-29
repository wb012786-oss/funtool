// ==================== 分享海报（canvas 绘制，保存后可发抖音/小红书/朋友圈） ====================
const Poster = {
  COLORS: {
    "普通": { main: "#94a3b8", bg1: "#1e293b", bg2: "#0f172a" },
    "稀有": { main: "#60a5fa", bg1: "#1e3a8a", bg2: "#0f172a" },
    "史诗": { main: "#c084fc", bg1: "#581c87", bg2: "#0f172a" },
    "传说": { main: "#fbbf24", bg1: "#9a3412", bg2: "#1e1b4b" }
  },

  currentDataUrl: "",

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // 中文按字符折行，返回实际占用的最后一行 y
  wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const chars = Array.from(String(text || ""));
    let line = "", lines = 0;
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines++;
        if (maxLines && lines >= maxLines) { ctx.fillText(line.slice(0, -1) + "…", x, y); return y; }
        ctx.fillText(line, x, y);
        line = chars[i];
        y += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, y);
    return y;
  },

  loadImage(src) {
    return new Promise(function (resolve) {
      if (!src) return resolve(null);
      const im = new Image();
      if (src.indexOf("data:") !== 0) im.crossOrigin = "anonymous";
      im.onload = function () { resolve(im); };
      im.onerror = function () { resolve(null); };
      im.src = src;
    });
  },

  async make(c) {
    const W = 750, H = 1180;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const col = this.COLORS[c.rarity] || this.COLORS["普通"];

    // 背景
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, col.bg1); g.addColorStop(1, col.bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // 星点装饰（用名字做种子，同一个生物每次海报一致）
    let seed = 0; Array.from(c.name || "x").forEach(function (ch) { seed = (seed * 31 + ch.charCodeAt(0)) % 100003; });
    const rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, rnd() * 2 + 0.5, 0, Math.PI * 2); ctx.fill(); }

    // 顶部标题
    ctx.textAlign = "center";
    ctx.fillStyle = "#f9a8d4"; ctx.font = "bold 40px sans-serif";
    ctx.fillText(CONFIG.SITE_NAME || "脑洞进化战", W / 2, 80);
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = "22px sans-serif";
    ctx.fillText((c.origin ? c.origin.join(" + ") : "") + " = ?", W / 2, 120);

    // 主卡片
    const cx = 55, cy = 150, cw = W - 110, ch = 880;
    ctx.save();
    ctx.shadowColor = col.main; ctx.shadowBlur = 40;
    this.roundRect(ctx, cx, cy, cw, ch, 36);
    ctx.fillStyle = "rgba(15,23,42,0.86)"; ctx.fill();
    ctx.restore();
    this.roundRect(ctx, cx, cy, cw, ch, 36);
    ctx.lineWidth = 4; ctx.strokeStyle = col.main; ctx.stroke();

    // 图片
    const img = await this.loadImage(c.image);
    const ix = cx + 130, iy = cy + 40, is = cw - 260;
    ctx.save();
    this.roundRect(ctx, ix, iy, is, is, 28);
    ctx.clip();
    if (img) {
      ctx.drawImage(img, ix, iy, is, is);
    } else {
      const pg = ctx.createLinearGradient(ix, iy, ix + is, iy + is);
      pg.addColorStop(0, "#7c3aed"); pg.addColorStop(1, "#db2777");
      ctx.fillStyle = pg; ctx.fillRect(ix, iy, is, is);
      ctx.font = "160px sans-serif"; ctx.fillStyle = "#fff"; ctx.fillText("🧬", W / 2, iy + is / 2 + 55);
    }
    ctx.restore();

    // 稀有度徽章
    ctx.fillStyle = col.main;
    this.roundRect(ctx, ix + 16, iy + 16, 120, 46, 23); ctx.fill();
    ctx.fillStyle = "#0f172a"; ctx.font = "bold 26px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(c.rarity || "普通", ix + 76, iy + 49);

    // AI 标识（合规：AI 生成内容需显著标注）
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    this.roundRect(ctx, ix + is - 120, iy + is - 46, 108, 34, 17); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "20px sans-serif";
    ctx.fillText("AI生成", ix + is - 66, iy + is - 22);

    // 名字
    let y = iy + is + 80;
    ctx.fillStyle = col.main; ctx.font = "bold 54px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(c.name || "未知生物", W / 2, y);

    // 属性
    y += 62;
    const stats = [["HP", c.hp, "#fb7185"], ["ATK", c.atk, "#fb923c"], ["Lv", c.level || 1, "#818cf8"]];
    const sw = 170, gap = 24, sx0 = (W - (sw * 3 + gap * 2)) / 2;
    stats.forEach(function (s, i) {
      const x = sx0 + i * (sw + gap);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      Poster.roundRect(ctx, x, y - 38, sw, 56, 28); ctx.fill();
      ctx.fillStyle = s[2]; ctx.font = "bold 28px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(s[0] + " " + s[1], x + sw / 2, y);
    });

    // 技能（过长自动换行，最多 2 行）
    y += 62;
    ctx.fillStyle = "#22d3ee"; ctx.font = "24px sans-serif";
    y = this.wrapText(ctx, "技能：" + (c.skillName || "") + (c.skillDesc ? " - " + c.skillDesc : ""), W / 2, y, cw - 100, 34, 2);

    // 简介（最多 2 行）/ 台词（最多 2 行）
    y += 52;
    ctx.fillStyle = "#cbd5e1"; ctx.font = "26px sans-serif";
    y = this.wrapText(ctx, c.desc || "", W / 2, y, cw - 100, 38, 2);
    if (c.quote) {
      y += 58;
      ctx.fillStyle = col.main; ctx.font = "italic 28px sans-serif";
      this.wrapText(ctx, "「" + c.quote + "」", W / 2, y, cw - 100, 38, 2);
    }

    // 底部引导
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "bold 28px sans-serif";
    ctx.fillText(CONFIG.SHARE_TEXT || "输入两个概念，AI 帮你合成一只离谱生物", W / 2, H - 78);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "22px sans-serif";
    ctx.fillText((CONFIG.SHARE_URL ? CONFIG.SHARE_URL + "  ·  " : "") + "内容由 AI 生成，仅供娱乐", W / 2, H - 36);

    return canvas.toDataURL("image/png");
  },

  async open(c) {
    if (!c) { alert("请先合成或选择一个生物"); return; }
    const modal = document.getElementById("posterModal");
    const imgEl = document.getElementById("posterImg");
    const tip = document.getElementById("posterTip");
    if (!modal || !imgEl) return;

    modal.classList.remove("hidden"); modal.classList.add("flex");
    imgEl.classList.add("opacity-30");
    if (tip) tip.textContent = "海报生成中…";
    try {
      this.currentDataUrl = await this.make(c);
      imgEl.src = this.currentDataUrl;
      imgEl.dataset.name = c.name || "creature";
      imgEl.classList.remove("opacity-30");
      if (tip) tip.textContent = "手机端：长按图片保存；电脑端：点「保存图片」";
    } catch (e) {
      console.error("海报生成失败", e);
      if (tip) tip.textContent = "海报生成失败，请重试";
    }
  },

  download() {
    if (!this.currentDataUrl) return;
    const a = document.createElement("a");
    a.href = this.currentDataUrl;
    a.download = (document.getElementById("posterImg").dataset.name || "creature") + ".png";
    document.body.appendChild(a); a.click(); a.remove();
  },

  close() {
    const modal = document.getElementById("posterModal");
    if (modal) { modal.classList.add("hidden"); modal.classList.remove("flex"); }
  }
};

function openPoster() { Poster.open(currentCreature); }
