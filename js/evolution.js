// ==================== 复杂进化树系统 ====================

const Evolution = {
  // 进化路线定义（可继续扩展）
  // 格式：当前形态 -> 可进化方向
  routes: {
    // 基础路线示例
    "default": [
      { name: "觉醒体", requireLevel: 2, cost: ["能量核心"], hpMul: 1.4, atkMul: 1.3, skill: "觉醒冲击" },
      { name: "完全体", requireLevel: 4, cost: ["进化石", "觉醒体"], hpMul: 1.8, atkMul: 1.6, skill: "完全形态" }
    ]
  },

  // 根据生物标签/稀有度动态生成可进化选项
  getPossibleEvolutions(creature) {
    const options = [];

    // 1. 等级进化
    if (creature.level < 3) {
      options.push({
        id: "level_up",
        name: `${creature.name}·成长`,
        desc: "通过战斗成长，属性小幅提升",
        require: { level: creature.level },
        effect: { hp: 15, atk: 6, level: 1 }
      });
    }

    // 2. 元素融合进化（需要特定材料）
    if (creature.tags && creature.tags.length > 0) {
      options.push({
        id: "element_fuse",
        name: `元素·${creature.tags[0]}形态`,
        desc: `与「${creature.tags[0]}」深度融合，获得新能力`,
        require: { item: creature.tags[0] + "精华" },
        effect: { hpMul: 1.35, atkMul: 1.25, newSkill: true }
      });
    }

    // 3. 稀有度突破
    if (creature.rarity === "普通" || creature.rarity === "稀有") {
      options.push({
        id: "rarity_break",
        name: `突破·${creature.rarity === "普通" ? "稀有" : "史诗"}`,
        desc: "突破稀有度限制，大幅提升潜力",
        require: { level: 3, item: "突破符" },
        effect: { 
          rarity: creature.rarity === "普通" ? "稀有" : "史诗",
          hpMul: 1.5, 
          atkMul: 1.4 
        }
      });
    }

    // 4. 暗黑/光明双路线
    options.push({
      id: "dark_path",
      name: `暗黑·${creature.name}`,
      desc: "走向黑暗面，攻击力暴增，但生命降低",
      require: { level: 2 },
      effect: { hpMul: 0.85, atkMul: 1.7, tag: "暗黑" }
    });

    options.push({
      id: "light_path",
      name: `圣光·${creature.name}`,
      desc: "走向光明，生命大幅提升，获得恢复技能",
      require: { level: 2 },
      effect: { hpMul: 1.6, atkMul: 1.1, tag: "圣光", skillName: "圣光恢复" }
    });

    // 5. 终极进化（高要求）
    if (creature.level >= 4 && (creature.rarity === "史诗" || creature.rarity === "传说")) {
      options.push({
        id: "ultimate",
        name: `究极·${creature.name}`,
        desc: "终极进化形态，脱胎换骨",
        require: { level: 5, item: "究极核心" },
        effect: { hpMul: 2.0, atkMul: 1.9, rarity: "传说", level: 1 }
      });
    }

    return options;
  },

  // 执行进化
  evolve(creature, optionId) {
    const options = this.getPossibleEvolutions(creature);
    const opt = options.find(o => o.id === optionId);
    if (!opt) return null;

    // 这里可以加材料检查逻辑
    // if (!hasItem(opt.require.item)) return null;

    const newCreature = { ...creature };
    
    // 应用效果
    if (opt.effect.hp) newCreature.hp += opt.effect.hp;
    if (opt.effect.atk) newCreature.atk += opt.effect.atk;
    if (opt.effect.level) newCreature.level += opt.effect.level;
    
    if (opt.effect.hpMul) newCreature.hp = Math.floor(newCreature.hp * opt.effect.hpMul);
    if (opt.effect.atkMul) newCreature.atk = Math.floor(newCreature.atk * opt.effect.atkMul);
    
    if (opt.effect.rarity) newCreature.rarity = opt.effect.rarity;
    if (opt.effect.tag) {
      newCreature.tags = newCreature.tags || [];
      newCreature.tags.push(opt.effect.tag);
    }
    if (opt.effect.skillName) {
      newCreature.skillName = opt.effect.skillName;
      newCreature.skillDesc = "进化后获得的新技能";
    }
    if (opt.effect.newSkill) {
      newCreature.skillName = "融合之力";
      newCreature.skillDesc = "融合后的强大技能";
    }

    newCreature.name = opt.name;
    newCreature.evolved = true;
    newCreature.evoHistory = newCreature.evoHistory || [];
    newCreature.evoHistory.push({
      from: creature.name,
      to: opt.name,
      time: Date.now()
    });

    return newCreature;
  },

  // 渲染进化树 UI
  renderTree(creature, containerId) {
    const options = this.getPossibleEvolutions(creature);
    const html = options.map(opt => `
      <div class="border border-slate-600 rounded-lg p-3 mb-2 hover:border-amber-500 transition">
        <div class="font-medium text-amber-300">${opt.name}</div>
        <div class="text-xs text-slate-400 mt-1">${opt.desc}</div>
        <div class="text-xs text-slate-500 mt-1">
          需求：${opt.require.level ? "等级≥"+opt.require.level : ""} 
          ${opt.require.item ? "材料："+opt.require.item : ""}
        </div>
        <button onclick="doEvolve('${creature.id}', '${opt.id}')" 
                class="mt-2 text-xs px-3 py-1 rounded bg-amber-700 hover:bg-amber-600">
          进化
        </button>
      </div>
    `).join("");

    const el = document.getElementById(containerId);
    if (el) el.innerHTML = html || "<p class='text-slate-500'>暂无可用进化</p>";
  }
};