// ============================================================
//  SPELL SURVIVORS - HUD / UI System + Inventory Panel
// ============================================================

class UI {
  constructor(game) {
    this.game = game;
    this.levelDisplay  = document.getElementById('level-display');
    this.xpFill        = document.getElementById('xp-bar-fill');
    this.xpLabel       = document.getElementById('xp-label');
    this.hpFill        = document.getElementById('hp-bar-fill');
    this.hpLabel       = document.getElementById('hp-label');
    this.timerDisplay  = document.getElementById('timer-display');
    this.killCount     = document.getElementById('kill-count');
    this.relicSlots    = document.getElementById('relic-slots');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.gameoverStats  = document.getElementById('gameover-stats');
    this.restartBtn     = document.getElementById('restart-btn');
    this.wandHudBtn     = document.getElementById('wand-hud-btn');
    this.inventoryPanel = document.getElementById('inventory-panel');

    this.restartBtn.addEventListener('click', () => game.restart());
    this.restartBtn.addEventListener('touchend', e => { e.preventDefault(); game.restart(); });

    this.wandHudBtn.addEventListener('click', () => this.openInventory());
    this.wandHudBtn.addEventListener('touchend', e => { e.preventDefault(); this.openInventory(); });

    document.getElementById('inventory-close-btn').addEventListener('click', () => this.closeInventory());

    // Close when tapping/clicking anywhere outside the content box
    const panel = document.getElementById('inventory-panel');
    const content = document.getElementById('inventory-content');
    const closeOnOutside = (e) => { if (!content.contains(e.target) && !this._dragState) { e.preventDefault(); this.closeInventory(); } };
    panel.addEventListener('click', closeOnOutside);
    panel.addEventListener('touchend', closeOnOutside);

    this._selectedSlot = null; // { type: 'wand'|'inv', index: N }
    this._forgeMode = false;       // legendary forge
    this._rareForgeMode = false;   // rare forge (select 3 gems)
    this._rareForgeSelected = [];  // selected slots for rare forge
    this._diceForgeMode = false;   // dice forge (reroll 1 gem)
    this._dragState = null; // active drag

  }

