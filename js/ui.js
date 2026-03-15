// ============================================================
//  SPELL SURVIVORS - HUD / UI System
// ============================================================

class UI {
  constructor(game) {
    this.game = game;
    this.levelDisplay = document.getElementById('level-display');
    this.xpFill = document.getElementById('xp-bar-fill');
    this.xpLabel = document.getElementById('xp-label');
    this.hpFill = document.getElementById('hp-bar-fill');
    this.hpLabel = document.getElementById('hp-label');
    this.timerDisplay = document.getElementById('timer-display');
    this.killCount = document.getElementById('kill-count');
    this.weaponSlots = document.getElementById('weapon-slots');
    this.relicSlots = document.getElementById('relic-slots');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.gameoverStats = document.getElementById('gameover-stats');
    this.restartBtn = document.getElementById('restart-btn');

    this.restartBtn.addEventListener('click', () => game.restart());
    this.restartBtn.addEventListener('touchend', (e) => { e.preventDefault(); game.restart(); });
  }

  update() {
    const player = this.game.player;
    const t = this.game.time;

    // Level
    this.levelDisplay.textContent = player.level;

    // XP bar
    const xpPct = (player.xp / player.xpToNext) * 100;
    this.xpFill.style.width = xpPct + '%';
    this.xpLabel.textContent = `${player.xp} / ${player.xpToNext} XP`;

    // HP bar
    const hpPct = (player.hp / player.maxHp) * 100;
    this.hpFill.style.width = hpPct + '%';
    this.hpLabel.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    // Color gradient by HP
    const hpColor = hpPct > 50 ? `linear-gradient(90deg, #880000, #ff3030)` :
                    hpPct > 25 ? `linear-gradient(90deg, #884000, #ff6000)` :
                                 `linear-gradient(90deg, #600000, #ff0000)`;
    this.hpFill.style.background = hpColor;

    // Timer
    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);
    this.timerDisplay.textContent = `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;

    // Kill count
    this.killCount.textContent = player.kills;
  }

  updateSlots() {
    // Weapon slots
    this.weaponSlots.innerHTML = this.game.weapons.map(w =>
      `<div class="slot-icon" title="${w.def.name} Lv${w.level}">
        ${w.def.icon}
        <span class="slot-level">${w.level}</span>
      </div>`
    ).join('');

    // Relic slots
    this.relicSlots.innerHTML = this.game.relics.map(r =>
      `<div class="slot-icon" title="${r.def.name} Lv${r.level}" style="border-color:rgba(32,160,96,0.6)">
        ${r.def.icon}
        <span class="slot-level" style="color:#60ffa0">${r.level}</span>
      </div>`
    ).join('');
  }

  showGameOver() {
    const player = this.game.player;
    const t = this.game.time;
    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);

    this.gameoverStats.innerHTML = `
      <div class="stat-line">Time Survived: ${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}</div>
      <div class="stat-line">Level Reached: ${player.level}</div>
      <div class="stat-line">Enemies Slain: ${player.kills}</div>
      <div class="stat-line">Weapons: ${this.game.weapons.map(w => w.def.name).join(', ') || 'None'}</div>
      <div class="stat-line">Relics: ${this.game.relics.map(r => r.def.name).join(', ') || 'None'}</div>
    `;
    this.gameoverScreen.classList.remove('hidden');
  }

  hideGameOver() {
    this.gameoverScreen.classList.add('hidden');
  }

  // Draw boss HP bar on canvas
  drawBossBar(ctx, boss, width, height) {
    if (!boss || boss.isDead) return;
    const barW = width * 0.6;
    const barH = 16;
    const x = (width - barW) / 2;
    const y = height - 36;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - 4, y - 4, barW + 8, barH + 20);
    ctx.strokeStyle = '#880000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 4, y - 4, barW + 8, barH + 20);

    // Label
    ctx.font = 'bold 10px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4040';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 6;
    ctx.fillText(`★ ${boss.def.name.toUpperCase()} ★`, x + barW/2, y + barH + 10);
    ctx.shadowBlur = 0;

    // HP bar bg
    ctx.fillStyle = '#200000';
    ctx.fillRect(x, y, barW, barH);

    // HP bar fill
    const ratio = clamp(boss.hp / boss.maxHp, 0, 1);
    const grad = ctx.createLinearGradient(x, 0, x + barW, 0);
    grad.addColorStop(0, '#880000');
    grad.addColorStop(0.5, '#ff3030');
    grad.addColorStop(1, '#ff6000');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barW * ratio, barH);

    // Border
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barW, barH);

    // HP text
    ctx.font = '10px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.ceil(boss.hp)} / ${boss.maxHp}`, x + barW/2, y + barH/2 + 3.5);
  }

  // Mini-map style kill/time overlay (top-right corner)
  drawComboText(ctx, x, y, text, color) {
    ctx.save();
    ctx.font = 'bold 13px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
