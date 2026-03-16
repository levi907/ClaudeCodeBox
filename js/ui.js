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
    const closeOnOutside = (e) => { if (!content.contains(e.target)) { e.preventDefault(); this.closeInventory(); } };
    panel.addEventListener('click', closeOnOutside);
    panel.addEventListener('touchend', closeOnOutside);

    this._selectedSlot = null; // { type: 'wand'|'inv', index: N }
    this._forgeMode = false;
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
    // Wand HUD button: show gem count
    const gems = this.game.wand.socketedGems.filter(g => g);
    const gemDots = gems.map(g => `<span class="wand-gem-dot gem-dot-${g.rarity}"></span>`).join('');
    this.wandHudBtn.innerHTML = `✨ ${gemDots}`;

    // Relic slots
    this.relicSlots.innerHTML = this.game.relics.map(r =>
      `<div class="slot-icon" title="${r.def.name} Lv${r.level}" style="border-color:rgba(32,160,96,0.6)">
        ${r.def.icon}
        <span class="slot-level" style="color:#60ffa0">${r.level}</span>
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
    if (this._forgeMode) return; // must pick a gem to forge
    this.game.inventoryOpen = false;
    this._selectedSlot = null;
    this.inventoryPanel.classList.add('hidden');
  }

  openLegendaryForge() {
    this._forgeMode = true;
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
      banner.innerHTML = '⚒ LEGENDARY FORGE — Tap a gem to upgrade it to Legendary';
      document.getElementById('inventory-header').insertAdjacentElement('afterend', banner);
    }

    // Wand stats readout
    const ws = wand.computeStats();
    const statEl = document.getElementById('wand-stats-readout');
    if (statEl) {
      statEl.textContent = `DMG ${ws.damage}  ·  CD ${ws.cooldown.toFixed(2)}s  ·  PROJ ${ws.projectiles}` +
        (ws.pierce > 0 ? `  ·  PIERCE ${ws.pierce}` : '') +
        (ws.bounce > 0 ? `  ·  BOUNCE ${ws.bounce}` : '') +
        (ws.chain  > 0 ? `  ·  CHAIN ${ws.chain}`   : '') +
        (ws.spiral          ? '  ·  SPIRAL'  : '') +
        (ws.explosive       ? '  ·  EXPLOSIVE': '') +
        (ws.virulentPoison  ? '  ·  POISON'  : '');
    }

    // Wand socket slots
    for (let i = 0; i < 2; i++) {
      const el  = document.getElementById(`wand-socket-${i}`);
      if (!el) continue;
      const gem = wand.socketedGems[i];
      const isSel = this._selectedSlot && this._selectedSlot.type === 'wand' && this._selectedSlot.index === i;
      const forgeClass = (this._forgeMode && gem && gem.rarity !== 'legendary') ? ' forge-selectable' : '';
      el.className = 'wand-gem-slot' + (isSel ? ' selected' : '') + forgeClass;
      el.innerHTML = gem ? this._gemCellHTML(gem) : '<div class="empty-socket-label">Empty Socket</div>';
      el.onclick = () => this._handleSlotClick('wand', i);
    }

    // Inventory grid (9 slots)
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const gem  = inv[i];
      const isSel = this._selectedSlot && this._selectedSlot.type === 'inv' && this._selectedSlot.index === i;
      const forgeClass = (this._forgeMode && gem && gem.rarity !== 'legendary') ? ' forge-selectable' : '';
      const slot = document.createElement('div');
      slot.className = 'inv-slot' + (isSel ? ' selected' : '') + forgeClass;
      slot.innerHTML = gem ? this._gemCellHTML(gem) : '<div class="empty-inv-label">—</div>';
      slot.onclick = () => this._handleSlotClick('inv', i);
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

  _handleSlotClick(type, index) {
    const getGem = (s) =>
      s.type === 'wand' ? this.game.wand.socketedGems[s.index] : this.game.inventory[s.index];

    const setGem = (s, val) => {
      if (s.type === 'wand') {
        this.game.wand.socketedGems[s.index] = val;
        this.game._reapplyAllBonuses();
      } else {
        this.game.inventory[s.index] = val;
      }
    };

    // Forge mode: upgrade selected gem to legendary
    if (this._forgeMode) {
      const gem = getGem({ type, index });
      if (!gem || gem.rarity === 'legendary') return;
      this._forgifyGem(gem, { type, index }, setGem);
      return;
    }

    if (!this._selectedSlot) {
      if (getGem({ type, index })) {
        this._selectedSlot = { type, index };
        this._renderInventory();
      }
    } else {
      const from = this._selectedSlot;
      const gemA = getGem(from);
      const gemB = getGem({ type, index });
      setGem(from, gemB);
      setGem({ type, index }, gemA);
      this._selectedSlot = null;
      this._renderInventory();
      this.updateSlots();
    }
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
