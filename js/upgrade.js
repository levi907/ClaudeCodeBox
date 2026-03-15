// ============================================================
//  SPELL SURVIVORS - Upgrade Draft System (Pick 3)
// ============================================================

class UpgradeSystem {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.cards = [];
    this._resolve = null;
    this._setupUI();
  }

  _setupUI() {
    this.screen = document.getElementById('upgrade-screen');
    this.cardsEl = document.getElementById('upgrade-cards');
    this.titleEl = document.getElementById('upgrade-title');
    this.subtitleEl = document.getElementById('upgrade-subtitle');
  }

  // Generate a pool of 3 upgrade options
  generateCards() {
    const options = [];
    const player = this.game.player;
    const weapons = this.game.weapons;
    const relics = this.game.relics;

    // 1) Level up existing weapons
    for (const w of weapons) {
      if (w.level < w.maxLevel) {
        options.push({ kind: 'weapon_upgrade', id: w.id, newLevel: w.level + 1 });
      }
    }

    // 2) New weapons (if slots available)
    if (weapons.length < CONFIG.MAX_WEAPONS) {
      for (const id of Object.keys(WEAPON_DEFS)) {
        if (!weapons.find(w => w.id === id)) {
          options.push({ kind: 'new_weapon', id });
        }
      }
    }

    // 3) Level up existing relics
    for (const r of relics) {
      if (r.level < r.maxLevel) {
        options.push({ kind: 'relic_upgrade', id: r.id, newLevel: r.level + 1 });
      }
    }

    // 4) New relics (if slots available)
    if (relics.length < CONFIG.MAX_RELICS) {
      for (const id of Object.keys(RELIC_DEFS)) {
        if (!relics.find(r => r.id === id)) {
          options.push({ kind: 'new_relic', id });
        }
      }
    }

    // Shuffle and pick 3 (prefer upgrades over new items for variety)
    const upgrades = shuffleArray(options.filter(o => o.kind.endsWith('_upgrade')));
    const newItems = shuffleArray(options.filter(o => o.kind.startsWith('new_')));

    // Mix: aim for 2 upgrades + 1 new, or fill with what's available
    let pool = [];
    pool.push(...upgrades.slice(0, 2));
    pool.push(...newItems.slice(0, 1));
    if (pool.length < 3) pool.push(...upgrades.slice(2, 3));
    if (pool.length < 3) pool.push(...newItems.slice(1, 3));

    // Deduplicate
    const seen = new Set();
    pool = pool.filter(o => {
      const key = o.kind + ':' + o.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return pool.slice(0, 3);
  }

  buildCardHTML(option) {
    const player = this.game.player;
    const weapons = this.game.weapons;
    const relics = this.game.relics;

    let icon, name, typeLabel, badgeClass, desc, levelPips, rarityClass;

    if (option.kind === 'weapon_upgrade') {
      const w = weapons.find(w => w.id === option.id);
      const def = WEAPON_DEFS[option.id];
      icon = def.icon;
      name = def.name;
      typeLabel = `LVL ${option.newLevel} UPGRADE`;
      badgeClass = 'badge-weapon';
      desc = def.levels[option.newLevel - 1].desc;
      rarityClass = 'rarity-weapon';
      levelPips = this._buildPips(w.level, w.maxLevel, true);
    } else if (option.kind === 'new_weapon') {
      const def = WEAPON_DEFS[option.id];
      icon = def.icon;
      name = def.name;
      typeLabel = 'NEW WEAPON';
      badgeClass = 'badge-weapon';
      desc = def.desc;
      rarityClass = 'rarity-epic';
      levelPips = this._buildPips(0, def.levels.length, false);
    } else if (option.kind === 'relic_upgrade') {
      const r = relics.find(r => r.id === option.id);
      const def = RELIC_DEFS[option.id];
      icon = def.icon;
      name = def.name;
      typeLabel = `LVL ${option.newLevel} UPGRADE`;
      badgeClass = 'badge-relic';
      desc = def.levels[option.newLevel - 1].desc;
      rarityClass = 'rarity-relic';
      levelPips = this._buildPips(r.level, r.maxLevel, true);
    } else if (option.kind === 'new_relic') {
      const def = RELIC_DEFS[option.id];
      icon = def.icon;
      name = def.name;
      typeLabel = 'NEW RELIC';
      badgeClass = 'badge-relic';
      desc = def.desc;
      rarityClass = 'rarity-rare';
      levelPips = this._buildPips(0, def.levels.length, false);
    }

    return `
      <div class="upgrade-card ${rarityClass}" data-kind="${option.kind}" data-id="${option.id}">
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

  show() {
    return new Promise(resolve => {
      this._resolve = resolve;
      const options = this.generateCards();
      this.cards = options;

      this.titleEl.textContent = `Level ${this.game.player.level}!`;
      this.subtitleEl.textContent = 'Choose your upgrade';
      this.cardsEl.innerHTML = options.map(o => this.buildCardHTML(o)).join('');

      // Attach click handlers
      const cardEls = this.cardsEl.querySelectorAll('.upgrade-card');
      cardEls.forEach((el, i) => {
        el.addEventListener('click', () => this._pick(i), { once: true });
        el.addEventListener('touchend', (e) => { e.preventDefault(); this._pick(i); }, { once: true, passive: false });
      });

      this.screen.classList.remove('hidden');
      this.active = true;
    });
  }

  _pick(index) {
    if (!this.active) return;
    this.active = false;
    this.screen.classList.add('hidden');
    this._applyUpgrade(this.cards[index]);
    if (this._resolve) {
      this._resolve();
      this._resolve = null;
    }
  }

  _applyUpgrade(option) {
    const game = this.game;
    const player = game.player;

    if (option.kind === 'weapon_upgrade') {
      const w = game.weapons.find(w => w.id === option.id);
      if (w) w.levelUp();
    } else if (option.kind === 'new_weapon') {
      const w = new WeaponInstance(option.id);
      game.weapons.push(w);
    } else if (option.kind === 'relic_upgrade') {
      const r = game.relics.find(r => r.id === option.id);
      if (r) {
        r.levelUp();
        r.apply(player);
      }
    } else if (option.kind === 'new_relic') {
      const r = new RelicInstance(option.id);
      game.relics.push(r);
      r.apply(player);
    }

    // Re-apply all relics to sync multipliers
    game._reapplyRelics();
    game.ui.updateSlots();
  }
}
