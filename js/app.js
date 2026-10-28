// ==================== 主逻辑（修复版） ====================

let collection = JSON.parse(localStorage.getItem("absurd_collection") || "[]");
let currentCreature = null;
let battleState = null;


// ========== 工具函数 ==========
function isValidImage(img) {
  return typeof img === "string" && (img.indexOf("http") === 0 || img.indexOf("data:image/") === 0);
}

// 安全保存收藏：localStorage 满了（约5MB）时不再静默失败，而是提示用户
function saveCollection() {
  try {
    localStorage.setItem("absurd_collection", JSON.stringify(collection));
    return true;
  } catch (e) {
    console.error("保存收藏失败（存储空间可能已满）", e);
    alert("本地存储空间已满，收藏未能保存。请删除一些旧生物，或调小 config.js 里的 IMAGE_SAVE_SIZE。");
    return false;
  }
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  AdsManager.init();
  Retention.init();
  renderCollection();
  updateFighterSelect();
});

// ========== 合成 ==========
async function doCombine() {
  const a = document.getElementById("inputA").value.trim();
  const b = document.getElementById("inputB").value.trim();

  if (!a || !b) {
    alert("请输入两个概念");
    return;
  }

  // 内容安全（前端快速拦截；服务端还会再审一遍）
  const chk = Safety.checkInputs(a, b);
  if (!chk.ok) {
    alert(chk.msg);
    return;
  }

  if (!AdsManager.consume()) {
    alert("今日次数已用完，明天再来吧~");//今日次数已用完！可以「看广告+5次」，或完成每日挑战 / 战斗胜利领取次数
    return;
  }

  const btn = document.getElementById("btnCombine");
  btn.disabled = true;
  btn.textContent = "AI 生成中...";

  try {
    const data = await LLM.generateCreature(a, b);

    const creature = {
      id: "c_" + Date.now(),
      name: data.name || "未知生物",
      desc: data.desc || "一个神秘的存在",
      quote: data.quote || "",
      hp: data.hp || 100,
      atk: data.atk || 30,
      skillName: data.skillName || "普通攻击",
      skillDesc: data.skillDesc || "",
      tags: data.tags || [a, b],
      rarity: data.rarity || "普通",
      level: 1,
      origin: [a, b],
      evolved: false,
      evoHistory: [],
      image: null
    };
    currentCreature = creature;

    // 先显示文字结果
    renderCreatureCard(creature);
    document.getElementById("resultBox").classList.remove("hidden");
    Retention.onCombine(a, b, creature);

    // 异步加载图片（图片到达时，如果用户已经收藏了，也要把图片补存进收藏）
    LLM.generateImage(creature.name, creature.desc).then(url => {
      if (!url) return;
      creature.image = url;
      const inCol = collection.find(c => c.id === creature.id);
      if (inCol) {
        inCol.image = url;
        saveCollection();
        renderCollection();
      }
      if (currentCreature === creature) renderCreatureCard(creature);
    });

  } catch (err) {
    console.error(err);
    AdsManager.refund();   // 失败/被拦截不扣次数
    alert(err && err.code ? err.message : "生成失败，请稍后重试");
  } finally {
    btn.disabled = false;
    btn.textContent = "生成生物（消耗1次）";
  }
}

