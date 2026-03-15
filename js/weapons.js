// ============================================================
//  SPELL SURVIVORS - Weapons System
//  7 weapons, each with 5 levels + unique mechanics
// ============================================================

const WEAPON_DEFS = {

  // ---- 1. Magic Wand ----
  magic_wand: {
    id: 'magic_wand',
    name: 'Magic Wand',
    icon: '✨',
    type: 'weapon',
    desc: 'Fires a magic bolt at the nearest enemy.',
    levels: [
      { desc: 'Fires 1 bolt at nearest enemy', cooldown: 0.9, damage: 20, projectiles: 1, pierce: 0, speed: 350 },
      { desc: 'Fires 2 bolts, +10% dmg',      cooldown: 0.85, damage: 22, projectiles: 2, pierce: 0, speed: 370 },
      { desc: '+30% damage, faster fire',      cooldown: 0.75, damage: 28, projectiles: 2, pierce: 0, speed: 390 },
      { desc: 'Bolts now pierce 1 enemy',     cooldown: 0.70, damage: 33, projectiles: 2, pierce: 1, speed: 410 },
      { desc: 'Fires 3 bolts, pierce 1',      cooldown: 0.60, damage: 38, projectiles: 3, pierce: 1, speed: 430 },
    ],
    color: '#c050ff',
    fire(game, level) {
      const def = this.levels[level - 1];
      const projectiles = def.projectiles + game.player.projectileCountBonus;
      const targets = game.getNearestEnemies(projectiles);
      for (let i = 0; i < Math.min(targets.length, projectiles); i++) {
        const target = targets[i % targets.length];
        const a = angle(game.player.x, game.player.y, target.x, target.y);
        const dmg = Math.round(def.damage * game.player.damageMultiplier);
        const isCrit = Math.random() < game.player.critChance;
        game.spawnProjectile(new Projectile({
          x: game.player.x, y: game.player.y,
          vx: Math.cos(a) * def.speed, vy: Math.sin(a) * def.speed,
          damage: isCrit ? dmg * 2 : dmg, size: 7,
          pierce: def.pierce, type: 'bolt', color: '#c050ff',
          lifetime: 2.5, isCrit,
        }));
      }
    },
  },

  // ---- 2. Garlic Field ----
  garlic: {
    id: 'garlic',
    name: 'Garlic Field',
    icon: '🧄',
    type: 'weapon',
    desc: 'Continuous aura deals damage to all nearby enemies.',
    levels: [
      { desc: 'Small aura, 8 dps',    cooldown: 0.4, damage: 3.2, radius: 70,  knockback: 30 },
      { desc: 'Larger aura, 12 dps',  cooldown: 0.4, damage: 4.8, radius: 85,  knockback: 40 },
      { desc: '+20% radius, 16 dps',  cooldown: 0.35, damage: 5.6, radius: 100, knockback: 50 },
      { desc: 'Big aura, 24 dps',     cooldown: 0.3, damage: 7.2, radius: 115, knockback: 60 },
      { desc: 'Huge aura, 36 dps',    cooldown: 0.25, damage: 9.0, radius: 130, knockback: 80 },
    ],
    color: '#ffe060',
    fire(game, level) {
      const def = this.levels[level - 1];
      const radius = def.radius;
      for (const enemy of game.enemies) {
        const d = dist(game.player.x, game.player.y, enemy.x, enemy.y);
        if (d < radius + enemy.size) {
          const dmg = Math.round(def.damage * game.player.damageMultiplier);
          const isCrit = Math.random() < game.player.critChance;
          const result = enemy.takeDamage(isCrit ? dmg * 2 : dmg, isCrit);
          enemy.knockback(game.player.x, game.player.y, def.knockback);
          game.particles.floatText(enemy.x, enemy.y - 10, `${result.actual}`, isCrit ? '#ffd700' : '#ffe060', isCrit ? 14 : 11);
          game.particles.spark(enemy.x, enemy.y, '#ffe060', 3);
          if (enemy.isDead) game.onEnemyDead(enemy);
        }
      }
      // Visual aura pulse stored on weapon instance
      game._garlicPulse = (game._garlicPulse || 0) + 0.15;
    },
  },

  // ---- 3. Lightning Bolt ----
  lightning: {
    id: 'lightning',
    name: 'Lightning Bolt',
    icon: '⚡',
    type: 'weapon',
    desc: 'Strikes an enemy with lightning that chains to nearby foes.',
    levels: [
      { desc: 'Chains to 2 enemies', cooldown: 1.8, damage: 35, chains: 2, chainRange: 100 },
      { desc: 'Chains to 3, +20% dmg', cooldown: 1.6, damage: 42, chains: 3, chainRange: 110 },
      { desc: 'Bigger chain range', cooldown: 1.4, damage: 50, chains: 3, chainRange: 130 },
      { desc: 'Chains to 4, +25% dmg', cooldown: 1.2, damage: 62, chains: 4, chainRange: 150 },
      { desc: 'Chains to 5, massive dmg', cooldown: 1.0, damage: 80, chains: 5, chainRange: 175 },
    ],
    color: '#80c0ff',
    fire(game, level) {
      const def = this.levels[level - 1];
      const firstTarget = game.getNearestEnemies(1)[0];
      if (!firstTarget) return;

      const chain = [firstTarget];
      let current = firstTarget;
      for (let i = 1; i < def.chains; i++) {
        let next = null;
        let bestDist = def.chainRange;
        for (const e of game.enemies) {
          if (chain.includes(e)) continue;
          const d = dist(current.x, current.y, e.x, e.y);
          if (d < bestDist) { bestDist = d; next = e; }
        }
        if (!next) break;
        chain.push(next);
        current = next;
      }

      let prevX = game.player.x, prevY = game.player.y;
      for (const target of chain) {
        const dmg = Math.round(def.damage * game.player.damageMultiplier);
        const isCrit = Math.random() < game.player.critChance;
        const result = target.takeDamage(isCrit ? dmg * 2 : dmg);
        // Store lightning arc for rendering
        game._lightningArcs = game._lightningArcs || [];
        game._lightningArcs.push({ x1: prevX, y1: prevY, x2: target.x, y2: target.y, age: 0, maxAge: 0.2 });
        game.particles.spark(target.x, target.y, '#c0e0ff', 6);
        game.particles.floatText(target.x, target.y - 10, `${result.actual}`, isCrit ? '#ffd700' : '#80c0ff', isCrit ? 14 : 11);
        prevX = target.x; prevY = target.y;
        if (target.isDead) game.onEnemyDead(target);
      }
    },
  },

  // ---- 4. Fireball ----
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    icon: '🔥',
    type: 'weapon',
    desc: 'Launches a fireball that explodes on impact.',
    levels: [
      { desc: 'Small explosion (r=40)',   cooldown: 2.0, damage: 50,  explosionR: 40, projSpeed: 250 },
      { desc: 'Bigger explosion (r=55)',  cooldown: 1.8, damage: 62,  explosionR: 55, projSpeed: 260 },
      { desc: '+30% damage, r=65',        cooldown: 1.6, damage: 80,  explosionR: 65, projSpeed: 280 },
      { desc: '2 fireballs, r=75',        cooldown: 1.5, damage: 90,  explosionR: 75, projSpeed: 290, count: 2 },
      { desc: 'Huge explosion, +50% dmg', cooldown: 1.2, damage: 120, explosionR: 95, projSpeed: 310, count: 2 },
    ],
    color: '#ff6000',
    fire(game, level) {
      const def = this.levels[level - 1];
      const count = (def.count || 1) + game.player.projectileCountBonus;
      const targets = game.getNearestEnemies(count);
      for (let i = 0; i < count; i++) {
        const target = targets[i % Math.max(targets.length, 1)];
        let a = target ? angle(game.player.x, game.player.y, target.x, target.y) : rng(0, Math.PI * 2);
        game.spawnProjectile(new Projectile({
          x: game.player.x, y: game.player.y,
          vx: Math.cos(a) * def.projSpeed, vy: Math.sin(a) * def.projSpeed,
          damage: Math.round(def.damage * game.player.damageMultiplier),
          size: 10, pierce: 0, type: 'fireball', color: '#ff6000',
          lifetime: 2.5,
          explosionRadius: def.explosionR,
        }));
      }
    },
    onHit(game, proj, enemy) {
      if (proj.explosionRadius > 0) {
        game.particles.explode(enemy.x, enemy.y, '#ff6000', 20);
        for (const e of game.enemies) {
          const d = dist(proj.x, proj.y, e.x, e.y);
          if (d < proj.explosionRadius + e.size) {
            const dmg = Math.round(proj.damage * 0.8);
            const result = e.takeDamage(dmg);
            game.particles.floatText(e.x, e.y - 10, `${result.actual}`, '#ff9030', 11);
            if (e.isDead) game.onEnemyDead(e);
          }
        }
      }
    },
  },

  // ---- 5. Frost Lance ----
  frost_lance: {
    id: 'frost_lance',
    name: 'Frost Lance',
    icon: '❄️',
    type: 'weapon',
    desc: 'Fires ice shards that slow enemies.',
    levels: [
      { desc: 'Fires 2 shards, slows 30%', cooldown: 1.3, damage: 18, count: 2, slowAmt: 0.3, slowDur: 1.5 },
      { desc: 'Fires 3 shards, slows 40%', cooldown: 1.2, damage: 22, count: 3, slowAmt: 0.4, slowDur: 1.8 },
      { desc: '+30% dmg, pierces 1',       cooldown: 1.1, damage: 28, count: 3, slowAmt: 0.4, slowDur: 2.0, pierce: 1 },
      { desc: 'Fires 4 shards, freezes',   cooldown: 1.0, damage: 32, count: 4, slowAmt: 0.0, slowDur: 0, freeze: 1.5 },
      { desc: 'Fires 6 shards everywhere', cooldown: 0.85, damage: 40, count: 6, slowAmt: 0.0, slowDur: 0, freeze: 2.0, pierce: 1 },
    ],
    color: '#80d0ff',
    fire(game, level) {
      const def = this.levels[level - 1];
      const count = def.count + game.player.projectileCountBonus;
      const targets = game.getNearestEnemies(count);
      for (let i = 0; i < count; i++) {
        const target = targets[i % Math.max(targets.length, 1)];
        let a;
        if (target) {
          a = angle(game.player.x, game.player.y, target.x, target.y) + rng(-0.15, 0.15);
        } else {
          a = (i / count) * Math.PI * 2;
        }
        game.spawnProjectile(new Projectile({
          x: game.player.x, y: game.player.y,
          vx: Math.cos(a) * 320, vy: Math.sin(a) * 320,
          damage: Math.round(def.damage * game.player.damageMultiplier),
          size: 7, pierce: def.pierce || 0, type: 'ice', color: '#80d0ff',
          lifetime: 2.0,
          slowAmount: def.slowAmt || 0,
          slowDuration: def.slowDur || 0,
          extraData: { freeze: def.freeze || 0 },
        }));
      }
    },
    onHit(game, proj, enemy) {
      if (proj.extraData.freeze > 0) {
        enemy.frozen = proj.extraData.freeze;
        game.particles.freeze(enemy.x, enemy.y);
      } else if (proj.slowAmount > 0) {
        enemy.speed *= (1 - proj.slowAmount);
        setTimeout(() => { if (!enemy.isDead) enemy.speed = ENEMY_DEFS[enemy.type].speed; }, proj.slowDuration * 1000);
      }
    },
  },

  // ---- 6. Void Orbs ----
  void_orbs: {
    id: 'void_orbs',
    name: 'Void Orbs',
    icon: '🌀',
    type: 'weapon',
    desc: 'Orbiting projectiles that damage enemies on contact.',
    levels: [
      { desc: '2 orbs, 15 dps each', cooldown: 0.3, damage: 4.5, orbCount: 2, orbitRadius: 60, orbitSpeed: 2.5 },
      { desc: '2 orbs, bigger radius', cooldown: 0.3, damage: 5.5, orbCount: 2, orbitRadius: 75, orbitSpeed: 2.8 },
      { desc: '3 orbs, +25% dmg',     cooldown: 0.25, damage: 7.0, orbCount: 3, orbitRadius: 80, orbitSpeed: 3.0 },
      { desc: '4 orbs, +30% dmg',     cooldown: 0.2, damage: 8.5, orbCount: 4, orbitRadius: 85, orbitSpeed: 3.5 },
      { desc: '5 orbs, massive dmg',  cooldown: 0.2, damage: 12, orbCount: 5, orbitRadius: 95, orbitSpeed: 4.0 },
    ],
    color: '#8000ff',
    // Void orbs are handled specially - continuous orbit
    fire(game, level) {
      // Handled in game loop as orbital weapons
      const def = this.levels[level - 1];
      for (const enemy of game.enemies) {
        const d = dist(game.player.x, game.player.y, enemy.x, enemy.y);
        if (d < def.orbitRadius + enemy.size + 5) {
          const dmg = Math.round(def.damage * game.player.damageMultiplier);
          const isCrit = Math.random() < game.player.critChance;
          const result = enemy.takeDamage(isCrit ? dmg * 2 : dmg);
          if (result.actual > 0) {
            game.particles.spark(enemy.x, enemy.y, '#8000ff', 3);
            game.particles.floatText(enemy.x, enemy.y - 10, `${result.actual}`, isCrit ? '#ffd700' : '#c080ff', isCrit ? 13 : 10);
          }
          if (enemy.isDead) game.onEnemyDead(enemy);
        }
      }
    },
    drawOrbs(game, ctx, level, orbitAngle) {
      const def = this.levels[level - 1];
      for (let i = 0; i < def.orbCount; i++) {
        const a = orbitAngle + (i / def.orbCount) * Math.PI * 2;
        const wx = game.player.x + Math.cos(a) * def.orbitRadius;
        const wy = game.player.y + Math.sin(a) * def.orbitRadius;
        const sx = wx - game.camera.x;
        const sy = wy - game.camera.y;
        Sprites.drawVoidOrb(ctx, sx, sy, 8, game.time * 60);
      }
    },
    getOrbitRadius(level) {
      return this.levels[level - 1].orbitRadius;
    },
    getOrbitSpeed(level) {
      return this.levels[level - 1].orbitSpeed;
    },
  },

  // ---- 7. Death Spiral ----
  death_spiral: {
    id: 'death_spiral',
    name: 'Death Spiral',
    icon: '💀',
    type: 'weapon',
    desc: 'Spinning scythes slice through all nearby enemies.',
    levels: [
      { desc: '2 scythes, r=80',     cooldown: 0.35, damage: 8,  scytheCount: 2, radius: 80 },
      { desc: '2 scythes, r=95',     cooldown: 0.3, damage: 10, scytheCount: 2, radius: 95 },
      { desc: '3 scythes, +25% dmg', cooldown: 0.28, damage: 13, scytheCount: 3, radius: 100 },
      { desc: '4 scythes, +30% dmg', cooldown: 0.25, damage: 16, scytheCount: 4, radius: 110 },
      { desc: '6 scythes, huge dmg', cooldown: 0.2, damage: 22, scytheCount: 6, radius: 130 },
    ],
    color: '#30ff80',
    _scytheAngle: 0,
    fire(game, level) {
      const def = this.levels[level - 1];
      this._scytheAngle = (this._scytheAngle || 0) + 0.08;
      for (const enemy of game.enemies) {
        const d = dist(game.player.x, game.player.y, enemy.x, enemy.y);
        if (d < def.radius + enemy.size) {
          const dmg = Math.round(def.damage * game.player.damageMultiplier);
          const isCrit = Math.random() < game.player.critChance;
          const result = enemy.takeDamage(isCrit ? dmg * 2 : dmg);
          if (result.actual > 0) {
            game.particles.spark(enemy.x, enemy.y, '#30ff80', 3);
            game.particles.floatText(enemy.x, enemy.y - 10, `${result.actual}`, isCrit ? '#ffd700' : '#30ff80', isCrit ? 13 : 10);
          }
          if (enemy.isDead) game.onEnemyDead(enemy);
        }
      }
    },
    drawScythes(game, ctx, level) {
      const def = this.levels[level - 1];
      for (let i = 0; i < def.scytheCount; i++) {
        const a = (this._scytheAngle || 0) + (i / def.scytheCount) * Math.PI * 2;
        const wx = game.player.x + Math.cos(a) * def.radius;
        const wy = game.player.y + Math.sin(a) * def.radius;
        const sx = wx - game.camera.x;
        const sy = wy - game.camera.y;
        Sprites.drawScythe(ctx, sx, sy, a + Math.PI / 2, 18);
      }
    },
  },
};

