// ============================================================
//  SPELL SURVIVORS - Upgrade Draft System
//  Normal levels: pick 1 of 3 gems
//  Every 5 levels: pick 1 of 3 relics
// ============================================================

class UpgradeSystem {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.cards = [];
    this._resolve = null;
    this._mode = 'gem'; // 'gem' or 'relic'
    this._setupUI();
  }

  _setupUI() {
    this.screen   = document.getElementById('upgrade-screen');
    this.cardsEl  = document.getElementById('upgrade-cards');
    this.titleEl  = document.getElementById('upgrade-title');
    this.subtitleEl = document.getElementById('upgrade-subtitle');
  }

  // ---- Gem draft (normal level-up) ----
  generateGemCards() {
    return [generateGem(), generateGem(), generateGem()];
  }

  // ---- Relic draft (every 5 levels) ----
  generateRelicCards() {
    const relics = this.game.relics;
    const options = [];

    if (relics.length < CONFIG.MAX_RELICS) {
      for (const id of Object.keys(RELIC_DEFS)) {
        if (!relics.find(r => r.id === id)) options.push({ kind: 'new_relic', id });
      }
    }
    for (const r of relics) {
      if (r.level < r.maxLevel) options.push({ kind: 'relic_upgrade', id: r.id, newLevel: r.level + 1 });
    }
    return shuffleArray(options).slice(0, 3);
  }

  // ---- Build HTML for a gem card ----
  buildGemCardHTML(gem) {
    const col = GEM_COLORS[gem.rarity];
    const modLines = gem.mods.map(mod => {
      const def = MOD_DEFS[mod.type];
      return `<div class="gem-mod gem-mod-${def.rarity}">${def.format(mod.value)}</div>`;
    }).join('');

    const rarityLabel = gem.rarity === 'legendary' ? '✦ LEGENDARY ✦' :
                        gem.rarity === 'rare'       ? '◆ RARE'        : '◇ COMMON';

    return `
      <div class="upgrade-card rarity-gem-${gem.rarity}" data-gem-idx>
        <div class="gem-diamond-wrap">
          <div class="gem-diamond gem-diamond-${gem.rarity}"></div>
        </div>
        <div class="card-name">${rarityLabel} GEM</div>
        <div class="gem-mods">${modLines}</div>
      </div>
    `;
  }

  // ---- Build HTML for a relic card ----
  buildRelicCardHTML(option) {
    const relics = this.game.relics;
    let icon, name, typeLabel, badgeClass, desc, levelPips, rarityClass;

    if (option.kind === 'relic_upgrade') {
      const r   = relics.find(r => r.id === option.id);
      const def = RELIC_DEFS[option.id];
      icon = def.icon; name = def.name;
      typeLabel = `LVL ${option.newLevel} UPGRADE`; badgeClass = 'badge-relic';
      desc = def.levels[option.newLevel - 1].desc; rarityClass = 'rarity-relic';
      levelPips = this._buildPips(r.level, r.maxLevel, true);
    } else {
      const def = RELIC_DEFS[option.id];
      icon = def.icon; name = def.name;
      typeLabel = 'NEW RELIC'; badgeClass = 'badge-relic';
      desc = def.desc; rarityClass = 'rarity-rare';
      levelPips = this._buildPips(0, def.levels.length, false);
    }

    return `
      <div class="upgrade-card ${rarityClass}" data-relic-kind="${option.kind}" data-relic-id="${option.id}">
        <span class="card-icon">${icon}</span>
        <div class="card-name">${name}</div>
        <span class="card-type-badge ${badgeClass}">${typeLabel}</span>
        <div class="card-desc">${desc}</div>
        <div class="card-level-bar">${levelPips}</div>
      </div>
    `;
  }

  _buildPips(current, max, showFilled) {
    let html = '';
    for (let i = 0; i < max; i++) {
      const filled = showFilled && i < current;
      html += `<div class="level-pip ${filled ? 'filled' : ''}"></div>`;
    }
    return html;
  }

  show(isRelicReward = false) {
    return new Promise(resolve => {
      this._resolve = resolve;
      this._mode = isRelicReward ? 'relic' : 'gem';

      let options;
      if (isRelicReward) {
        options = this.generateRelicCards();
        this.titleEl.textContent = '✦ Relic Reward ✦';
        this.subtitleEl.textContent = `Level ${this.game.player.level} — Choose a relic`;
        this.screen.classList.add('relic-reward');
        this.cardsEl.innerHTML = options.map(o => this.buildRelicCardHTML(o)).join('');
      } else {
        options = this.generateGemCards();
        this.titleEl.textContent = `Level ${this.game.player.level}!`;
        this.subtitleEl.textContent = 'Choose a gem for your wand';
        this.screen.classList.remove('relic-reward');
        this.cardsEl.innerHTML = options.map(g => this.buildGemCardHTML(g)).join('');
      }
      this.cards = options;

      const cardEls = this.cardsEl.querySelectorAll('.upgrade-card');
      cardEls.forEach((el, i) => {
        el.addEventListener('click', () => this._pick(i), { once: true });
        el.addEventListener('touchend', e => { e.preventDefault(); this._pick(i); }, { once: true, passive: false });
      });

      this.screen.classList.remove('hidden');
      this.active = true;
    });
  }

  _pick(index) {
    if (!this.active) return;
    this.active = false;
    this.screen.classList.remove('relic-reward');
    this.screen.classList.add('hidden');
    this._applyChoice(this.cards[index]);
    if (this._resolve) { this._resolve(); this._resolve = null; }
  }

  _applyChoice(choice) {
    const game = this.game;

    if (this._mode === 'gem') {
      game.addGemReward(choice);
    } else if (choice.kind === 'relic_upgrade') {
      const r = game.relics.find(r => r.id === choice.id);
      if (r) { r.levelUp(); r.apply(game.player); }
    } else if (choice.kind === 'new_relic') {
      const r = new RelicInstance(choice.id);
      game.relics.push(r);
      r.apply(game.player);
    }

    game._reapplyAllBonuses();
    game.ui.updateSlots();
  }
}