function renderCreatureCard(c) {
  if (!c) return;

  const rarityColor = {
    "普通": "text-slate-300",
    "稀有": "text-blue-400",
    "史诗": "text-purple-400",
    "传说": "text-amber-400"
  }[c.rarity] || "text-slate-300";

  // 图片部分
  let imgHtml = '<div class="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-violet-600 to-pink-600">🧬</div>';
  
  if (isValidImage(c.image)) {
    imgHtml = '<img src="' + c.image + '" class="w-full h-full object-cover" alt="' + (c.name || '') + '" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'<div class=\\\'w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-violet-600 to-pink-600\\\'>🧬</div>\'">';
  }

  const card = document.getElementById("creatureCard");
  if (!card) return;

  card.innerHTML = 
    '<div class="flex gap-4">' +
      '<div class="relative w-24 h-24 rounded-xl bg-slate-700 overflow-hidden flex-shrink-0">' + imgHtml + (isValidImage(c.image) ? '<span class="absolute bottom-0 right-0 text-[9px] leading-none bg-black/60 text-white px-1 py-0.5 rounded-tl">AI生成</span>' : '') + '</div>' +
      '<div class="flex-1 min-w-0">' +
        '<div class="font-bold text-lg ' + rarityColor + '">' + (c.name || "未知") + '</div>' +
        '<div class="text-xs text-slate-400 mt-0.5">' + (c.origin ? c.origin.join(" + ") : "") + " · " + (c.rarity || "") + '</div>' +
        '<p class="text-sm text-slate-300 mt-2">' + (c.desc || "") + '</p>' +
      '</div>' +
    '</div>' +
    '<div class="flex gap-3 mt-3 text-xs">' +
      '<span class="bg-rose-900/40 px-2.5 py-1 rounded-full">HP ' + (c.hp || 0) + '</span>' +
      '<span class="bg-orange-900/40 px-2.5 py-1 rounded-full">ATK ' + (c.atk || 0) + '</span>' +
      '<span class="bg-indigo-900/40 px-2.5 py-1 rounded-full">Lv.' + (c.level || 1) + '</span>' +
    '</div>' +
    '<div class="text-xs text-cyan-400 mt-2">技能：' + (c.skillName || "") + ' - ' + (c.skillDesc || "") + '</div>' +
    (c.quote ? '<div class="text-xs text-pink-300 italic mt-2">「' + c.quote + '」</div>' : '');
}

/* function renderCreatureCard(c) {
  if (!c) return;

  const rarityColor = {
    "普通": "text-slate-300",
    "稀有": "text-blue-400",
    "史诗": "text-purple-400",
    "传说": "text-amber-400"
  }[c.rarity] || "text-slate-300";

  // 图片处理（更稳健）
  let imgHtml = '<div class="w-full h-full flex items-center justify-center text-3xl bg-slate-700">🧬</div>';
  
  if (isValidImage(c.image)) {
    imgHtml = '<img src="' + c.image + '" class="w-full h-full object-cover" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'<div class=\\\'w-full h-full flex items-center justify-center text-3xl\\\'>🧬</div>\'">';
  }

  const card = document.getElementById("creatureCard");
  if (!card) return;

  card.innerHTML = 
    '<div class="flex gap-4">' +
      '<div class="w-24 h-24 rounded-xl bg-slate-700 overflow-hidden flex-shrink-0">' + imgHtml + '</div>' +
      '<div class="flex-1 min-w-0">' +
        '<div class="font-bold text-lg ' + rarityColor + '">' + (c.name || "未知") + '</div>' +
        '<div class="text-xs text-slate-400 mt-0.5">' + (c.origin ? c.origin.join(" + ") : "") + " · " + (c.rarity || "") + '</div>' +
        '<p class="text-sm text-slate-300 mt-2">' + (c.desc || "") + '</p>' +
      '</div>' +
    '</div>' +
    '<div class="flex gap-3 mt-3 text-xs">' +
      '<span class="bg-rose-900/40 px-2.5 py-1 rounded-full">HP ' + (c.hp || 0) + '</span>' +
      '<span class="bg-orange-900/40 px-2.5 py-1 rounded-full">ATK ' + (c.atk || 0) + '</span>' +
      '<span class="bg-indigo-900/40 px-2.5 py-1 rounded-full">Lv.' + (c.level || 1) + '</span>' +
    '</div>' +
    '<div class="text-xs text-cyan-400 mt-2">技能：' + (c.skillName || "") + ' - ' + (c.skillDesc || "") + '</div>';
} */

// ========== 收藏 ==========
function addToCollection() {
  if (!currentCreature) return;
  if (collection.find(c => c.name === currentCreature.name)) {
    alert("已有同名生物");
    return;
  }
  collection.push(Object.assign({}, currentCreature));
  saveCollection();
  renderCollection();
  updateFighterSelect();
  Retention.onCollect(collection);
  alert("【" + currentCreature.name + "】已加入收藏！");
}

function renderCollection() {
  const box = document.getElementById("collectionList");
  if (!box) return;

  if (collection.length === 0) {
    box.innerHTML = '<p class="text-slate-500 text-sm text-center py-8">还没有生物，先去合成一个吧</p>';
    return;
  }

  let html = "";
  collection.forEach(function(c, i) {
    html += '<div class="bg-slate-800 rounded-xl p-3 border border-slate-700 hover:border-cyan-500 transition cursor-pointer" onclick="selectCreature(' + i + ')">' +
      '<div class="flex items-center gap-3">' +
        '<div class="w-12 h-12 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">' +
          (isValidImage(c.image) ? '<img src="' + c.image + '" class="w-full h-full object-cover">' : '<div class="w-full h-full flex items-center justify-center">🧬</div>') +
        '</div>' +
        '<div class="min-w-0 flex-1">' +
          '<div class="font-medium text-sm truncate">' + c.name + '</div>' +
          '<div class="text-xs text-slate-400">HP ' + c.hp + ' · ATK ' + c.atk + ' · Lv.' + c.level + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  });
  box.innerHTML = html;
}

