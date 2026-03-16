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
    this.inventoryOpen = false;
    this.time = 0;
    this.frame = 0;

    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.xpOrbs = [];
    this.heartPickups = [];
    this.legendaryForgePickups = [];
    this.rareForgePickups = [];
    this.diceForgePickups = [];
    this.xpMagnets = [];
    this.wand = null;
    this.inventory = [];  // 9 gem slots
    this.relics = [];
    this._nukeTimer = 0;

    this.camera = { x: 0, y: 0 };

    this._spawnTimer = 0;
    this._spawnInterval = CONFIG.ENEMY_SPAWN_INTERVAL_START;
    this._bossSpawnIndex = 0;
    this._lightningArcs = [];
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
    this.player = new Player(0, 0);
    this.enemies = [];
    this.projectiles = [];
    this.xpOrbs = [];
    this.heartPickups = [];
    this.legendaryForgePickups = [];
    this.rareForgePickups = [];
    this.diceForgePickups = [];
    this.xpMagnets = [];
    this.wand = new Wand();
    this.inventory = new Array(9).fill(null);
    this.relics = [];
    this.particles.clear();
    this.time = 0;
    this.frame = 0;
    this._spawnTimer = 0;
    this._spawnInterval = CONFIG.ENEMY_SPAWN_INTERVAL_START;
    this._bossSpawnIndex = 0;
    this._lightningArcs = [];
    this._processingLevelUp = false;
    this._nukeTimer = 0;
    this.player.pendingRelicLevels = 0;
    this.inventoryOpen = false;
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
      if (!this.paused && !this.upgradeSystem.active && !this.inventoryOpen) {
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
    if (this.player._hpRegen) this.player.heal(this.player._hpRegen * dt);

    // Iron Fortress: low-HP shield
    if (this.player._fortressShieldDur) {
      const threshold = this.player._fortressShieldDur >= 4 ? 0.30 : 0.20;
      if (this.player.hp / this.player.maxHp < threshold && this.player.invincibleTime <= 0) {
        this.player.invincibleTime = this.player._fortressShieldDur;
      }
    }

    // Cataclysm Clock nuke
    if (this.player._nukeInterval) {
      this._nukeTimer += dt;
      if (this._nukeTimer >= this.player._nukeInterval) {
        this._nukeTimer = 0;
        this._triggerNuke();
      }
    }

    // Player movement
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
          if (this.player._thunderAegis) this._thunderAegisStrike();
          if (this.player._thorns > 0) {
            e.takeDamage(this.player._thorns);
            if (e.isDead) this.onEnemyDead(e);
          }
          if (this.player.isDead) { this.ui.showGameOver(); return; }
        }
      }
    }

    // Enemy-enemy separation (bumping)
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i], b = this.enemies[j];
        const minD = a.size + b.size;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < minD * minD && dSq > 0.0001) {
          const d = Math.sqrt(dSq);
          const push = (minD - d) * 0.5;
          const nx = dx / d, ny = dy / d;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
        }
      }
    }
    // Enemy-player bumping (push enemy away, nudge player)
    for (const e of this.enemies) {
      const minD = e.size + this.player.size * 0.7;
      const dx = this.player.x - e.x, dy = this.player.y - e.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < minD * minD && dSq > 0.0001) {
        const d = Math.sqrt(dSq);
        const push = minD - d;
        const nx = dx / d, ny = dy / d;
        e.x -= nx * push * 0.6;
        e.y -= ny * push * 0.6;
        this.player.x += nx * push * 0.4;
        this.player.y += ny * push * 0.4;
      }
    }

    // Wand fires
    this.wand.update(dt, this);

    // Lightning arcs decay
    this._lightningArcs = this._lightningArcs.filter(a => { a.age += dt; return a.age < a.maxAge; });

    // Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt);
      if (p.isDead) { this.projectiles.splice(i, 1); continue; }

      for (const e of this.enemies) {
        if (e.isDead) continue;
        const d = dist(p.x, p.y, e.x, e.y);
        if (d < p.size + e.size) {
          if (!p.hitEnemy(e)) continue;

          // Damage
          const isCrit = p.isCrit || (Math.random() < this.player.critChance);
          const dmg = isCrit ? p.damage * 2 : p.damage;
          const result = e.takeDamage(dmg, isCrit);

          // Giant's Wand knockback
          if (this.player._giantsKnockback) {
            e.knockback(p.x, p.y, this.player._giantsKnockback);
          }

          // Lifesteal
          if (this.player.lifesteal > 0) this.player.heal(result.actual * this.player.lifesteal);

          // Virulent poison application
          if (p.virulentPoison && !e.virulentlyPoisoned) {
            e.virulentlyPoisoned = true;
            e.poisoned = 6.0;
            this.particles.spark(e.x, e.y, '#80ff40', 5);
          }

          this.particles.floatText(e.x, e.y - 15, `${result.actual}`,
            isCrit ? '#ffd700' : '#ffffff', isCrit ? 16 : 12);
          if (isCrit) this.particles.spark(e.x, e.y, '#ffd700', 6);
          else this.particles.spark(e.x, e.y, '#c050ff', 4);

          if (e.isDead) this.onEnemyDead(e);

          // Bounce: redirect projectile toward nearest unhit enemy
          if (p._needsBounce) {
            p._needsBounce = false;
            const bt = [...this.enemies]
              .filter(en => !en.isDead && !p.hitEnemies.has(en.id))
              .sort((a, b) => distSq(p.x, p.y, a.x, a.y) - distSq(p.x, p.y, b.x, b.y))[0];
            if (bt) {
              const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
              const a = angle(p.x, p.y, bt.x, bt.y);
              p.vx = Math.cos(a) * spd;
              p.vy = Math.sin(a) * spd;
            } else {
              p.isDead = true;
            }
          }

          // On projectile death: explosion and/or chain
          if (p.isDead) {
            if (p.explosive && p.explosionRadius > 0) this._wandExplode(p);
            if (p.chain > 0) this._spawnChainProjectiles(p);
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

    // XP magnets
    for (let i = this.xpMagnets.length - 1; i >= 0; i--) {
      const m = this.xpMagnets[i];
      m.update(dt, this.player.x, this.player.y);
      if (m.collected) {
        this.xpMagnets.splice(i, 1);
        // Instantly collect all XP orbs and heart pickups
        const xpMult = this.player._xpMultiplier || 1;
        for (const orb of this.xpOrbs) {
          this.player.gainXP(Math.ceil(orb.value * xpMult), this.particles);
        }
        for (const h of this.heartPickups) {
          this.player.heal(h.healAmount);
        }
        this.xpOrbs = [];
        this.heartPickups = [];
        this.particles.explode(this.player.x, this.player.y, '#40ff80', 20);
        this.particles.floatText(this.player.x, this.player.y - 30, 'XP COLLECTED!', '#40ff80', 14);
        this._checkLevelUp();
      }
    }

    // Legendary forge pickups
    for (let i = this.legendaryForgePickups.length - 1; i >= 0; i--) {
      const f = this.legendaryForgePickups[i];
      f.update(dt, this.player.x, this.player.y);
      if (f.collected) {
        this.legendaryForgePickups.splice(i, 1);
        this.ui.openLegendaryForge();
      }
    }

    // Rare forge pickups
    for (let i = this.rareForgePickups.length - 1; i >= 0; i--) {
      const f = this.rareForgePickups[i];
      f.update(dt, this.player.x, this.player.y);
      if (f.collected) {
        this.rareForgePickups.splice(i, 1);
        this.ui.openRareForge();
      }
    }

    // Dice forge pickups
    for (let i = this.diceForgePickups.length - 1; i >= 0; i--) {
      const f = this.diceForgePickups[i];
      f.update(dt, this.player.x, this.player.y);
      if (f.collected) {
        this.diceForgePickups.splice(i, 1);
        this.ui.openDiceForge();
      }
    }

    this.particles.update(dt);
    this.ui.update();
  }

  // Explosive gem: bolt explodes in AoE on impact
  _wandExplode(proj) {
    this.particles.explode(proj.x, proj.y, '#c050ff', 20);
    for (const e of this.enemies) {
      if (e.isDead) continue;
      const d = dist(proj.x, proj.y, e.x, e.y);
      if (d < proj.explosionRadius + e.size) {
        const dmg = Math.round(proj.damage * 0.7);
        const result = e.takeDamage(dmg);
        this.particles.floatText(e.x, e.y - 12, `${result.actual}`, '#dd88ff', 11);
        if (e.isDead) this.onEnemyDead(e);
      }
    }
  }

  // Chain gem: on hit, fire new bolts at nearby unhit enemies
  _spawnChainProjectiles(proj) {
    const chainTargets = [...this.enemies]
      .filter(e => !e.isDead && !proj.hitEnemies.has(e.id) && dist(proj.x, proj.y, e.x, e.y) < proj.chainRange)
      .sort((a, b) => distSq(proj.x, proj.y, a.x, a.y) - distSq(proj.x, proj.y, b.x, b.y))
      .slice(0, proj.chain);

    for (const t of chainTargets) {
      const a = angle(proj.x, proj.y, t.x, t.y);
      const spd = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
      this.spawnProjectile(new Projectile({
        x: proj.x, y: proj.y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        damage: Math.round(proj.damage * 0.7),
        size: proj.size * 0.8,
        pierce: 0, bounce: 0, chain: 0, // no further chaining
        type: 'bolt', color: '#88aaff',
        lifetime: 1.5,
        explosive: proj.explosive, explosionRadius: proj.explosionRadius,
      }));
      this._lightningArcs.push({ x1: proj.x, y1: proj.y, x2: t.x, y2: t.y, age: 0, maxAge: 0.18 });
    }
  }

  onEnemyDead(enemy) {
    if (!enemy.isDead) return;
    this.player.kills++;

    // Virulent poison: spreads to nearby enemies on death
    if (enemy.virulentlyPoisoned) {
      const nearby = this.enemies
        .filter(e => !e.isDead && !e.virulentlyPoisoned && dist(e.x, e.y, enemy.x, enemy.y) < 160)
        .slice(0, 4);
      for (const e of nearby) {
        e.virulentlyPoisoned = true;
        e.poisoned = 6.0;
        this.particles.spark(e.x, e.y, '#80ff40', 6);
        this.particles.floatText(e.x, e.y - 12, 'INFECTED', '#80ff40', 10);
      }
    }

    const orbs = enemy.dropXP();
    for (const o of orbs) this.xpOrbs.push(new XPOrb(o.x, o.y, o.value, o.size));

    if (Math.random() < (enemy.isBoss ? 0.001 : 0.003)) {
      this.heartPickups.push(new HeartPickup(enemy.x, enemy.y));
    }
    if (!enemy.isBoss && Math.random() < 0.003) {
      this.xpMagnets.push(new XPMagnet(enemy.x, enemy.y));
    }
    if (!enemy.isBoss && Math.random() < 0.003) {
      this.rareForgePickups.push(new RareForge(enemy.x, enemy.y));
    }
    if (!enemy.isBoss && Math.random() < 0.003) {
      this.diceForgePickups.push(new DiceForge(enemy.x, enemy.y));
    }

    // Soul Vampire: heal on kill
    if (this.player._killHealPct) {
      this.player.heal(this.player.maxHp * this.player._killHealPct);
    }

    // Chain Death: enemies explode damaging nearby foes
    if (this.player._chainDeathPct && this.player._chainDeathRadius) {
      const dmg = Math.round(enemy.maxHp * this.player._chainDeathPct);
      const nearby = this.enemies.filter(e => !e.isDead && e !== enemy &&
        dist(e.x, e.y, enemy.x, enemy.y) < this.player._chainDeathRadius);
      for (const n of nearby) {
        const result = n.takeDamage(dmg);
        this.particles.floatText(n.x, n.y - 12, `${result.actual}`, '#ff8040', 11);
        if (n.isDead) this.onEnemyDead(n);
      }
      if (nearby.length > 0) this.particles.explode(enemy.x, enemy.y, '#ff6030', 12);
    }

    if (enemy.isBoss) {
      this.particles.explode(enemy.x, enemy.y, '#ff0000', 40);
      this.particles.levelUpBurst(enemy.x, enemy.y);
      const lf = new LegendaryForge(enemy.x, enemy.y);
      this.legendaryForgePickups.push(lf);
      // Dramatic entrance burst for legendary forge
      this.particles.explode(enemy.x, enemy.y, '#ff8800', 24);
      this.particles.spark(enemy.x, enemy.y, '#ffcc44', 16);
      this.particles.floatText(enemy.x, enemy.y - 50, '⚒ LEGENDARY FORGE!', '#ffcc44', 18);
    } else {
      this.particles.blood(enemy.x, enemy.y, 6);
      this.particles.spark(enemy.x, enemy.y, '#ff4040', 4);
    }

    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) this.enemies.splice(idx, 1);
  }

  _checkLevelUp() {
    const hasPending = this.player.pendingLevelUps > 0 || this.player.pendingRelicLevels > 0;
    if (!hasPending || this._processingLevelUp || this.upgradeSystem.active) return;

    this._processingLevelUp = true;
    // Relic rewards take priority so the player sees them in order
    let isRelicReward;
    if (this.player.pendingRelicLevels > 0) {
      this.player.pendingRelicLevels--;
      isRelicReward = true;
    } else {
      this.player.pendingLevelUps--;
      isRelicReward = false;
    }

    this.upgradeSystem.show(isRelicReward).then(() => {
      this._processingLevelUp = false;
      if (this.player.pendingLevelUps > 0 || this.player.pendingRelicLevels > 0) {
        this._checkLevelUp();
      }
    });
  }

  _updateSpawning(dt) {
    this._spawnTimer += dt;
    this._spawnInterval = Math.max(
      CONFIG.ENEMY_SPAWN_INTERVAL_MIN,
      CONFIG.ENEMY_SPAWN_INTERVAL_START - this.time * 0.01
    );
    if (this._spawnTimer >= this._spawnInterval) {
      this._spawnTimer = 0;
      this._spawnEnemyWave();
    }
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
    if (side === 0)      { x = rng(-hw, hw); y = -hh; }
    else if (side === 1) { x = rng(-hw, hw); y = hh; }
    else if (side === 2) { x = -hw; y = rng(-hh, hh); }
    else                 { x = hw; y = rng(-hh, hh); }
    return { x: this.player.x + x, y: this.player.y + y };
  }

  spawnProjectile(proj) { this.projectiles.push(proj); }

  getNearestEnemies(count) {
    if (this.enemies.length === 0) return [];
    return [...this.enemies]
      .filter(e => !e.isDead)
      .sort((a, b) => distSq(this.player.x, this.player.y, a.x, a.y) -
                      distSq(this.player.x, this.player.y, b.x, b.y))
      .slice(0, count);
  }

  // Add a gem reward from the draft: auto-socket if slot open, else inventory
  addGemReward(gem) {
    for (let i = 0; i < 3; i++) {
      if (!this.wand.socketedGems[i]) {
        this.wand.socketedGems[i] = gem;
        this._reapplyAllBonuses();
        this.particles.levelUpBurst(this.player.x, this.player.y);
        return;
      }
    }
    // Wand full: add to inventory
    for (let i = 0; i < 9; i++) {
      if (!this.inventory[i]) { this.inventory[i] = gem; return; }
    }
    // Inventory full: replace oldest slot
    this.inventory[0] = gem;
  }

  // Reset all player bonus stats, then apply relics, then gem bonuses on top
  _reapplyAllBonuses() {
    const p = this.player;
    p.maxHp            = p.baseHp;
    p.damageMultiplier = 1.0;
    p.speedMultiplier  = 1.0;
    p.xpRangeBonus     = 0;
    p.critChance       = 0;
    p.lifesteal        = 0;
    p.cooldownReduction = 0;
    p.projectileCountBonus = 0;
    p.armor               = CONFIG.PLAYER_BASE_ARMOR;
    p._hpRegen            = 0;
    p._xpMultiplier       = 1.0;
    p._thorns             = 0;
    p._duplicatorLevel    = 0;
    p._critStun           = 0;
    p._extraChoices       = 0;
    p._omniShot           = 0;
    p._projSizeMult       = 1;
    p._nukeInterval       = 0;
    p._nukeRadius         = 0;
    p._berserkerMaxMult   = 0;
    p._chainDeathPct      = 0;
    p._chainDeathRadius   = 0;
    p._killHealPct        = 0;
    p._voidPrismChance    = 0;
    p._fortressShieldDur  = 0;

    for (const r of this.relics) r.apply(p);

    // Layer gem bonuses on top of relic bonuses
    const ws = this.wand.computeStats();
    p.maxHp         += ws.maxHpBonus;
    p.hp             = Math.min(p.hp, p.maxHp);
    p.speedMultiplier += ws.moveSpeedBonus;
    p.lifesteal      = Math.min(p.lifesteal + ws.lifestealBonus, 0.8);
    p.critChance     = Math.min(p.critChance + ws.critBonus, 0.95);
    p._thunderAegis  = ws.thunderAegis;
  }

  // Keep legacy alias so old relics code paths don't break
  _reapplyRelics() { this._reapplyAllBonuses(); }

  // Thunder Aegis: AOE lightning burst around player on taking damage
  _thunderAegisStrike() {
    const radius = 160;
    const dmg = Math.round(this.wand.computeStats().damage * 1.5);
    const targets = this.enemies.filter(e => !e.isDead && dist(e.x, e.y, this.player.x, this.player.y) < radius);
    for (const t of targets) {
      const result = t.takeDamage(dmg);
      this._lightningArcs.push({ x1: this.player.x, y1: this.player.y, x2: t.x, y2: t.y, age: 0, maxAge: 0.25 });
      this.particles.floatText(t.x, t.y - 12, `${result.actual}`, '#aaddff', 12);
      if (t.isDead) this.onEnemyDead(t);
    }
    this.particles.explode(this.player.x, this.player.y, '#88ccff', 16);
  }

  // Cataclysm Clock: massive periodic nuke
  _triggerNuke() {
    const radius = this.player._nukeRadius;
    const dmg = Math.round(this.wand.computeStats().damage * 10);
    const targets = this.enemies.filter(e => !e.isDead &&
      dist(e.x, e.y, this.player.x, this.player.y) < radius);
    for (const t of targets) {
      t.takeDamage(dmg);
      if (t.isDead) this.onEnemyDead(t);
    }
    this.particles.explode(this.player.x, this.player.y, '#ff4400', 40);
    this.particles.levelUpBurst(this.player.x, this.player.y);
    this.particles.floatText(this.player.x, this.player.y - 50, '💥 CATACLYSM!', '#ff6600', 18);
  }

  // ---- Draw ----
  draw() {
    const ctx = this.ctx;
    const w = this.width, h = this.height;
    const cx = this.camera.x, cy = this.camera.y;

    Sprites.drawBackground(ctx, cx, cy, w, h);

    // XP orbs
    for (const orb of this.xpOrbs) orb.draw(ctx, orb.x - cx, orb.y - cy);

    // Heart pickups
    for (const hb of this.heartPickups) hb.draw(ctx, hb.x - cx, hb.y - cy);

    // Legendary forge pickups
    for (const f of this.legendaryForgePickups) f.draw(ctx, f.x - cx, f.y - cy);

    // Rare forge pickups
    for (const f of this.rareForgePickups) f.draw(ctx, f.x - cx, f.y - cy);

    // Dice forge pickups
    for (const f of this.diceForgePickups) f.draw(ctx, f.x - cx, f.y - cy);

    // XP magnets
    for (const m of this.xpMagnets) m.draw(ctx, m.x - cx, m.y - cy);

    // Enemies
    for (const e of this.enemies) e.draw(ctx, e.x - cx, e.y - cy);

    // Projectiles
    for (const p of this.projectiles) p.draw(ctx, p.x - cx, p.y - cy);

    // Player
    if (!this.player.isDead) {
      this.player.draw(ctx, this.player.x - cx, this.player.y - cy);
    }

    // XP range ring
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

    // Lightning arcs (from chain gem)
    for (const arc of this._lightningArcs) {
      const alpha = 1 - (arc.age / arc.maxAge);
      Sprites.drawLightning(ctx, arc.x1 - cx, arc.y1 - cy, arc.x2 - cx, arc.y2 - cy, alpha);
    }

    this.particles.draw(ctx, cx, cy);

    const boss = this.enemies.find(e => e.isBoss && !e.isDead);
    this.ui.drawBossBar(ctx, boss, w, h);

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