// ---- Active Weapon Instance ----
class WeaponInstance {
  constructor(id) {
    this.id = id;
    this.def = WEAPON_DEFS[id];
    this.level = 1;
    this.cooldownTimer = 0;
    this._orbitAngle = 0;
  }

  get maxLevel() { return this.def.levels.length; }
  get currentLevel() { return this.def.levels[this.level - 1]; }

  update(dt, game) {
    if (this.id === 'void_orbs') {
      this._orbitAngle += this.def.getOrbitSpeed(this.level) * dt;
    }
    if (this.id === 'death_spiral') {
      this.def._scytheAngle = (this.def._scytheAngle || 0) + 3.0 * dt;
    }

    this.cooldownTimer -= dt;
    if (this.cooldownTimer <= 0) {
      const cd = this.currentLevel.cooldown * (1 - game.player.cooldownReduction);
      this.cooldownTimer = cd;
      this.def.fire(game, this.level);
    }
  }

  draw(ctx, game) {
    if (this.id === 'void_orbs' && this.def.drawOrbs) {
      this.def.drawOrbs(game, ctx, this.level, this._orbitAngle);
    }
    if (this.id === 'death_spiral' && this.def.drawScythes) {
      this.def.drawScythes(game, ctx, this.level);
    }
  }

  levelUp() {
    if (this.level < this.maxLevel) this.level++;
  }
}