  update() {
    const player = this.game.player;
    const t = this.game.time;

    this.levelDisplay.textContent = player.level;

    const xpPct = (player.xp / player.xpToNext) * 100;
    this.xpFill.style.width = xpPct + '%';
    this.xpLabel.textContent = `${player.xp} / ${player.xpToNext} XP`;

    const hpPct = (player.hp / player.maxHp) * 100;
    this.hpFill.style.width = hpPct + '%';
    this.hpLabel.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    this.hpFill.style.background =
      hpPct > 50 ? 'linear-gradient(90deg, #880000, #ff3030)' :
      hpPct > 25 ? 'linear-gradient(90deg, #884000, #ff6000)' :
                   'linear-gradient(90deg, #600000, #ff0000)';

    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);
    this.timerDisplay.textContent = `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
    this.killCount.textContent = player.kills;
  }

  updateSlots() {
    // Wand HUD button: show gem count (3 slots now)
    const dots = this.game.wand.socketedGems
      .map(g => g
        ? `<span class="wand-gem-dot gem-dot-${g.rarity}"></span>`
        : `<span class="wand-gem-dot wand-gem-dot-empty"></span>`)
      .join('');
    this.wandHudBtn.innerHTML = `<span style="font-size:22px">✨</span>${dots}`;

    // Relic slots
    this.relicSlots.innerHTML = this.game.relics.map(r =>
      `<div class="slot-icon" title="${r.def.name}" style="border-color:rgba(32,160,96,0.6)">
        ${r.def.icon}
      </div>`
    ).join('');

    // Refresh inventory panel if open
    if (this.game.inventoryOpen) this._renderInventory();
  }

  // ---- Inventory panel ----
  openInventory() {
    if (this.game.upgradeSystem.active) return;
    this._selectedSlot = null;
    this.game.inventoryOpen = true;
    this._renderInventory();
    this.inventoryPanel.classList.remove('hidden');
  }

  closeInventory() {
    if (this._forgeMode || this._rareForgeMode || this._diceForgeMode) return; // must use Skip to cancel forge
    this.game.inventoryOpen = false;
    this._selectedSlot = null;
    this.inventoryPanel.classList.add('hidden');
  }

  _skipForge() {
    this._forgeMode = false;
    this._rareForgeMode = false;
    this._diceForgeMode = false;
    this._rareForgeSelected = [];
    this._selectedSlot = null;
    this.game.inventoryOpen = false;
    this.inventoryPanel.classList.add('hidden');
  }

  openLegendaryForge() {
    this._forgeMode = true;
    this._selectedSlot = null;
    this.game.inventoryOpen = true;
    this._renderInventory();
    this.inventoryPanel.classList.remove('hidden');
  }

  openRareForge() {
    this._forgeMode = false;
    this._diceForgeMode = false;
    this._rareForgeMode = true;
    this._rareForgeSelected = [];
    this._selectedSlot = null;
    this.game.inventoryOpen = true;
    this._renderInventory();
    this.inventoryPanel.classList.remove('hidden');
  }

  openDiceForge() {
    this._forgeMode = false;
    this._rareForgeMode = false;
    this._diceForgeMode = true;
    this._selectedSlot = null;
    this.game.inventoryOpen = true;
    this._renderInventory();
    this.inventoryPanel.classList.remove('hidden');
  }

  _renderInventory() {
    const wand = this.game.wand;
    const inv  = this.game.inventory;

    // Forge mode banner
    const existingBanner = document.getElementById('forge-banner');
    if (existingBanner) existingBanner.remove();
    if (this._forgeMode) {
      const banner = document.createElement('div');
      banner.id = 'forge-banner';
      banner.className = 'forge-banner-legendary';
      banner.innerHTML = '⚒ LEGENDARY FORGE — Tap a gem to upgrade it to Legendary <button class="forge-skip-btn">Skip</button>';
      banner.querySelector('.forge-skip-btn').addEventListener('click', () => this._skipForge());
      banner.querySelector('.forge-skip-btn').addEventListener('touchend', e => { e.preventDefault(); this._skipForge(); });
      document.getElementById('inventory-header').insertAdjacentElement('afterend', banner);
    } else if (this._rareForgeMode) {
      const banner = document.createElement('div');
      banner.id = 'forge-banner';
      banner.className = 'forge-banner-rare';
      const need = 3 - this._rareForgeSelected.length;
      banner.innerHTML = `🔨 RARE FORGE — Select ${need} more gem${need !== 1 ? 's' : ''} to combine into a Rare gem <button class="forge-skip-btn">Skip</button>`;
      banner.querySelector('.forge-skip-btn').addEventListener('click', () => this._skipForge());
      banner.querySelector('.forge-skip-btn').addEventListener('touchend', e => { e.preventDefault(); this._skipForge(); });
      document.getElementById('inventory-header').insertAdjacentElement('afterend', banner);
    } else if (this._diceForgeMode) {
      const banner = document.createElement('div');
      banner.id = 'forge-banner';
      banner.className = 'forge-banner-dice';
      banner.innerHTML = '🎲 DICE FORGE — Tap a Rare or Legendary gem to reroll its mods <button class="forge-skip-btn">Skip</button>';
      banner.querySelector('.forge-skip-btn').addEventListener('click', () => this._skipForge());
      banner.querySelector('.forge-skip-btn').addEventListener('touchend', e => { e.preventDefault(); this._skipForge(); });
      document.getElementById('inventory-header').insertAdjacentElement('afterend', banner);
    }

    // Wand socket slots
    for (let i = 0; i < 3; i++) {
      const el  = document.getElementById(`wand-socket-${i}`);
      if (!el) continue;
      const gem = wand.socketedGems[i];
      const isDragging = this._dragState && this._dragState.type === 'wand' && this._dragState.index === i;
      const isRareSelected = this._rareForgeSelected.some(s => s.type === 'wand' && s.index === i);
      const forgeClass = (this._forgeMode && gem && gem.rarity !== 'legendary') ? ' forge-selectable' :
                         (this._rareForgeMode && gem && gem.rarity !== 'legendary') ? ' forge-selectable-rare' + (isRareSelected ? ' forge-selected' : '') :
                         (this._diceForgeMode && gem && (gem.rarity === 'rare' || gem.rarity === 'legendary')) ? ' forge-selectable-dice' : '';
      el.className = 'wand-gem-slot' + (isDragging ? ' dragging' : '') + forgeClass;
      el.dataset.slotType  = 'wand';
      el.dataset.slotIndex = i;
      el.innerHTML = gem ? this._gemCellHTML(gem) : '<div class="empty-socket-label">Empty Socket</div>';
      el.onpointerdown = (e) => this._onSlotPointerDown(e, 'wand', i);
    }

    // Inventory grid (9 slots)
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const gem  = inv[i];
      const isDragging = this._dragState && this._dragState.type === 'inv' && this._dragState.index === i;
      const isRareSelected = this._rareForgeSelected.some(s => s.type === 'inv' && s.index === i);
      const forgeClass = (this._forgeMode && gem && gem.rarity !== 'legendary') ? ' forge-selectable' :
                         (this._rareForgeMode && gem && gem.rarity !== 'legendary') ? ' forge-selectable-rare' + (isRareSelected ? ' forge-selected' : '') :
                         (this._diceForgeMode && gem && (gem.rarity === 'rare' || gem.rarity === 'legendary')) ? ' forge-selectable-dice' : '';
      const slot = document.createElement('div');
      slot.className = 'inv-slot' + (isDragging ? ' dragging' : '') + forgeClass;
      slot.dataset.slotType  = 'inv';
      slot.dataset.slotIndex = i;
      slot.innerHTML = gem ? this._gemCellHTML(gem) : '<div class="empty-inv-label">—</div>';
      slot.onpointerdown = (e) => this._onSlotPointerDown(e, 'inv', i);
      grid.appendChild(slot);
    }
  }

  _gemCellHTML(gem) {
    const modLines = gem.mods.map(mod => {
      const def = MOD_DEFS[mod.type];
      return `<div class="gem-mod-line gem-mod-line-${def.rarity}">${def.format(mod.value)}</div>`;
    }).join('');
    return `<div class="gem-cell gem-cell-${gem.rarity}">
      <div class="gem-rarity-tag gem-rarity-${gem.rarity}">${gem.rarity.toUpperCase()}</div>
      ${modLines}
    </div>`;
  }

  // ---- Drag and drop ----

  _getGem(s) {
    return s.type === 'wand' ? this.game.wand.socketedGems[s.index] : this.game.inventory[s.index];
  }

  _setGem(s, val) {
    if (s.type === 'wand') {
      this.game.wand.socketedGems[s.index] = val;
      this.game._reapplyAllBonuses();
    } else {
      this.game.inventory[s.index] = val;
    }
  }

  _slotFromElement(el) {
    let node = el;
    while (node && node !== document.body) {
      if (node.dataset && node.dataset.slotType != null) {
        return { type: node.dataset.slotType, index: parseInt(node.dataset.slotIndex) };
      }
      node = node.parentElement;
    }
    return null;
  }

  _onSlotPointerDown(e, type, index) {
    // Legendary forge mode
    if (this._forgeMode) {
      const gem = this._getGem({ type, index });
      if (!gem || gem.rarity === 'legendary') return;
      this._forgifyGem(gem, { type, index }, (s, v) => this._setGem(s, v));
      return;
    }

    // Rare forge mode: select 3 common/rare gems
    if (this._rareForgeMode) {
      const gem = this._getGem({ type, index });
      if (!gem || gem.rarity === 'legendary') return;
      const slot = { type, index };
      const alreadyIdx = this._rareForgeSelected.findIndex(s => s.type === type && s.index === index);
      if (alreadyIdx !== -1) {
        this._rareForgeSelected.splice(alreadyIdx, 1);
      } else {
        this._rareForgeSelected.push(slot);
      }
      if (this._rareForgeSelected.length === 3) {
        this._executeRareForge();
      } else {
        this._renderInventory();
      }
      return;
    }

    // Dice forge mode: reroll a rare/legendary gem
    if (this._diceForgeMode) {
      const gem = this._getGem({ type, index });
      if (!gem || (gem.rarity !== 'rare' && gem.rarity !== 'legendary')) return;
      this._executeDiceForge(gem, { type, index });
      return;
    }

    const gem = this._getGem({ type, index });
    if (!gem) return;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX, startY = e.clientY;
    let dragging = false;

    // Ghost element that follows the pointer
    const ghost = document.createElement('div');
    ghost.id = 'drag-ghost';
    ghost.innerHTML = this._gemCellHTML(gem);
    ghost.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;opacity:0.88;' +
      'transform:translate(-50%,-50%) rotate(3deg);transition:none;';
    ghost.style.left = startX + 'px';
    ghost.style.top  = startY + 'px';

    this._dragState = { type, index, gem };

    const onMove = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!dragging && Math.sqrt(dx*dx + dy*dy) > 5) {
        dragging = true;
        document.body.appendChild(ghost);
        this._renderInventory(); // mark source slot as dragging
      }
      if (dragging) {
        ghost.style.left = ev.clientX + 'px';
        ghost.style.top  = ev.clientY + 'px';
        // Highlight drop target
        ghost.style.visibility = 'hidden';
        const under = document.elementFromPoint(ev.clientX, ev.clientY);
        ghost.style.visibility = '';
        document.querySelectorAll('.drop-over').forEach(el => el.classList.remove('drop-over'));
        const toSlot = this._slotFromElement(under);
        if (toSlot) {
          const toEl = toSlot.type === 'wand'
            ? document.getElementById(`wand-socket-${toSlot.index}`)
            : document.getElementById('inventory-grid')?.children[toSlot.index];
          if (toEl) toEl.classList.add('drop-over');
        }
      }
    };

    const onUp = (ev) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      ghost.remove();
      document.querySelectorAll('.drop-over').forEach(el => el.classList.remove('drop-over'));
      this._dragState = null;

      if (dragging) {
        // Complete drop
        ghost.style.visibility = 'hidden';
        const under = document.elementFromPoint(ev.clientX, ev.clientY);
        const to = this._slotFromElement(under);
        if (to && !(to.type === type && to.index === index)) {
          const gemA = this._getGem({ type, index });
          const gemB = this._getGem(to);
          this._setGem({ type, index }, gemB);
          this._setGem(to, gemA);
          this.updateSlots();
        }
      }
      this._renderInventory();
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  _forgifyGem(gem, slot, setGem) {
    const legendaryKeys = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'legendary');
    // Add a legendary mod not already present
    const missing = legendaryKeys.filter(k => !gem.mods.some(m => m.type === k));
    const legKey = missing.length ? pick(missing) : pick(legendaryKeys);
    gem.rarity = 'legendary';
    gem.mods.unshift({ type: legKey, value: null });
    if (gem.mods.length > 4) gem.mods.length = 4;
    setGem(slot, gem);
    this._forgeMode = false;
    this.game.inventoryOpen = false;
    this.inventoryPanel.classList.add('hidden');
    this.game._reapplyAllBonuses();
    this.updateSlots();
    this.game.particles.levelUpBurst(this.game.player.x, this.game.player.y);
  }

  _executeRareForge() {
    // Combine 3 selected gems into a new rare gem, keeping 1 mod from each
    const gems = this._rareForgeSelected.map(s => this._getGem(s));
    const keptMods = gems.map(g => pick(g.mods)).filter(Boolean);
    const newGem = generateGem();
    newGem.rarity = 'rare';
    newGem.mods = keptMods.slice(0, 3);

    // Clear source slots (first selected gets the new gem)
    for (let i = 1; i < this._rareForgeSelected.length; i++) {
      this._setGem(this._rareForgeSelected[i], null);
    }
    this._setGem(this._rareForgeSelected[0], newGem);

    this._rareForgeMode = false;
    this._rareForgeSelected = [];
    this.game.inventoryOpen = false;
    this.inventoryPanel.classList.add('hidden');
    this.game._reapplyAllBonuses();
    this.updateSlots();
    this.game.particles.levelUpBurst(this.game.player.x, this.game.player.y);
  }

  _executeDiceForge(gem, slot) {
    // Reroll gem at the same rarity (or legendary stays legendary)
    const targetRarity = gem.rarity;
    const newGem = generateGem(targetRarity);
    this._setGem(slot, newGem);

    this._diceForgeMode = false;
    this.game.inventoryOpen = false;
    this.inventoryPanel.classList.add('hidden');
    this.game._reapplyAllBonuses();
    this.updateSlots();
    this.game.particles.levelUpBurst(this.game.player.x, this.game.player.y);
  }

  showGameOver() {
    const player = this.game.player;
    const t = this.game.time;
    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);

    const gemSummary = this.game.wand.socketedGems
      .filter(g => g)
      .map(g => `${g.rarity.charAt(0).toUpperCase() + g.rarity.slice(1)} Gem`)
      .join(', ') || 'No gems socketed';

    this.gameoverStats.innerHTML = `
      <div class="stat-line">Time Survived: ${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}</div>
      <div class="stat-line">Level Reached: ${player.level}</div>
      <div class="stat-line">Enemies Slain: ${player.kills}</div>
      <div class="stat-line">Gems Socketed: ${gemSummary}</div>
      <div class="stat-line">Relics: ${this.game.relics.map(r => r.def.name).join(', ') || 'None'}</div>
    `;
    this.gameoverScreen.classList.remove('hidden');
  }

  hideGameOver() { this.gameoverScreen.classList.add('hidden'); }

  drawBossBar(ctx, boss, width, height) {
    if (!boss || boss.isDead) return;
    const barW = width * 0.6, barH = 16;
    const x = (width - barW) / 2, y = height - 36;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - 4, y - 4, barW + 8, barH + 20);
    ctx.strokeStyle = '#880000'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 4, y - 4, barW + 8, barH + 20);

    ctx.font = 'bold 10px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4040'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 6;
    ctx.fillText(`★ ${boss.def.name.toUpperCase()} ★`, x + barW/2, y + barH + 10);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#200000'; ctx.fillRect(x, y, barW, barH);
    const ratio = clamp(boss.hp / boss.maxHp, 0, 1);
    const grad = ctx.createLinearGradient(x, 0, x + barW, 0);
    grad.addColorStop(0, '#880000'); grad.addColorStop(0.5, '#ff3030'); grad.addColorStop(1, '#ff6000');
    ctx.fillStyle = grad; ctx.fillRect(x, y, barW * ratio, barH);
    ctx.strokeStyle = '#cc0000'; ctx.lineWidth = 1; ctx.strokeRect(x, y, barW, barH);
    ctx.font = '10px "Courier New"'; ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.ceil(boss.hp)} / ${boss.maxHp}`, x + barW/2, y + barH/2 + 3.5);
  }
}
