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
    const count = 3 + (this.game.player._extraChoices || 0);
    const gems = [];
    for (let i = 0; i < count; i++) gems.push(generateGem());
    return gems;
  }

  // ---- Relic draft (every 5 levels) ----
  generateRelicCards() {
    const owned = new Set(this.game.relics.map(r => r.id));
    const available = Object.keys(RELIC_DEFS).filter(id => !owned.has(id));
    return shuffleArray(available).slice(0, 3).map(id => ({ kind: 'new_relic', id }));
  }

  // ---- Build HTML for a relic card ----
  buildRelicCardHTML(option) {
    const def = RELIC_DEFS[option.id];
    return `
      <div class="upgrade-card rarity-relic" data-relic-kind="${option.kind}" data-relic-id="${option.id}">
        <span class="card-icon">${def.icon}</span>
        <div class="card-name">${def.name}</div>
        <span class="card-type-badge badge-relic">RELIC</span>
        <div class="card-desc">${def.desc}</div>
      </div>
    `;
  }
  buildGemCardHTML(gem) {
    const modLines = gem.mods.map(mod => {
      const def = MOD_DEFS[mod.type];
      return `<div class="gem-mod gem-mod-${def.rarity}">${def.format(mod.value)}</div>`;
    }).join('');

    const rarityLabel = gem.superLegendary          ? '✦ LEGENDARY <span class="super-legendary-badge">✦+</span>' :
                        gem.rarity === 'legendary'  ? '✦ LEGENDARY ✦' :
                        gem.rarity === 'rare'       ? '◆ RARE'        : '◇ COMMON';
    const cardClass = gem.superLegendary
      ? 'upgrade-card rarity-gem-legendary rarity-gem-super'
      : `upgrade-card rarity-gem-${gem.rarity}`;
    const diamondClass = gem.superLegendary ? 'gem-diamond gem-diamond-legendary gem-diamond-super' : `gem-diamond gem-diamond-${gem.rarity}`;
    const pipClass = gem.superLegendary ? 'gem-corner-pip gem-corner-pip-super' : `gem-corner-pip gem-corner-pip-${gem.rarity}`;

    return `
      <div class="${cardClass}" data-gem-idx style="position:relative">
        <div class="${pipClass}" style="position:absolute;top:8px;right:8px"></div>
        <div class="gem-diamond-wrap">
          <div class="${diamondClass}"></div>
        </div>
        <div class="card-name">${rarityLabel} GEM</div>
        <div class="gem-mods">${modLines}</div>
      </div>
    `;
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
    } else if (choice.kind === 'new_relic') {
      const r = new RelicInstance(choice.id);
      game.relics.push(r);
      r.apply(game.player);
    }

    game._reapplyAllBonuses();
    game.ui.updateSlots();
  }
}