function selectCreature(index) {
  const c = collection[index];
  currentCreature = c;
  renderCreatureCard(c);
  document.getElementById("resultBox").classList.remove("hidden");
  if (typeof Evolution !== "undefined") {
    Evolution.renderTree(c, "evoTree");
  }
}

function updateFighterSelect() {
  const sel = document.getElementById("fighterSelect");
  if (!sel) return;
  
  if (collection.length === 0) {
    sel.innerHTML = '<option>请先收藏生物</option>';
    return;
  }
  
  let html = "";
  collection.forEach(function(c, i) {
    html += '<option value="' + i + '">' + c.name + ' (HP' + c.hp + '/ATK' + c.atk + ')</option>';
  });
  sel.innerHTML = html;
}

// ========== 进化 ==========
function showEvolutionPanel() {
  if (!currentCreature) return;
  if (typeof Evolution !== "undefined") {
    Evolution.renderTree(currentCreature, "evoModalContent");
  }
  const modal = document.getElementById("evoModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeEvoModal() {
  const modal = document.getElementById("evoModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function doEvolve(creatureId, optionId) {
  const idx = collection.findIndex(c => c.id === creatureId);
  
  if (idx === -1) {
    // 当前未收藏的临时进化
    if (typeof Evolution !== "undefined") {
      const evolved = Evolution.evolve(currentCreature, optionId);
      if (evolved) {
        currentCreature = evolved;
        renderCreatureCard(currentCreature);
        Retention.onEvolve();
      alert("进化成功！变为【" + evolved.name + "】");
        closeEvoModal();
      }
    }
    return;
  }

  if (typeof Evolution !== "undefined") {
    const evolved = Evolution.evolve(collection[idx], optionId);
    if (evolved) {
      collection[idx] = evolved;
      saveCollection();
      currentCreature = evolved;
      renderCollection();
      updateFighterSelect();
      renderCreatureCard(evolved);
      Evolution.renderTree(evolved, "evoTree");
      Retention.onEvolve();
      alert("进化成功！变为【" + evolved.name + "】");
      closeEvoModal();
    }
  }
}

// ========== 战斗（可操作：攻击 / 技能 / 防御，连胜越高敌人越强） ==========
function startBattle() {
  if (collection.length === 0) {
    alert("请先合成并收藏生物");
    return;
  }

  const idx = document.getElementById("fighterSelect").value;
  const me = Object.assign({}, collection[idx]);
  me.currentHp = me.hp;
  me.skillCd = 0;

  // 连胜越高，敌人越强（上限 +80%）
  const streak = Retention.getWinStreak();
  const scale = 1 + Math.min(streak, 10) * 0.08;

  const enemyPool = ["虚空史莱姆", "代码幽灵", "过期灵感", "凌晨BUG", "无限循环虫", "产品经理", "周一综合症", "拖延恶魔"];
  const enemy = {
    name: enemyPool[Math.floor(Math.random() * enemyPool.length)],
    hp: Math.floor((90 + Math.floor(Math.random() * 100)) * scale),
    atk: Math.floor((28 + Math.floor(Math.random() * 35)) * scale),
    currentHp: 0
  };
  enemy.currentHp = enemy.hp;

  battleState = { me: me, enemy: enemy, log: [], over: false };

  document.getElementById("battleBox").classList.remove("hidden");
  document.getElementById("battleActions").classList.remove("hidden");
  updateBattleUI();
  addLog("战斗开始！【" + me.name + "】 VS 【" + enemy.name + "】" + (streak > 0 ? "（当前连胜 " + streak + "，敌人强化 " + Math.round((scale - 1) * 100) + "%）" : ""));
}

function updateBattleUI() {
  if (!battleState) return;
  const me = battleState.me;
  const enemy = battleState.enemy;

  document.getElementById("battleMe").innerHTML =
    '<div class="font-bold text-cyan-300 text-sm">' + me.name + '</div>' +
    '<div class="text-xs mt-1">' + me.currentHp + '/' + me.hp + '</div>' +
    '<div class="w-full bg-slate-700 h-1.5 rounded-full mt-1">' +
      '<div class="bg-cyan-400 h-1.5 rounded-full" style="width:' + Math.max(0, me.currentHp / me.hp * 100) + '%"></div>' +
    '</div>';

  document.getElementById("battleEnemy").innerHTML =
    '<div class="font-bold text-rose-300 text-sm">' + enemy.name + '</div>' +
    '<div class="text-xs mt-1">' + enemy.currentHp + '/' + enemy.hp + '</div>' +
    '<div class="w-full bg-slate-700 h-1.5 rounded-full mt-1">' +
      '<div class="bg-rose-400 h-1.5 rounded-full" style="width:' + Math.max(0, enemy.currentHp / enemy.hp * 100) + '%"></div>' +
    '</div>';

  const skillBtn = document.getElementById("btnSkill");
  if (skillBtn) {
    skillBtn.textContent = me.skillCd > 0 ? "技能冷却 " + me.skillCd : "技能·" + (me.skillName || "必杀");
    skillBtn.disabled = me.skillCd > 0;
    skillBtn.classList.toggle("opacity-40", me.skillCd > 0);
  }
}

function addLog(msg) {
  if (!battleState) return;
  battleState.log.push(msg);
  const box = document.getElementById("battleLog");
  box.innerHTML = battleState.log.map(function(l) { return "<div>" + l + "</div>"; }).join("");
  box.scrollTop = box.scrollHeight;
}

function endBattleUI() {
  battleState.over = true;
  document.getElementById("battleActions").classList.add("hidden");
}

// action: "attack" | "skill" | "defend"
function battleAction(action) {
  if (!battleState || battleState.over) return;
  const me = battleState.me;
  const enemy = battleState.enemy;

  // ---- 我方行动 ----
  let defending = false;
  if (action === "skill" && me.skillCd <= 0) {
    const dmg = Math.floor((me.atk + Math.floor(Math.random() * 15 - 7)) * 1.8);
    enemy.currentHp = Math.max(0, enemy.currentHp - dmg);
    me.skillCd = 3;
    addLog("✨【" + me.name + "】发动【" + me.skillName + "】！造成 " + dmg + " 伤害");
  } else if (action === "defend") {
    defending = true;
    const heal = Math.floor(me.hp * 0.05);
    me.currentHp = Math.min(me.hp, me.currentHp + heal);
    addLog("🛡️【" + me.name + "】进入防御姿态，恢复 " + heal + " 生命，本回合受到伤害大幅降低");
  } else {
    let dmg = me.atk + Math.floor(Math.random() * 15 - 7);
    if (Math.random() < 0.15) {
      dmg = Math.floor(dmg * 1.5);
      addLog("💥【" + me.name + "】暴击！造成 " + dmg + " 伤害");
    } else {
      addLog("【" + me.name + "】攻击，造成 " + dmg + " 伤害");
    }
    enemy.currentHp = Math.max(0, enemy.currentHp - dmg);
  }

  // ---- 胜利 ----
  if (enemy.currentHp <= 0) {
    addLog("🎉 胜利！【" + me.name + "】获胜");
    endBattleUI();
    const idx = collection.findIndex(c => c.id === me.id);
    if (idx > -1) {
      collection[idx].hp += 3 + Math.floor(Math.random() * 6);
      collection[idx].atk += 1 + Math.floor(Math.random() * 3);
      if (Math.random() < 0.3) collection[idx].level = Math.min(10, (collection[idx].level || 1) + 1);
      saveCollection();
      renderCollection();
      updateFighterSelect();
    }
    Retention.onBattleWin();
    updateBattleUI();
    return;
  }

  // ---- 敌方行动 ----
  let edmg = enemy.atk + Math.floor(Math.random() * 12 - 5);
  if (Math.random() < 0.22) {
    edmg = Math.floor(edmg * 1.4);
    addLog("【" + enemy.name + "】发动强力一击！");
  }
  if (defending) edmg = Math.floor(edmg * 0.4);
  me.currentHp = Math.max(0, me.currentHp - edmg);
  addLog("【" + enemy.name + "】攻击，造成 " + edmg + " 伤害");

  if (me.skillCd > 0 && action !== "skill") me.skillCd -= 1;

  if (me.currentHp <= 0) {
    addLog("💀 战败…… 连胜中断，换个生物再来！");
    endBattleUI();
    Retention.onBattleLoss();
  }

  updateBattleUI();
}
