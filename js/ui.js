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

    // Restart (game over screen)
    const doRestart = () => { this.hideGameOver(); game.restart(); };
    this.restartBtn.addEventListener('click', doRestart);
    this.restartBtn.addEventListener('touchend', e => { e.preventDefault(); doRestart(); });

    // Win screen: Continue (keep playing) + Play Again (full reset)
    const winContinueBtn = document.getElementById('win-continue-btn');
    const doContinue = () => this._continueRun();
    winContinueBtn.addEventListener('click', doContinue);
    winContinueBtn.addEventListener('touchend', e => { e.preventDefault(); doContinue(); });

    this.wandHudBtn.addEventListener('click', () => this.openInventory());
    this.wandHudBtn.addEventListener('touchend', e => { e.preventDefault(); this.openInventory(); });

    // Inventory close — pointerup + stopPropagation to bypass any pointer-capture conflicts
    const closeBtn = document.getElementById('inventory-close-btn');
    closeBtn.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.closeInventory();
    });

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

    this._lastKills = 0;  // for milestone tracking
    this._lastLevel = 1;  // for level badge flip
    this._lastXpPct = 0;  // for XP surge detection

    // Kill milestone element
    const killEl = document.getElementById('kill-counter');
    if (killEl) {
      const ms = document.createElement('div');
      ms.id = 'kill-milestone';
      killEl.insertAdjacentElement('afterend', ms);
    }
  }

  update() {
    const player = this.game.player;
    const t = this.game.time;

    // Level badge flip on level-up
    if (player.level !== this._lastLevel) {
      this._lastLevel = player.level;
      const badge = document.getElementById('level-badge');
      if (badge) {
        badge.classList.remove('level-up-flip');
        void badge.offsetWidth;
        badge.classList.add('level-up-flip');
      }
    }
    this.levelDisplay.textContent = player.level;

    // XP surge flash when bar fills
    const xpPct = (player.xp / player.xpToNext);
    if (xpPct >= 0.99 && this._lastXpPct < 0.99) {
      this.xpFill.classList.remove('xp-surge');
      void this.xpFill.offsetWidth;
      this.xpFill.classList.add('xp-surge');
    }
    this._lastXpPct = xpPct;
    this.xpFill.style.transform = `scaleX(${xpPct})`;
    this.xpLabel.textContent = `${player.xp} / ${player.xpToNext} XP`;

    const hpPct = (player.hp / player.maxHp);
    this.hpFill.style.transform = `scaleX(${hpPct})`;
    this.hpLabel.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    this.hpFill.style.background =
      hpPct > 0.5 ? 'linear-gradient(90deg, #880000, #ff3030)' :
      hpPct > 0.25 ? 'linear-gradient(90deg, #884000, #ff6000)' :
                   'linear-gradient(90deg, #600000, #ff0000)';
    this.hpFill.classList.toggle('hp-danger', hpPct <= 0.25);

    const remaining = Math.max(0, 360 - t);
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    this.timerDisplay.textContent = `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
    this.timerDisplay.style.color = remaining <= 30 ? '#ff4040' : remaining <= 60 ? '#ffaa20' : '';
    this.killCount.textContent = player.kills;

    // Kill milestone notifications
    const milestones = [10, 25, 50, 100, 200, 300, 500];
    for (const m of milestones) {
      if (player.kills >= m && this._lastKills < m) {
        this._showKillMilestone(m);
      }
    }
    this._lastKills = player.kills;
  }

  _showKillMilestone(count) {
    const el = document.getElementById('kill-milestone');
    if (!el) return;
    el.textContent = `✦ ${count} SLAIN ✦`;
    el.classList.remove('milestone-active');
    void el.offsetWidth;
    el.classList.add('milestone-active');
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
      `<div class="slot-icon" data-relic-id="${r.id}" style="border-color:rgba(32,160,96,0.6)">
        ${r.def.icon}
      </div>`
    ).join('');
    this._bindRelicTooltips();

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

    // Draw wand icon on canvas
    const wandCanvas = document.getElementById('wand-icon-canvas');
    if (wandCanvas) {
      const wctx = wandCanvas.getContext('2d');
      wctx.clearRect(0, 0, 56, 56);
      Sprites.drawWandIcon(wctx, 28, 28, 32);
    }

    // Forge mode banner
    const existingBanner = document.getElementById('forge-banner');
    if (existingBanner) existingBanner.remove();
    if (this._forgeMode) {
      const banner = document.createElement('div');
      banner.id = 'forge-banner';
      banner.className = 'forge-banner-legendary';
      banner.innerHTML = '⚒ LEGENDARY FORGE — Upgrade a gem to Legendary, or upgrade a Legendary to <span class="super-legendary-badge">✦+</span> Super Legendary! <button class="forge-skip-btn">Skip</button>';
      banner.querySelector('.forge-skip-btn').addEventListener('click', () => this._skipForge());
      banner.querySelector('.forge-skip-btn').addEventListener('touchend', e => { e.preventDefault(); this._skipForge(); });
      document.getElementById('inventory-header').insertAdjacentElement('afterend', banner);
    } else if (this._rareForgeMode) {
      const banner = document.createElement('div');
      banner.id = 'forge-banner';
      banner.className = 'forge-banner-rare';
      if (this._rareForgeSelected.length === 3) {
        const gems = this._rareForgeSelected.map(s => this._getGem(s));
        const allLeg  = gems.every(g => g.rarity === 'legendary');
        const allRare = gems.every(g => g.rarity === 'rare');
        let resultLabel, resultPreview;
        if (allLeg) {
          resultLabel = `<span class="super-legendary-badge">✦+ SUPER LEGENDARY</span>`;
          resultPreview = `<span class="forge-gem-preview forge-gem-preview-legendary" style="border-color:#ff6600;box-shadow:0 0 8px #ff6600"></span>`;
        } else {
          resultLabel = 'Legendary';
          resultPreview = `<span class="forge-gem-preview forge-gem-preview-legendary"></span>`;
        }
        banner.innerHTML = `🔨 RARE FORGE — Result: ${resultPreview} ${resultLabel} <button class="forge-confirm-btn">⚒ Forge</button> <button class="forge-skip-btn">Skip</button>`;
        banner.querySelector('.forge-confirm-btn').addEventListener('click', () => this._executeRareForge());
        banner.querySelector('.forge-confirm-btn').addEventListener('touchend', e => { e.preventDefault(); this._executeRareForge(); });
      } else {
        const need = 3 - this._rareForgeSelected.length;
        banner.innerHTML = `🔨 RARE FORGE — Select ${need} more gem${need !== 1 ? 's' : ''} (Any 3 = Legendary · 3× Legendary = <span class="super-legendary-badge">✦+ Super!</span>) <button class="forge-skip-btn">Skip</button>`;
      }
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
      const forgeable = this._forgeMode && gem && (gem.rarity !== 'legendary' || (gem.rarity === 'legendary' && !gem.superLegendary));
      const superForgeClass = (forgeable && gem.rarity === 'legendary') ? ' forge-selectable-super' : '';
      const forgeClass = forgeable && gem.rarity !== 'legendary' ? ' forge-selectable' :
                         (this._rareForgeMode && gem && gem.rarity !== 'legendary') ? ' forge-selectable-rare' + (isRareSelected ? ' forge-selected' : '') :
                         (this._rareForgeMode && gem && gem.rarity === 'legendary' && !gem.superLegendary) ? ' forge-selectable-legendary-rare' + (isRareSelected ? ' forge-selected' : '') :
                         (this._diceForgeMode && gem && (gem.rarity === 'rare' || gem.rarity === 'legendary')) ? ' forge-selectable-dice' : '';
      el.className = 'wand-gem-slot' + (isDragging ? ' dragging' : '') + forgeClass + superForgeClass;
      el.dataset.slotType  = 'wand';
      el.dataset.slotIndex = i;
      el.innerHTML = gem ? this._gemCellHTML(gem) : '<div class="empty-socket-label">Empty Socket</div>';
      el.style.touchAction = gem ? 'none' : 'pan-y';
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
      const forgeable2 = this._forgeMode && gem && (gem.rarity !== 'legendary' || (gem.rarity === 'legendary' && !gem.superLegendary));
      const superForgeClass2 = (forgeable2 && gem.rarity === 'legendary') ? ' forge-selectable-super' : '';
      const forgeClass = forgeable2 && gem.rarity !== 'legendary' ? ' forge-selectable' :
                         (this._rareForgeMode && gem && gem.rarity !== 'legendary') ? ' forge-selectable-rare' + (isRareSelected ? ' forge-selected' : '') :
                         (this._rareForgeMode && gem && gem.rarity === 'legendary' && !gem.superLegendary) ? ' forge-selectable-legendary-rare' + (isRareSelected ? ' forge-selected' : '') :
                         (this._diceForgeMode && gem && (gem.rarity === 'rare' || gem.rarity === 'legendary')) ? ' forge-selectable-dice' : '';
      const slot = document.createElement('div');
      slot.className = 'inv-slot' + (isDragging ? ' dragging' : '') + forgeClass + superForgeClass2;
      slot.dataset.slotType  = 'inv';
      slot.dataset.slotIndex = i;
      slot.innerHTML = gem ? this._gemCellHTML(gem) : '<div class="empty-inv-label">—</div>';
      // All slots own the pointer so scroll always works regardless of gem presence.
      slot.style.touchAction = 'none';
      slot.onpointerdown = (e) => this._onSlotPointerDown(e, 'inv', i);
      grid.appendChild(slot);
    }
  }

  _gemCellHTML(gem) {
    const modLines = gem.mods.map(mod => {
      const def = MOD_DEFS[mod.type];
      return `<div class="gem-mod-line gem-mod-line-${def.rarity}">${def.format(mod.value)}</div>`;
    }).join('');
    const rarityLabel = gem.superLegendary
      ? 'LEGENDARY <span class="super-legendary-badge">✦+</span>'
      : gem.rarity.toUpperCase();
    const cellClass = gem.superLegendary ? 'gem-cell gem-cell-legendary gem-cell-super' : `gem-cell gem-cell-${gem.rarity}`;
    const pipClass = gem.superLegendary ? 'gem-corner-pip gem-corner-pip-super' : `gem-corner-pip gem-corner-pip-${gem.rarity}`;
    return `<div class="${cellClass}">
      <div class="${pipClass}"></div>
      <div class="gem-rarity-tag gem-rarity-${gem.rarity}">${rarityLabel}</div>
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
    const isForgeMode = this._forgeMode || this._rareForgeMode || this._diceForgeMode;

    // ── Forge modes: tap-to-select with optional scroll ───
    if (isForgeMode) {
      const startX = e.clientX, startY = e.clientY;
      const invContent = document.getElementById('inventory-content');
      const startScrollTop = invContent ? invContent.scrollTop : 0;
      let scrolled = false;

      const onForgeMove = (ev) => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!scrolled && (dx * dx + dy * dy) > 25) scrolled = true;
        if (scrolled && invContent) invContent.scrollTop = startScrollTop - (ev.clientY - startY);
      };
      const onForgeUp = () => {
        document.removeEventListener('pointermove',   onForgeMove);
        document.removeEventListener('pointerup',     onForgeUp);
        document.removeEventListener('pointercancel', onForgeUp);
        if (scrolled) return;

        if (this._forgeMode) {
          const gem = this._getGem({ type, index });
          if (!gem) return;
          if (gem.rarity === 'legendary' && !gem.superLegendary) {
            this._forgifySuperLegendary(gem, { type, index });
          } else if (gem.rarity !== 'legendary') {
            this._forgifyGem(gem, { type, index }, (s, v) => this._setGem(s, v));
          }
          return;
        }
        if (this._rareForgeMode) {
          const gem = this._getGem({ type, index });
          if (!gem || gem.superLegendary) return;
          const alreadyIdx = this._rareForgeSelected.findIndex(s => s.type === type && s.index === index);
          if (alreadyIdx !== -1) this._rareForgeSelected.splice(alreadyIdx, 1);
          else this._rareForgeSelected.push({ type, index });
          this._renderInventory();
          return;
        }
        if (this._diceForgeMode) {
          const gem = this._getGem({ type, index });
          if (!gem || (gem.rarity !== 'rare' && gem.rarity !== 'legendary')) return;
          this._executeDiceForge(gem, { type, index });
          return;
        }
      };
      document.addEventListener('pointermove',   onForgeMove);
      document.addEventListener('pointerup',     onForgeUp);
      document.addEventListener('pointercancel', onForgeUp);
      return;
    }

    // ── Normal mode: move-to-drag (no long press) ─────────
    const gem = this._getGem({ type, index });
    const startX = e.clientX, startY = e.clientY;
    const invContent = document.getElementById('inventory-content');
    const startScrollTop = invContent ? invContent.scrollTop : 0;

    // Immediate "pressed" feedback on the source element
    const srcEl = type === 'wand'
      ? document.getElementById(`wand-socket-${index}`)
      : document.getElementById('inventory-grid')?.children[index];
    if (srcEl) srcEl.classList.add('gem-held');

    if (!gem) {
      // Empty slot — scroll only
      const onMoveEmpty = (ev) => {
        if (invContent) invContent.scrollTop = startScrollTop - (ev.clientY - startY);
      };
      const onUpEmpty = () => {
        if (srcEl) srcEl.classList.remove('gem-held');
        document.removeEventListener('pointermove',   onMoveEmpty);
        document.removeEventListener('pointerup',     onUpEmpty);
        document.removeEventListener('pointercancel', onUpEmpty);
      };
      document.addEventListener('pointermove',   onMoveEmpty);
      document.addEventListener('pointerup',     onUpEmpty);
      document.addEventListener('pointercancel', onUpEmpty);
      return;
    }

    // State: 'idle' → 'drag' (moved diagonally) or 'scroll' (moved vertically)
    let mode = 'idle';
    let ghost = null;

    const startDrag = (curX, curY) => {
      mode = 'drag';
      if (navigator.vibrate) navigator.vibrate(8);
      if (srcEl) srcEl.classList.remove('gem-held');

      ghost = document.createElement('div');
      ghost.id = 'drag-ghost';
      ghost.innerHTML = this._gemCellHTML(gem);
      ghost.style.cssText =
        `position:fixed;pointer-events:none;z-index:9999;` +
        `left:${curX}px;top:${curY}px;` +
        `transform:translate(-50%,-50%) rotate(2deg);` +
        `will-change:left,top;`;
      document.body.appendChild(ghost);

      this._dragState = { type, index, gem };
      document.body.classList.add('is-dragging');
      this._renderInventory(); // marks source slot .dragging via _dragState
    };

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (mode === 'idle') {
        if (dx * dx + dy * dy < 64) return; // wait for 8px movement
        // Vertical-dominant movement → scroll; anything else → drag
        if (Math.abs(dy) > Math.abs(dx) * 1.8) {
          mode = 'scroll';
          if (srcEl) srcEl.classList.remove('gem-held');
        } else {
          startDrag(ev.clientX, ev.clientY);
        }
      }

      if (mode === 'scroll' && invContent) {
        invContent.scrollTop = startScrollTop - dy;
        return;
      }

      if (mode === 'drag' && ghost) {
        ghost.style.left = ev.clientX + 'px';
        ghost.style.top  = ev.clientY + 'px';

        // Hit-test under the ghost
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

    const cleanupListeners = () => {
      document.removeEventListener('pointermove',   onMove);
      document.removeEventListener('pointerup',     onUp);
      document.removeEventListener('pointercancel', onCancel);
    };

    const onUp = (ev) => {
      cleanupListeners();
      if (srcEl) srcEl.classList.remove('gem-held');
      document.querySelectorAll('.drop-over').forEach(el => el.classList.remove('drop-over'));

      if (mode === 'drag') {
        // Remove ghost, hit-test, swap gems
        ghost.style.visibility = 'hidden';
        const under = document.elementFromPoint(ev.clientX, ev.clientY);
        ghost.remove();
        ghost = null;
        document.body.classList.remove('is-dragging');
        this._dragState = null;

        const to = this._slotFromElement(under);
        if (to && !(to.type === type && to.index === index)) {
          const gemA = this._getGem({ type, index });
          const gemB = this._getGem(to);
          this._setGem({ type, index }, gemB);
          this._setGem(to, gemA);
          if (to.type === 'wand' && gemA) this._socketSnapEffect(to.index, gemA);
          else this._dropEffect(to);
          this.updateSlots();
        }
      } else {
        this._dragState = null;
      }
      this._renderInventory();
    };

    const onCancel = () => {
      cleanupListeners();
      if (srcEl) srcEl.classList.remove('gem-held');
      document.querySelectorAll('.drop-over').forEach(el => el.classList.remove('drop-over'));
      if (ghost) { ghost.remove(); ghost = null; }
      document.body.classList.remove('is-dragging');
      this._dragState = null;
      this._renderInventory();
    };

    document.addEventListener('pointermove',   onMove);
    document.addEventListener('pointerup',     onUp);
    document.addEventListener('pointercancel', onCancel);
  }

  // ── Drop pop effect on inventory slots ───────────────────
  _dropEffect(slot) {
    if (!slot) return;
    const el = slot.type === 'wand'
      ? document.getElementById(`wand-socket-${slot.index}`)
      : document.getElementById('inventory-grid')?.children[slot.index];
    if (!el) return;
    el.classList.remove('gem-drop');
    void el.offsetWidth;
    el.classList.add('gem-drop');
    el.addEventListener('animationend', () => el.classList.remove('gem-drop'), { once: true });
  }

  // ---- Socket snap delight effect ----
  _socketSnapEffect(socketIndex, gem) {
    const el = document.getElementById(`wand-socket-${socketIndex}`);
    if (!el) return;
    // Rune flash overlay
    const rune = document.createElement('div');
    rune.className = 'socket-rune-flash';
    // Rune symbol varies by rarity
    rune.textContent = gem.superLegendary ? '✦' : gem.rarity === 'legendary' ? '✦' : gem.rarity === 'rare' ? '◈' : '⬡';
    el.style.position = 'relative';
    el.appendChild(rune);
    // CSS snap ring animation
    el.classList.remove('socket-snap');
    void el.offsetWidth;
    el.classList.add('socket-snap');
    rune.addEventListener('animationend', () => rune.remove(), { once: true });
    el.addEventListener('animationend', () => el.classList.remove('socket-snap'), { once: true });
  }

  // ---- Forge result modal ----
  _showForgeResult(resultGem, titleText, onConfirm, onCancel) {
    const modal    = document.getElementById('forge-result-modal');
    const gemCard  = document.getElementById('forge-result-gem-card');
    const titleEl  = document.getElementById('forge-result-title');
    const diamond  = document.getElementById('forge-result-diamond');
    const particles = document.getElementById('forge-result-particles');
    const confirmBtn = document.getElementById('forge-result-confirm');
    const cancelBtn  = document.getElementById('forge-result-cancel');

    titleEl.textContent = titleText;

    // Set diamond rarity color
    diamond.className = resultGem.superLegendary ? 'diamond-super'
                      : `diamond-${resultGem.rarity}`;
    // Restart animation
    diamond.classList.remove('gem-reveal-anim');
    void diamond.offsetWidth;
    diamond.classList.add('gem-reveal-anim');

    // Spawn orbital particles
    particles.innerHTML = '';
    const rarityColors = {
      common: '#6688bb', rare: '#6699ff', legendary: '#ffaa33', super: '#ff8800'
    };
    const pColor = resultGem.superLegendary ? rarityColors.super : rarityColors[resultGem.rarity] || '#aa66ff';
    const count = resultGem.superLegendary ? 14 : resultGem.rarity === 'legendary' ? 10 : 7;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'forge-particle';
      p.style.background = pColor;
      p.style.boxShadow = `0 0 4px ${pColor}`;
      p.style.setProperty('--ang', `${(360 / count) * i}deg`);
      p.style.setProperty('--r', `${30 + Math.random() * 20}px`);
      p.style.setProperty('--dur', `${0.7 + Math.random() * 0.4}s`);
      p.style.setProperty('--delay', `${0.1 + Math.random() * 0.25}s`);
      particles.appendChild(p);
      void p.offsetWidth;
      p.classList.add('p-active');
    }

    // Build gem card
    gemCard.innerHTML = this._gemCellHTML(resultGem);

    modal.classList.remove('hidden');

    const cleanup = () => {
      modal.classList.add('hidden');
      confirmBtn.onclick = confirmBtn.ontouchend = null;
      cancelBtn.onclick  = cancelBtn.ontouchend  = null;
    };
    confirmBtn.onclick    = () => { cleanup(); onConfirm(); };
    confirmBtn.ontouchend = (e) => { e.preventDefault(); cleanup(); onConfirm(); };
    cancelBtn.onclick     = () => { cleanup(); if (onCancel) onCancel(); };
    cancelBtn.ontouchend  = (e) => { e.preventDefault(); cleanup(); if (onCancel) onCancel(); };
  }

  _forgifySuperLegendary(gem, slot) {
    // Pre-compute result on a clone so the modal shows exactly what will be applied
    const cloned = { ...gem, mods: gem.mods.map(m => ({ ...m })) };
    upgradeSuperLegendary(cloned);

    this._showForgeResult(cloned, '✦+ SUPER LEGENDARY FORGE!', () => {
      // Apply pre-computed result to real gem
      gem.mods = cloned.mods;
      gem.superLegendary = cloned.superLegendary;
      gem.rarity = cloned.rarity;
      this._setGem(slot, gem);
      this._forgeMode = false;
      this.game.inventoryOpen = false;
      this.inventoryPanel.classList.add('hidden');
      this.game._reapplyAllBonuses();
      this.updateSlots();
      this.game.particles.levelUpBurst(this.game.player.x, this.game.player.y);
      this.game.particles.explode(this.game.player.x, this.game.player.y, '#ff8800', 20);
    }, () => {
      this._renderInventory(); // Cancel — stay in forge mode
    });
  }

  _forgifyGem(gem, slot, setGem) {
    const legendaryKeys = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'legendary');
    const missing = legendaryKeys.filter(k => !gem.mods.some(m => m.type === k));
    const legKey = missing.length ? pick(missing) : pick(legendaryKeys);
    // Build result on a preview object first
    const resultMods = [{ type: legKey, value: null }, ...gem.mods.slice(0, 3)];
    const resultGem = { ...gem, rarity: 'legendary', mods: resultMods };

    this._showForgeResult(resultGem, '⚒ LEGENDARY FORGE RESULT', () => {
      gem.rarity = 'legendary';
      gem.mods = resultMods.slice();
      setGem(slot, gem);
      this._forgeMode = false;
      this.game.inventoryOpen = false;
      this.inventoryPanel.classList.add('hidden');
      this.game._reapplyAllBonuses();
      this.updateSlots();
      this.game.particles.levelUpBurst(this.game.player.x, this.game.player.y);
    }, () => {
      this._renderInventory(); // Cancel — stay in forge mode
    });
  }

  _executeRareForge() {
    // Combine 3 selected gems into a new gem, keeping 1 mod from each.
    // 3× Rare → Legendary | 3× Legendary → Super Legendary (2 legendary mods)
    const gems = this._rareForgeSelected.map(s => this._getGem(s));
    const allLeg  = gems.every(g => g.rarity === 'legendary');
    const allRare = gems.every(g => g.rarity === 'rare');
    const keptMods = gems.map(g => pick(g.mods)).filter(Boolean);

    let newGem;
    if (allLeg) {
      const legMods = gems.flatMap(g => g.mods.filter(m => MOD_DEFS[m.type]?.rarity === 'legendary'));
      const uniqueLegKeys = [...new Set(legMods.map(m => m.type))].slice(0, 2);
      while (uniqueLegKeys.length < 2) {
        const legendaryKeys = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'legendary');
        const extra = pick(legendaryKeys.filter(k => !uniqueLegKeys.includes(k)));
        if (extra) uniqueLegKeys.push(extra);
        else break;
      }
      newGem = generateSuperLegendaryGem(uniqueLegKeys);
    } else if (allRare) {
      const legendaryKeys = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'legendary');
      const [legKey] = weightedPickUnique(legendaryKeys, 1);
      newGem = generateGem('legendary');
      newGem.mods = [{ type: legKey, value: null }, ...keptMods.slice(0, 3)];
    } else {
      const legendaryKeys = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'legendary');
      const [legKey] = weightedPickUnique(legendaryKeys, 1);
      newGem = generateGem('legendary');
      newGem.mods = [{ type: legKey, value: null }, ...keptMods.slice(0, 3)];
    }

    const title = allLeg ? '✦+ SUPER LEGENDARY FORGE!'
                : '✦ LEGENDARY FORGE RESULT';

    this._showForgeResult(newGem, title, () => {
      // Apply: clear source slots, put new gem in first selected
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
      if (allLeg) this.game.particles.explode(this.game.player.x, this.game.player.y, '#ff8800', 25);
    }, () => {
      this._renderInventory(); // Cancel — stay in rare forge mode
    });
  }

  _executeDiceForge(gem, slot) {
    const targetRarity = gem.rarity;
    const newGem = generateGem(targetRarity);

    this._showForgeResult(newGem, '🎲 REROLL RESULT', () => {
      this._setGem(slot, newGem);
      this._diceForgeMode = false;
      this.game.inventoryOpen = false;
      this.inventoryPanel.classList.add('hidden');
      this.game._reapplyAllBonuses();
      this.updateSlots();
      this.game.particles.levelUpBurst(this.game.player.x, this.game.player.y);
    }, () => {
      this._renderInventory(); // Cancel — stay in dice forge mode
    });
  }

  _bindRelicTooltips() {
    const tooltip  = document.getElementById('relic-tooltip');
    const tipIcon  = document.getElementById('relic-tooltip-icon');
    const tipName  = document.getElementById('relic-tooltip-name');
    const tipDesc  = document.getElementById('relic-tooltip-desc');

    const show = (el) => {
      const id  = el.dataset.relicId;
      const def = RELIC_DEFS[id];
      if (!def) return;
      tipIcon.textContent = def.icon;
      tipName.textContent = def.name;
      tipDesc.textContent = def.desc;
      tooltip.classList.remove('hidden');
      this._positionRelicTooltip(el);
    };
    const hide = () => tooltip.classList.add('hidden');

    this.relicSlots.querySelectorAll('.slot-icon[data-relic-id]').forEach(el => {
      el.addEventListener('mouseenter', () => show(el));
      el.addEventListener('mouseleave', hide);
      el.addEventListener('touchstart', (e) => { e.stopPropagation(); show(el); }, { passive: true });
      el.addEventListener('touchend',   (e) => { e.stopPropagation(); setTimeout(hide, 1200); }, { passive: true });
    });
  }

  _positionRelicTooltip(anchor) {
    const tooltip   = document.getElementById('relic-tooltip');
    const container = document.getElementById('game-container');
    const aRect  = anchor.getBoundingClientRect();
    const cRect  = container.getBoundingClientRect();

    // Position above the icon, centered horizontally
    const tipW   = tooltip.offsetWidth  || 200;
    const tipH   = tooltip.offsetHeight || 70;
    const margin = 6;

    let left = aRect.left - cRect.left + aRect.width / 2 - tipW / 2;
    let top  = aRect.top  - cRect.top  - tipH - margin;

    // Clamp within container
    left = Math.max(4, Math.min(left, cRect.width  - tipW - 4));
    top  = Math.max(4, Math.min(top,  cRect.height - tipH - 4));

    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';
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

  // Continue after victory — keep all progress, disable the win timer
  _continueRun() {
    document.getElementById('win-screen')?.classList.add('hidden');
    this.game._endless = true;   // disables the 6-minute win check
    if (!this.game.running) {
      this.game.running = true;
      this.game._lastTime = performance.now();
      this.game._loop();
    }
  }

  showWin(player, relics) {
    const t = this.game.time;
    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);
    const winScreen = document.getElementById('win-screen');
    const winStats = document.getElementById('win-stats');
    winStats.innerHTML = `
      <div class="stat-line">⏱ Time: ${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}</div>
      <div class="stat-line">⭐ Level: ${player.level}</div>
      <div class="stat-line">💀 Kills: ${player.kills}</div>
      <div class="stat-line">🏆 Relics: ${relics.map(r => r.def.name).join(', ') || 'None'}</div>
    `;
    winScreen.classList.remove('hidden');
  }

  drawAbilityCooldowns(ctx, game, width, height) {
    const p = game.player;
    const abilities = [];

    if (p._nukeInterval)  abilities.push({ icon: '💥', timer: game._nukeTimer,        max: p._nukeInterval,    color: '#ff4400', label: 'CATACLYSM' });
    if (p._wardZap)       abilities.push({ icon: '⚡', timer: game._wardZapTimer,      max: p._wardDuration,    color: '#4488ff', label: 'WARD ZAP' });
    if (p._mirrorPulse)   abilities.push({ icon: '🪞', timer: game._mirrorPulseTimer,  max: 6,                  color: '#ff44aa', label: 'MIRROR' });
    if (p._meteorGem)     abilities.push({ icon: '☄',  timer: game._meteorTimer,       max: 9,                  color: '#ff8800', label: 'METEOR' });
    if (p._stormCallGem)  abilities.push({ icon: '⛈',  timer: game._stormTimer,        max: 9,                  color: '#aaddff', label: 'STORM' });
    if (p._timeStopGem)   abilities.push({ icon: '⏰', timer: game._timeStopTimer,     max: 15,                 color: '#88ccff', label: 'TIMESTOP' });
    if (p._gravitonGem)   abilities.push({ icon: '🌌', timer: game._gravitonTimer,     max: 16,                 color: '#cc44ff', label: 'GRAVITON' });
    if (p._sigilGem)      abilities.push({ icon: '✦',  timer: game._sigilTimer,        max: 18,                 color: '#ff44cc', label: 'SIGIL' });
    if (p._warpBoltGem)   abilities.push({ icon: '🔥', timer: game._warpBoltTimer,     max: 10,                 color: '#ff6600', label: 'WARPBOLT' });

    if (abilities.length === 0) return;

    const sz = 40, pad = 6, startX = width - pad;
    const baseY = height - (game.enemies.some(e => e.isBoss && !e.isDead) ? 80 : 22) - sz - pad;

    for (let i = 0; i < abilities.length; i++) {
      const ab = abilities[i];
      const cx = startX - sz / 2 - i * (sz + pad);
      const cy = baseY + sz / 2;
      const pct = Math.min(1, ab.timer / ab.max);
      const ready = pct >= 0.999;

      ctx.save();
      // Dark background
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#0a0a18';
      ctx.beginPath(); ctx.arc(cx, cy, sz / 2, 0, Math.PI * 2); ctx.fill();

      // Cooldown pie fill
      ctx.globalAlpha = ready ? 0.9 : 0.45;
      ctx.fillStyle = ab.color;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, sz / 2, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.closePath();
      ctx.fill();

      // Border ring
      ctx.globalAlpha = ready ? 1 : 0.6;
      ctx.strokeStyle = ready ? ab.color : '#334455';
      ctx.lineWidth = ready ? 2.5 : 1.5;
      if (ready) { ctx.shadowColor = ab.color; ctx.shadowBlur = 10; }
      ctx.beginPath(); ctx.arc(cx, cy, sz / 2, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;

      // Icon
      ctx.globalAlpha = 1;
      ctx.font = `${Math.round(sz * 0.42)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ab.icon, cx, cy);

      // Timer text / READY label
      ctx.font = '9px "Courier New"';
      ctx.textBaseline = 'top';
      if (ready) {
        ctx.fillStyle = ab.color;
        ctx.shadowColor = ab.color; ctx.shadowBlur = 4;
        ctx.fillText('READY', cx, cy + sz / 2 + 2);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#99aacc';
        ctx.fillText(`${(ab.max - ab.timer).toFixed(0)}s`, cx, cy + sz / 2 + 2);
      }
      ctx.restore();
    }
  }

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
