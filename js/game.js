// ============================================================
//  SPELL SURVIVORS - Main Game Loop & State Management
// ============================================================

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new InputHandler();
    this.particles = new ParticleSystem();
    this.ui = new UI(this);
    this.upgradeSystem = new UpgradeSystem(this);

    this.running = false;
    this.paused = false;
    this.time = 0;
    this.frame = 0;

    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.xpOrbs = [];
    this.heartPickups = [];
    this.weapons = [];
    this.relics = [];

    this.camera = { x: 0, y: 0 };

    this._spawnTimer = 0;
    this._spawnInterval = CONFIG.ENEMY_SPAWN_INTERVAL_START;
    this._spawnWaveTimer = 0;
    this._bossSpawnIndex = 0;
    this._lightningArcs = [];
    this._garlicPulse = 0;
    this._processingLevelUp = false;

    this._lastTime = 0;
    this._raf = null;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  init() {
    // Create player at world center
    this.player = new Player(0, 0);
    this.enemies = [];
    this.projectiles = [];
    this.xpOrbs = [];
    this.heartPickups = [];
    this.weapons = [new WeaponInstance('magic_wand')];
    this.relics = [];
    this.particles.clear();
    this.time = 0;
    this.frame = 0;
    this._spawnTimer = 0;
    this._spawnInterval = CONFIG.ENEMY_SPAWN_INTERVAL_START;
    this._bossSpawnIndex = 0;
    this._lightningArcs = [];
    this._garlicPulse = 0;
    this._processingLevelUp = false;
    this.camera.x = 0;
    this.camera.y = 0;
    this.ui.updateSlots();
    this.ui.hideGameOver();
  }

  start() {
    this.init();
    this.running = true;
    this._lastTime = performance.now();
    this._loop();
    document.getElementById('start-screen').classList.add('hidden');
  }

  restart() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this.init();
    this.running = true;
    this._lastTime = performance.now();
    this._loop();
  }

  _loop() {
    if (!this.running) return;
    this._raf = requestAnimationFrame((ts) => {
      const dt = Math.min((ts - this._lastTime) / 1000, 0.05);
      this._lastTime = ts;
      if (!this.paused && !this.upgradeSystem.active) {
        this.update(dt);
      }
      this.draw();
      this._loop();
    });
  }

  // ---- Update ----
  update(dt) {
    if (this.player.isDead) return;
    this.time += dt;
    this.frame++;

    // HP regen from relics
    if (this.player._hpRegen) {
      this.player.heal(this.player._hpRegen * dt);
    }

    // Player
    this.player.update(dt, this.input);

    // Camera follows player
    this.camera.x = this.player.x - this.width / 2;
    this.camera.y = this.player.y - this.height / 2;

    // Spawn enemies
    this._updateSpawning(dt);

    // Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.isDead) { this.enemies.splice(i, 1); continue; }
      e.update(dt, this.player.x, this.player.y);

      // Enemy hits player
      if (this.player.invincibleTime <= 0) {
        const d = dist(e.x, e.y, this.player.x, this.player.y);
        if (d < e.size + this.player.size * 0.7) {
          this.player.takeDamage(e.damage, this.particles);
          if (this.player._thorns > 0) {
            e.takeDamage(this.player._thorns);
            if (e.isDead) this.onEnemyDead(e);
          }
          if (this.player.isDead) {
            this.ui.showGameOver();
            return;
          }
        }
      }
    }

    // Weapons
    for (const w of this.weapons) {
      w.update(dt, this);
    }

    // Lightning arcs decay
    this._lightningArcs = this._lightningArcs.filter(a => { a.age += dt; return a.age < a.maxAge; });

    // Garlic aura pulse decay
    if (this._garlicPulse > 0) this._garlicPulse -= dt * 3;

    // Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt);
      if (p.isDead) { this.projectiles.splice(i, 1); continue; }

      // Check collisions with enemies
      for (const e of this.enemies) {
        if (e.isDead) continue;
        const d = dist(p.x, p.y, e.x, e.y);
        if (d < p.size + e.size) {
          if (p.hitEnemy(e)) {
            const isCrit = p.isCrit || (Math.random() < this.player.critChance);
            const dmg = isCrit ? p.damage * 2 : p.damage;
            const result = e.takeDamage(dmg, isCrit);

            // Lifesteal
            if (this.player.lifesteal > 0) {
              this.player.heal(result.actual * this.player.lifesteal);
            }

            // Slow/freeze
            if (p.extraData && p.extraData.freeze) {
              e.frozen = p.extraData.freeze;
              this.particles.freeze(e.x, e.y);
            }

            this.particles.floatText(e.x, e.y - 15, `${result.actual}`,
              isCrit ? '#ffd700' : '#ffffff', isCrit ? 16 : 12);
            if (isCrit) this.particles.spark(e.x, e.y, '#ffd700', 6);
            else this.particles.spark(e.x, e.y, '#c050ff', 4);

            // Weapon-specific on-hit effects
            const wDef = this.weapons.find(w => p.owner === w.id || p.type === w.id);
            if (wDef && WEAPON_DEFS[wDef.id] && WEAPON_DEFS[wDef.id].onHit) {
              WEAPON_DEFS[wDef.id].onHit(this, p, e);
            }
            // Fireball special
            if (p.type === 'fireball' && p.explosionRadius > 0 && p.isDead) {
              this._fireballExplode(p);
            }

            if (e.isDead) this.onEnemyDead(e);
          }
        }
      }
    }

    // XP orbs
    for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
      const orb = this.xpOrbs[i];
      orb.update(dt, this.player.x, this.player.y, this.player.xpRange);
      if (orb.collected) {
        const xpMult = this.player._xpMultiplier || 1;
        this.player.gainXP(Math.ceil(orb.value * xpMult), this.particles);
        this.particles.xpCollect(this.player.x, this.player.y);
        this.xpOrbs.splice(i, 1);
        this._checkLevelUp();
      }
    }

    // Heart pickups
    for (let i = this.heartPickups.length - 1; i >= 0; i--) {
      const h = this.heartPickups[i];
      h.update(dt, this.player.x, this.player.y);
      if (h.collected) {
        this.player.heal(h.healAmount);
        this.particles.floatText(this.player.x, this.player.y - 20, `+${h.healAmount}`, '#ff6090', 15);
        this.heartPickups.splice(i, 1);
      }
    }

    // Particles
    this.particles.update(dt);

    // UI
    this.ui.update();
  }

  _fireballExplode(proj) {
    this.particles.explode(proj.x, proj.y, '#ff6000', 25);
    for (const e of this.enemies) {
      if (e.isDead) continue;
      const d = dist(proj.x, proj.y, e.x, e.y);
      if (d < proj.explosionRadius + e.size) {
        const dmg = Math.round(proj.damage * 0.75);
        const result = e.takeDamage(dmg);
        this.particles.floatText(e.x, e.y - 12, `${result.actual}`, '#ff9030', 11);
        if (e.isDead) this.onEnemyDead(e);
      }
    }
  }

  onEnemyDead(enemy) {
    if (!enemy.isDead) return;
    this.player.kills++;

    // Drop XP
    const orbs = enemy.dropXP();
    for (const o of orbs) this.xpOrbs.push(new XPOrb(o.x, o.y, o.value, o.size));

    // Rare heart drop
    if (Math.random() < (enemy.isBoss ? 0.8 : 0.04)) {
      this.heartPickups.push(new HeartPickup(enemy.x, enemy.y));
    }

    // Death particles
    if (enemy.isBoss) {
      this.particles.explode(enemy.x, enemy.y, '#ff0000', 40);
      this.particles.levelUpBurst(enemy.x, enemy.y);
    } else {
      this.particles.blood(enemy.x, enemy.y, 6);
      this.particles.spark(enemy.x, enemy.y, '#ff4040', 4);
    }

    // Remove from array
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) this.enemies.splice(idx, 1);
  }

  _checkLevelUp() {
    if (this.player.pendingLevelUps > 0 && !this._processingLevelUp && !this.upgradeSystem.active) {
      this._processingLevelUp = true;
      this.player.pendingLevelUps--;
      const isRelicReward = this.player.level % 5 === 0;
      this.upgradeSystem.show(isRelicReward).then(() => {
        this._processingLevelUp = false;
        if (this.player.pendingLevelUps > 0) this._checkLevelUp();
      });
    }
  }

  _updateSpawning(dt) {
    this._spawnTimer += dt;

    // Ramp up spawn rate over time
    this._spawnInterval = Math.max(
      CONFIG.ENEMY_SPAWN_INTERVAL_MIN,
      CONFIG.ENEMY_SPAWN_INTERVAL_START - this.time * 0.01
    );

    if (this._spawnTimer >= this._spawnInterval) {
      this._spawnTimer = 0;
      this._spawnEnemyWave();
    }

    // Boss spawns
    const bossMinutes = CONFIG.BOSS_SPAWN_MINUTES;
    if (this._bossSpawnIndex < bossMinutes.length) {
      const nextBoss = bossMinutes[this._bossSpawnIndex] * 60;
      if (this.time >= nextBoss) {
        this._bossSpawnIndex++;
        this._spawnBoss();
      }
    }
  }

  _spawnEnemyWave() {
    const minutes = this.time / 60;
    const count = Math.min(1 + Math.floor(minutes * 0.5), 6);

    for (let i = 0; i < count; i++) {
      const type = this._pickEnemyType(minutes);
      const { x, y } = this._spawnPosition();
      const diff = 1 + minutes * CONFIG.DIFFICULTY_RAMP;
      this.enemies.push(new Enemy(x, y, type, diff));
    }
  }

  _pickEnemyType(minutes) {
    const roll = Math.random();
    if (minutes < 1) return 'zombie';
    if (minutes < 2) return roll < 0.6 ? 'zombie' : 'bat';
    if (minutes < 4) {
      if (roll < 0.4) return 'zombie';
      if (roll < 0.7) return 'bat';
      return 'golem';
    }
    if (roll < 0.3) return 'zombie';
    if (roll < 0.5) return 'bat';
    if (roll < 0.7) return 'golem';
    return 'wraith';
  }

  _spawnBoss() {
    const { x, y } = this._spawnPosition();
    const diff = 1 + (this.time / 60) * CONFIG.DIFFICULTY_RAMP * 2;
    const boss = new Enemy(x, y, 'boss', diff);
    this.enemies.push(boss);
    this.particles.floatText(this.player.x, this.player.y - 40, '⚠ BOSS APPROACHING ⚠', '#ff3030', 18);
  }

  _spawnPosition() {
    const margin = CONFIG.ENEMY_SPAWN_MARGIN;
    const side = Math.floor(Math.random() * 4);
    let x, y;
    const hw = this.width / 2 + margin;
    const hh = this.height / 2 + margin;
    if (side === 0) { x = rng(-hw, hw); y = -hh; }       // top
    else if (side === 1) { x = rng(-hw, hw); y = hh; }   // bottom
    else if (side === 2) { x = -hw; y = rng(-hh, hh); }  // left
    else { x = hw; y = rng(-hh, hh); }                    // right
    return { x: this.player.x + x, y: this.player.y + y };
  }

  spawnProjectile(proj) {
    this.projectiles.push(proj);
  }

  getNearestEnemies(count) {
    if (this.enemies.length === 0) return [];
    return [...this.enemies]
      .filter(e => !e.isDead)
      .sort((a, b) => distSq(this.player.x, this.player.y, a.x, a.y) -
                      distSq(this.player.x, this.player.y, b.x, b.y))
      .slice(0, count);
  }

  _reapplyRelics() {
    // Reset player stats before reapplying
    this.player.damageMultiplier = 1.0;
    this.player.speedMultiplier = 1.0;
    this.player.xpRangeBonus = 0;
    this.player.critChance = 0;
    this.player.lifesteal = 0;
    this.player.cooldownReduction = 0;
    this.player.projectileCountBonus = 0;
    this.player.armor = CONFIG.PLAYER_BASE_ARMOR;
    this.player._hpRegen = 0;
    this.player._xpMultiplier = 1.0;
    this.player._thorns = 0;
    this.player._duplicatorLevel = 0;
    this.player._critStun = 0;

    for (const r of this.relics) {
      r.apply(this.player);
    }
  }

  // ---- Draw ----
  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Background
    Sprites.drawBackground(ctx, this.camera.x, this.camera.y, w, h);

    // Draw order: effects, enemies, projectiles, player, particles
    const cx = this.camera.x;
    const cy = this.camera.y;

    // Garlic aura
    const garlicWeapon = this.weapons.find(w => w.id === 'garlic');
    if (garlicWeapon) {
      const gDef = garlicWeapon.currentLevel;
      const pulse = Math.max(0, this._garlicPulse);
      Sprites.drawGarlicAura(ctx,
        this.player.x - cx, this.player.y - cy,
        gDef.radius, 0.25 + pulse * 0.2);
    }

    // Orbital weapons (behind enemies)
    for (const w of this.weapons) {
      w.draw(ctx, this);
    }

    // XP orbs
    for (const orb of this.xpOrbs) {
      orb.draw(ctx, orb.x - cx, orb.y - cy);
    }

    // Heart pickups
    for (const h of this.heartPickups) {
      h.draw(ctx, h.x - cx, h.y - cy);
    }

    // Enemies
    for (const e of this.enemies) {
      e.draw(ctx, e.x - cx, e.y - cy);
    }

    // Projectiles
    for (const p of this.projectiles) {
      p.draw(ctx, p.x - cx, p.y - cy);
    }

    // Player
    if (!this.player.isDead) {
      this.player.draw(ctx, this.player.x - cx, this.player.y - cy);
    }

    // XP range indicator (subtle ring)
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#40ff80';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(this.player.x - cx, this.player.y - cy, this.player.xpRange, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();

    // Lightning arcs
    for (const arc of this._lightningArcs) {
      const alpha = 1 - (arc.age / arc.maxAge);
      Sprites.drawLightning(ctx,
        arc.x1 - cx, arc.y1 - cy,
        arc.x2 - cx, arc.y2 - cy, alpha);
    }

    // Particles (in world space)
    this.particles.draw(ctx);

    // Boss HP bar
    const boss = this.enemies.find(e => e.isBoss && !e.isDead);
    this.ui.drawBossBar(ctx, boss, w, h);

    // Vignette
    this._drawVignette(ctx, w, h);
  }

  _drawVignette(ctx, w, h) {
    const grad = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.3, w/2, h/2, Math.max(w,h)*0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,10,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}
