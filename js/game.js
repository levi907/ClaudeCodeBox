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
    this._meteorTimer = 0;
    this._wardTimer = 999;  // starts ready (8s+)
    this._wardZapTimer = 0;
    this._soulDrainTimer = 0;
    this._mirrorPulseTimer = 0;
    this._stormTimer = 0;
    this._timeStopTimer = 0;
    this._gravitonTimer = 0;
    this._sigilTimer = 0;
    this._warpBoltTimer = 0;
    this._arcaneKillCount = 0;
    this._bloodFrenzyStacks = 0;
    this._bloodFrenzyTimer = 0;
    this._sigils = [];
    this.player.pendingRelicLevels = 0;
    this.inventoryOpen = false;
    this.camera.x = 0;
    this.camera.y = 0;
    this.ui.updateSlots();
    this.ui.hideGameOver();
    document.getElementById('win-screen')?.classList.add('hidden');
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

    // Victory condition: survive 6 minutes
    if (this.time >= 360) {
      this.running = false;
      this.ui.showWin(this.player, this.relics);
      return;
    }

    // HP regen from relics/gems
    if (this.player._hpRegen) this.player.heal(this.player._hpRegen * dt);

    // Arcane Ward: regenerate shield
    if (this.player._wardDuration) this._wardTimer += dt;

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

    // Meteor gem: drop 3 meteors every 9s
    if (this.player._meteorGem) {
      this._meteorTimer += dt;
      if (this._meteorTimer >= 9) {
        this._meteorTimer = 0;
        this._triggerMeteors();
      }
    }

    // Storm Call: lightning strikes 5 enemies every 9s
    if (this.player._stormCallGem) {
      this._stormTimer += dt;
      if (this._stormTimer >= 9) {
        this._stormTimer = 0;
        this._triggerStormCall();
      }
    }

    // Time Stop: freeze all enemies + deal 80 damage every 15s
    if (this.player._timeStopGem) {
      this._timeStopTimer += dt;
      if (this._timeStopTimer >= 15) {
        this._timeStopTimer = 0;
        for (const e of this.enemies) {
          if (!e.isDead) {
            e.frozen = Math.max(e.frozen, 1.5);
            e.takeDamage(80);
          }
        }
        this.particles.explode(this.player.x, this.player.y, '#88ccff', 30);
        this.particles.floatText(this.player.x, this.player.y - 40, '⏰ TIME STOP — 80 dmg', '#88ccff', 15);
      }
    }

    // Graviton: pull all enemies toward player + deal 100 damage every 16s
    if (this.player._gravitonGem) {
      this._gravitonTimer += dt;
      if (this._gravitonTimer >= 16) {
        this._gravitonTimer = 0;
        for (const e of this.enemies) {
          if (!e.isDead) {
            e.x += (this.player.x - e.x) * 0.7;
            e.y += (this.player.y - e.y) * 0.7;
            e.takeDamage(100);
          }
        }
        this.particles.explode(this.player.x, this.player.y, '#cc44ff', 30);
        this.particles.floatText(this.player.x, this.player.y - 40, '🌌 GRAVITON — 100 dmg', '#cc44ff', 15);
      }
    }

    // Sigil: place damage zone every 18s
    if (this.player._sigilGem) {
      this._sigilTimer += dt;
      if (this._sigilTimer >= 18) {
        this._sigilTimer = 0;
        this._sigils.push({ x: this.player.x, y: this.player.y, age: 0, duration: 7, radius: 140 });
        this.particles.floatText(this.player.x, this.player.y - 30, '✦ SIGIL', '#ff44cc', 13);
      }
      // Update active sigils
      for (let i = this._sigils.length - 1; i >= 0; i--) {
        const sig = this._sigils[i];
        sig.age += dt;
        if (sig.age >= sig.duration) { this._sigils.splice(i, 1); continue; }
        const sigDmg = 15 * dt;
        for (const e of this.enemies) {
          if (!e.isDead && dist(e.x, e.y, sig.x, sig.y) < sig.radius) {
            e.hp -= sigDmg;
            if (e.hp <= 0) { e.isDead = true; this.onEnemyDead(e); }
          }
        }
      }
    }

    // Warp Bolt: fire massive bolt every 10s
    if (this.player._warpBoltGem) {
      this._warpBoltTimer += dt;
      if (this._warpBoltTimer >= 10) {
        this._warpBoltTimer = 0;
        this._fireWarpBolt();
      }
    }

    // Blood Frenzy: decay stacks
    if (this._bloodFrenzyStacks > 0) {
      this._bloodFrenzyTimer -= dt;
      if (this._bloodFrenzyTimer <= 0) {
        this._bloodFrenzyStacks = 0;
        this._bloodFrenzyTimer = 0;
      }
      this.player._bloodFrenzyMult = 1 + 0.15 * this._bloodFrenzyStacks;
    } else {
      this.player._bloodFrenzyMult = 1.0;
    }

    // Soul Vampire drain aura: deal 12 damage/s to nearby enemies
    if (this.player._soulDrain > 0) {
      this._soulDrainTimer += dt;
      if (this._soulDrainTimer >= 1) {
        this._soulDrainTimer = 0;
        const drainDmg = 12;
        let drainCount = 0;
        for (const e of this.enemies) {
          if (!e.isDead && dist(e.x, e.y, this.player.x, this.player.y) < this.player._soulDrain) {
            e.takeDamage(drainDmg);
            if (e.isDead) this.onEnemyDead(e);
            drainCount++;
          }
        }
        if (drainCount > 0) {
          this.particles.spark(this.player.x, this.player.y, '#40cc80', 6);
          this.particles.floatText(this.player.x, this.player.y - 24, `🧛 DRAIN ×${drainCount}`, '#40cc80', 11);
        }
      }
    }

    // Cursed Mirror pulse: deal 30 arcane damage to all enemies within 300px every 6s
    if (this.player._mirrorPulse) {
      this._mirrorPulseTimer += dt;
      if (this._mirrorPulseTimer >= 6) {
        this._mirrorPulseTimer = 0;
        for (const e of this.enemies) {
          if (!e.isDead && dist(e.x, e.y, this.player.x, this.player.y) < 300) {
            e.takeDamage(30);
            if (e.isDead) this.onEnemyDead(e);
          }
        }
        this.particles.spark(this.player.x, this.player.y, '#ff44aa', 16);
        this.particles.floatText(this.player.x, this.player.y - 40, '🪞 MIRROR PULSE', '#ff44aa', 13);
      }
    }

    // Arcane Ward zap: discharge at 4 nearest enemies every _wardDuration seconds
    if (this.player._wardZap) {
      this._wardZapTimer += dt;
      if (this._wardZapTimer >= this.player._wardDuration) {
        this._wardZapTimer = 0;
        const zapDmg = Math.round(this.wand.computeStats().damage * this.player.damageMultiplier * 2);
        const zapTargets = [...this.enemies]
          .filter(e => !e.isDead)
          .sort((a, b) => distSq(a.x, a.y, this.player.x, this.player.y) - distSq(b.x, b.y, this.player.x, this.player.y))
          .slice(0, 4);
        for (const t of zapTargets) {
          t.takeDamage(zapDmg);
          this._lightningArcs.push({ x1: this.player.x, y1: this.player.y, x2: t.x, y2: t.y, age: 0, maxAge: 0.25 });
          if (t.isDead) this.onEnemyDead(t);
        }
        if (zapTargets.length > 0) this.particles.floatText(this.player.x, this.player.y - 30, '⚡ WARD ZAP', '#4488ff', 13);
      }
    }

    // Reaper's Scythe: execute low-HP enemies each frame
    if (this.player._reaperThreshold) {
      for (const e of this.enemies) {
        if (!e.isDead && e.hp < e.maxHp * this.player._reaperThreshold && e.hp > 0) {
          e.takeDamage(99999);
          if (e.isDead) this.onEnemyDead(e);
        }
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

      // DoT death (poison/bleed/decay/poisonStacks killed this enemy during update)
      if (e.isDead) { this.onEnemyDead(e); this.enemies.splice(i, 1); continue; }

      // Enemy hits player
      if (this.player.invincibleTime <= 0) {
        const d = dist(e.x, e.y, this.player.x, this.player.y);
        if (d < e.size + this.player.size * 0.7) {
          // Arcane Ward: block the hit if shield is ready
          if (this.player._wardDuration && this._wardTimer >= this.player._wardDuration) {
            this._wardTimer = 0;
            this.particles.spark(this.player.x, this.player.y, '#4488ff', 12);
            this.particles.floatText(this.player.x, this.player.y - 20, 'WARDED', '#4488ff', 14);
            this.player.invincibleTime = 0.3;
          } else {
            this.player.takeDamage(e.damage, this.particles);
            if (this.player._thunderAegis) this._thunderAegisStrike();
            if (this.player._thorns > 0) {
              e.takeDamage(this.player._thorns);
              this.particles.spark(this.player.x, this.player.y, '#ff3300', 5);
              if (e.isDead) this.onEnemyDead(e);
            }
            // Cursed Mirror: reflect damage to nearby enemies
            if (this.player._cursedMirror) {
              const nearby = this.enemies.filter(en => !en.isDead && dist(en.x, en.y, this.player.x, this.player.y) < 300);
              for (const n of nearby) {
                n.takeDamage(e.damage);
                if (n.isDead) this.onEnemyDead(n);
              }
              if (nearby.length > 0) {
                this.particles.spark(this.player.x, this.player.y, '#ff44aa', 8);
              }
            }
            if (this.player.isDead) { this.ui.showGameOver(); return; }
          }
        }
      }
    }

    // Enemy-enemy separation disabled (was causing O(n²) lag)
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

          // Curse: apply before damage so the applying hit benefits
          if (p.curse) {
            e.cursed = Math.max(e.cursed, 8.0);
            this.particles.spark(e.x, e.y, '#cc44ff', 4);
          }

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
            e.poisoned = 10.0;
            this.particles.spark(e.x, e.y, '#80ff40', 5);
          }

          // Bleed application
          if (p.bleed) {
            e.bleed = Math.max(e.bleed, 3.0);
          }

          // Stackable % HP poison application
          if (p.poisonChance && Math.random() < p.poisonChance) {
            e.poisonStacks = Math.min(8, e.poisonStacks + 1);
            e.poisonStackTimer = 4.0;
            this.particles.spark(e.x, e.y, '#80ff40', 3);
          }

          // Blood Pact: shots apply bleed
          if (this.player._bloodPactBleed) {
            e.bleed = Math.max(e.bleed, 3.0);
          }

          // Life Leech: heal 12% of damage dealt
          if (p.lifeLeech) {
            this.player.heal(result.actual * 0.12);
          }

          // Overload: crit hits explode in 150px AoE
          if (p.overload && isCrit) {
            const overloadDmg = Math.round(p.damage * 0.8);
            for (const t of this.enemies) {
              if (!t.isDead && t !== e && dist(t.x, t.y, e.x, e.y) < 150) {
                const tr = t.takeDamage(overloadDmg);
                this.particles.floatText(t.x, t.y - 10, `${tr.actual}`, '#ffcc00', 10);
                if (t.isDead) this.onEnemyDead(t);
              }
            }
            this.particles.spark(e.x, e.y, '#ffcc00', 8);
          }

          // Frost Nova: 20% chance freeze + 60 damage to enemies in 150px for 2s
          if (p.frostNova && Math.random() < 0.20) {
            for (const t of this.enemies) {
              if (!t.isDead && dist(t.x, t.y, e.x, e.y) < 150) {
                t.frozen = Math.max(t.frozen, 2.0);
                t.takeDamage(60);
              }
            }
            this.particles.spark(e.x, e.y, '#88ddff', 10);
          }

          // Decay: target loses 20% maxHp/s for 8s
          if (p.decay) {
            e.decaying = Math.max(e.decaying, 8.0); // 20% maxHp/s for 8s
            this.particles.spark(e.x, e.y, '#44cc44', 4);
          }

          // Chain Lightning: arc to 3 nearby enemies for 60% damage
          if (p.chainLightning && !e.isDead) {
            const chainDmg = Math.round(p.damage * 0.6);
            const chainTargets = this.enemies
              .filter(t => !t.isDead && t !== e && dist(t.x, t.y, e.x, e.y) < 200)
              .sort((a, b) => distSq(e.x, e.y, a.x, a.y) - distSq(e.x, e.y, b.x, b.y))
              .slice(0, 3);
            for (const ct of chainTargets) {
              ct.takeDamage(chainDmg);
              this._lightningArcs.push({ x1: e.x, y1: e.y, x2: ct.x, y2: ct.y, age: 0, maxAge: 0.2 });
              if (ct.isDead) this.onEnemyDead(ct);
            }
          }

          // Reaper (gem): execute enemies below 40% HP
          if (p.reaper && !e.isDead && e.hp < e.maxHp * 0.40) {
            e.takeDamage(99999);
          }

          this.particles.floatText(e.x, e.y - 15, `${result.actual}`,
            isCrit ? '#ffd700' : '#ffffff', isCrit ? 16 : 12);
          if (isCrit) this.particles.spark(e.x, e.y, '#ffd700', 6);
          else this.particles.spark(e.x, e.y, '#c050ff', 4);

          if (e.isDead) this.onEnemyDead(e);

          // Chain: fire a bolt at a nearby unhit enemy on EACH hit (before pierce exhaustion)
          if (p.chain > 0) {
            this._spawnChainProjectiles(p, 1);
            p.chain--;
          }

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

          // On projectile death: explosion only (chain already fires per-hit above)
          if (p.isDead) {
            if (p.explosive && p.explosionRadius > 0) this._wandExplode(p);
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
  _spawnChainProjectiles(proj, count = 1) {
    const chainTargets = [...this.enemies]
      .filter(e => !e.isDead && !proj.hitEnemies.has(e.id) && dist(proj.x, proj.y, e.x, e.y) < proj.chainRange)
      .sort((a, b) => distSq(proj.x, proj.y, a.x, a.y) - distSq(proj.x, proj.y, b.x, b.y))
      .slice(0, count);

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

    // Soul Burst: fire 3 soul bolts at nearby enemies
    if (this.player._soulBurstGem) {
      const soulTargets = this.enemies
        .filter(e => !e.isDead && dist(e.x, e.y, enemy.x, enemy.y) < 350)
        .slice(0, 3);
      const ws = this.wand.computeStats();
      for (const st of soulTargets) {
        const a = angle(enemy.x, enemy.y, st.x, st.y);
        this.spawnProjectile(new Projectile({
          x: enemy.x, y: enemy.y,
          vx: Math.cos(a) * 400, vy: Math.sin(a) * 400,
          damage: Math.round(ws.damage * this.player.damageMultiplier * 0.8),
          size: 8, pierce: 4, bounce: 0, chain: 0,
          type: 'bolt', color: '#cc88ff', lifetime: 1.5,
        }));
      }
    }

    // Shockwave: push all enemies in 280px away on kill AND deal 150% damage
    if (this.player._shockwaveGem) {
      const ws = this.wand.computeStats();
      const shockDmg = Math.round(ws.damage * this.player.damageMultiplier * 1.5);
      const shockTargets = this.enemies.filter(e => !e.isDead && dist(e.x, e.y, enemy.x, enemy.y) < 280);
      for (const st of shockTargets) {
        st.knockback(enemy.x, enemy.y, 500);
        st.takeDamage(shockDmg);
        if (st.isDead) { st._shockwaveKill = true; this.onEnemyDead(st); }
      }
      if (shockTargets.length > 0) this.particles.explode(enemy.x, enemy.y, '#aaddff', 12);
    }

    // Combustion: poisoned enemies explode on death (no cascade)
    if (this.player._combustionGem && enemy.poisoned > 0 && !enemy._combustionKill) {
      const combDmg = Math.round(enemy.maxHp * 0.6);
      const nearby = this.enemies.filter(e => !e.isDead && dist(e.x, e.y, enemy.x, enemy.y) < 90);
      for (const n of nearby) {
        n.takeDamage(combDmg);
        if (n.isDead) { n._combustionKill = true; this.onEnemyDead(n); }
      }
      this.particles.explode(enemy.x, enemy.y, '#80ff40', 20);
      this.particles.floatText(enemy.x, enemy.y - 20, '💥 COMBUSTION', '#80ff40', 13);
    }

    // Blood Frenzy: +15% dmg per kill for 5s (max 8 stacks)
    if (this.player._bloodFrenzyGem) {
      this._bloodFrenzyStacks = Math.min(8, this._bloodFrenzyStacks + 1);
      this._bloodFrenzyTimer = 5;
    }

    // Arcane Surge: every 5 kills fire 10 homing bolts
    if (this.player._arcaneSurgeGem) {
      this._arcaneKillCount++;
      if (this._arcaneKillCount % 5 === 0) this._triggerArcaneSurge(enemy);
    }

    // Chain Death: enemies explode damaging nearby foes (no cascade — only first-order kills)
    if (this.player._chainDeathPct && this.player._chainDeathRadius && !enemy._chainKill) {
      const dmg = Math.round(enemy.maxHp * this.player._chainDeathPct);
      const nearby = this.enemies.filter(e => !e.isDead && e !== enemy &&
        dist(e.x, e.y, enemy.x, enemy.y) < this.player._chainDeathRadius);
      for (const n of nearby) {
        const result = n.takeDamage(dmg);
        this.particles.floatText(n.x, n.y - 12, `${result.actual}`, '#ff8040', 11);
        if (n.isDead) {
          n._chainKill = true;  // prevents secondary cascade
          this.onEnemyDead(n);
        }
      }
      if (nearby.length > 0) this.particles.explode(enemy.x, enemy.y, '#ff6030', 8);
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
      CONFIG.ENEMY_SPAWN_INTERVAL_START - this.time * CONFIG.ENEMY_SPAWN_RAMP_RATE
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
    const MAX_ENEMIES = 150;
    if (this.enemies.length >= MAX_ENEMIES) return;
    const minutes = this.time / 60;
    const count = Math.min(1 + Math.floor(minutes * CONFIG.ENEMY_WAVE_GROWTH), CONFIG.ENEMY_MAX_WAVE);
    const diff = getDifficultyMult(this.time);
    for (let i = 0; i < count; i++) {
      if (this.enemies.length >= MAX_ENEMIES) break;
      const type = this._pickEnemyType(minutes);
      const { x, y } = this._spawnPosition();
      this.enemies.push(new Enemy(x, y, type, diff));
    }
  }

  _pickEnemyType(minutes) {
    const r = Math.random();
    if (minutes < 1)  return 'zombie';
    if (minutes < 2)  return r < 0.55 ? 'zombie' : 'bat';
    if (minutes < 3)  return r < 0.30 ? 'zombie' : r < 0.60 ? 'bat'  : 'golem';
    if (minutes < 4)  return r < 0.15 ? 'zombie' : r < 0.35 ? 'bat'  : r < 0.65 ? 'golem' : 'wraith';
    if (minutes < 5)  return r < 0.10 ? 'zombie' : r < 0.25 ? 'bat'  : r < 0.60 ? 'golem' : 'wraith';
    return r < 0.05 ? 'zombie' : r < 0.20 ? 'bat' : r < 0.55 ? 'golem' : 'wraith';
  }

  _spawnBoss() {
    const { x, y } = this._spawnPosition();
    const diff = getDifficultyMult(this.time, true);
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
    p._phantomStrikeChance = 0;
    p._echoInterval       = 0;
    p._wardDuration       = 0;
    p._reaperThreshold    = 0;
    p._cursedMirror       = false;
    p._soulDrain          = 0;
    p._bloodPactBleed     = false;
    p._wardZap            = false;
    p._mirrorPulse        = false;
    p._soulBurstGem       = false;
    p._shockwaveGem       = false;
    p._combustionGem      = false;
    p._bloodFrenzyGem     = false;
    p._arcaneSurgeGem     = false;
    p._stormCallGem       = false;
    p._timeStopGem        = false;
    p._gravitonGem        = false;
    p._sigilGem           = false;
    p._warpBoltGem        = false;
    p._relicPierceBonus   = 0;
    p._bloodFrenzyMult    = 1.0;

    for (const r of this.relics) r.apply(p);

    // Layer gem bonuses on top of relic bonuses
    const ws = this.wand.computeStats();
    p.maxHp          += ws.maxHpBonus;
    p.hp              = Math.min(p.hp, p.maxHp);
    p.speedMultiplier += ws.moveSpeedBonus;
    p.lifesteal       = Math.min(p.lifesteal + ws.lifestealBonus, 0.8);
    p.critChance      = Math.min(p.critChance + ws.critBonus, 0.95);
    p.armor           += ws.armorBonus;
    p._hpRegen        += ws.hpRegenBonus;
    p._thorns         += ws.thornsBonus;
    p._projSizeMult   += ws.projSizeBonus;
    p._thunderAegis   = ws.thunderAegis;
    p._meteorGem      = ws.meteor;
    // Reaper as gem stacks with Reaper's Scythe relic
    if (ws.reaper && !p._reaperThreshold) p._reaperThreshold = 0.40;

    // New legendary gem flags
    p._soulBurstGem   = ws.soulBurst;
    p._shockwaveGem   = ws.shockwave;
    p._combustionGem  = ws.combustion;
    p._bloodFrenzyGem = ws.bloodFrenzy;
    p._arcaneSurgeGem = ws.arcaneSurge;
    p._stormCallGem   = ws.stormCall;
    p._timeStopGem    = ws.timeStop;
    p._gravitonGem    = ws.graviton;
    p._sigilGem       = ws.sigil;
    p._warpBoltGem    = ws.warpBolt;

    // Bounty: +70% XP from kills
    if (ws.bounty) p._xpMultiplier *= 1.7;

    // Pickup range from attract/magnetism gems and void_pull
    p.xpRangeBonus += ws.xpRangeBonus;
    if (ws.voidPull) p.xpRangeBonus += 400;
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

  // Meteor gem: drop 1 meteor on a random enemy
  _triggerMeteors() {
    const dmg = Math.round(this.wand.computeStats().damage * this.player.damageMultiplier * 6);
    const radius = 80;
    const targets = [...this.enemies].filter(e => !e.isDead)
      .sort(() => Math.random() - 0.5).slice(0, 1);
    for (const t of targets) {
      // AoE at target position
      const nearby = this.enemies.filter(e => !e.isDead && dist(e.x, e.y, t.x, t.y) < radius);
      for (const n of nearby) {
        n.takeDamage(dmg);
        if (n.isDead) this.onEnemyDead(n);
      }
      this.particles.explode(t.x, t.y, '#ff8800', 18);
      this.particles.floatText(t.x, t.y - 20, '☄ METEOR', '#ff8800', 13);
    }
  }

  // Storm Call: lightning strikes 5 random enemies for 6× base damage
  _triggerStormCall() {
    const ws = this.wand.computeStats();
    const dmg = Math.round(ws.damage * this.player.damageMultiplier * 6);
    const targets = [...this.enemies].filter(e => !e.isDead)
      .sort(() => Math.random() - 0.5).slice(0, 5);
    for (const t of targets) {
      const result = t.takeDamage(dmg);
      this._lightningArcs.push({ x1: this.player.x, y1: this.player.y, x2: t.x, y2: t.y, age: 0, maxAge: 0.3 });
      this.particles.floatText(t.x, t.y - 12, `${result.actual}`, '#aaddff', 12);
      if (t.isDead) this.onEnemyDead(t);
    }
    this.particles.explode(this.player.x, this.player.y, '#aaddff', 14);
    this.particles.floatText(this.player.x, this.player.y - 40, '⚡ STORM CALL', '#aaddff', 14);
  }

  // Warp Bolt: fire a massive 5× damage bolt at nearest enemy
  _fireWarpBolt() {
    const targets = this.getNearestEnemies(1);
    if (targets.length === 0) return;
    const t = targets[0];
    const ws = this.wand.computeStats();
    const dmg = Math.round(ws.damage * this.player.damageMultiplier * 5);
    const a = angle(this.player.x, this.player.y, t.x, t.y);
    this.spawnProjectile(new Projectile({
      x: this.player.x, y: this.player.y,
      vx: Math.cos(a) * ws.projSpeed * 1.5,
      vy: Math.sin(a) * ws.projSpeed * 1.5,
      damage: dmg,
      size: 18, pierce: 8, bounce: 0, chain: 0,
      type: 'bolt', color: '#ff6600', lifetime: 3.0,
      explosive: true, explosionRadius: 80,
    }));
    this.particles.floatText(this.player.x, this.player.y - 30, '⚡ WARP BOLT', '#ff6600', 13);
  }

  // Arcane Surge: fire 8 homing bolts from kill location
  _triggerArcaneSurge(fromEnemy) {
    const ws = this.wand.computeStats();
    const dmg = Math.round(ws.damage * this.player.damageMultiplier * 1.5);
    const targets = [...this.enemies].filter(e => !e.isDead)
      .sort((a, b) => distSq(fromEnemy.x, fromEnemy.y, a.x, a.y) - distSq(fromEnemy.x, fromEnemy.y, b.x, b.y))
      .slice(0, 10);
    if (targets.length === 0) return;
    for (let i = 0; i < 10; i++) {
      const tgt = targets[i % targets.length];
      const a = angle(this.player.x, this.player.y, tgt.x, tgt.y) + rng(-0.3, 0.3);
      this.spawnProjectile(new Projectile({
        x: this.player.x, y: this.player.y,
        vx: Math.cos(a) * ws.projSpeed,
        vy: Math.sin(a) * ws.projSpeed,
        damage: dmg,
        size: 9, pierce: 5, bounce: 0, chain: 0,
        type: 'bolt', color: '#ff44ff', lifetime: 2.5,
      }));
    }
    this.particles.floatText(this.player.x, this.player.y - 35, '✦ ARCANE SURGE', '#ff44ff', 14);
  }

  // ---- Draw ----
  draw() {
    const ctx = this.ctx;
    const w = this.width, h = this.height;
    const cx = this.camera.x, cy = this.camera.y;

    Sprites.drawBackground(ctx, cx, cy, w, h);

    // Sigils
    for (const sig of this._sigils) {
      const fade = 1 - sig.age / sig.duration;
      ctx.save();
      ctx.globalAlpha = 0.25 * fade;
      ctx.strokeStyle = '#ff44cc';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(sig.x - cx, sig.y - cy, sig.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.12 * fade;
      ctx.fillStyle = '#ff44cc';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

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
    this.ui.drawAbilityCooldowns(ctx, this, w, h);

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
