// ============================================================
//  SPELL SURVIVORS - Entities: Player, Enemy, Projectile, XPOrb
// ============================================================

// ---- Player ----
class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.baseHp = CONFIG.PLAYER_BASE_HP;
    this.maxHp = CONFIG.PLAYER_BASE_HP;
    this.hp = this.maxHp;
    this.baseSpeed = CONFIG.PLAYER_BASE_SPEED;
    this.speed = this.baseSpeed;
    this.armor = CONFIG.PLAYER_BASE_ARMOR;
    this.size = CONFIG.PLAYER_SIZE;
    this.facing = 1;  // 1 = right, -1 = left
    this.animFrame = 0;
    this.flashTime = 0;
    this.invincibleTime = 0;
    this.xp = 0;
    this.level = 1;
    this.xpToNext = xpRequired(1);
    this.kills = 0;
    this.damageMultiplier = 1.0;
    this.speedMultiplier = 1.0;
    this.xpRangeBonus = 0;
    this.critChance = 0;
    this.lifesteal = 0;
    this.cooldownReduction = 0;
    this.projectileCountBonus = 0;
    this.pendingLevelUps = 0;
    this.isDead = false;
    this.vx = 0; this.vy = 0;
  }

  get effectiveSpeed() {
    return this.baseSpeed * this.speedMultiplier;
  }

  get xpRange() {
    return CONFIG.XP_MAGNET_RANGE + this.xpRangeBonus;
  }

  update(dt, input) {
    const move = input.getMovement();
    this.vx = move.x * this.effectiveSpeed;
    this.vy = move.y * this.effectiveSpeed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (move.x !== 0) this.facing = move.x > 0 ? 1 : -1;

    this.animFrame += dt * 60;
    if (this.flashTime > 0) this.flashTime -= dt;
    if (this.invincibleTime > 0) this.invincibleTime -= dt;
  }

  takeDamage(dmg, particles) {
    if (this.invincibleTime > 0) return;
    const actualDmg = Math.max(1, dmg - this.armor);
    this.hp -= actualDmg;
    this.flashTime = 0.12;
    this.invincibleTime = CONFIG.PLAYER_INVINCIBLE_DURATION;
    particles.floatText(this.x, this.y - 20, `-${actualDmg}`, '#ff4040', 15);
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
    }
    return actualDmg;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  gainXP(amount, particles) {
    this.xp += amount;
    let leveled = false;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = xpRequired(this.level);
      this.pendingLevelUps++;
      leveled = true;
    }
    if (leveled) {
      particles.levelUpBurst(this.x, this.y);
    }
    return leveled;
  }

  draw(ctx, screenX, screenY) {
    Sprites.player(ctx, screenX, screenY, this.facing, this.animFrame, this.flashTime);
  }
}

// ---- Enemy Types ----
const ENEMY_DEFS = {
  zombie: {
    name: 'Zombie',
    hp: 30, speed: 45, damage: 12, armor: 0,
    xpDrop: [18, 22],
    size: 16,
    score: 1,
    drawFn: (ctx, x, y, af) => Sprites.enemyZombie(ctx, x, y, 100, 100, af),
    barWidth: 28,
    barColor: '#30a030',
  },
  bat: {
    name: 'Bat',
    hp: 10, speed: 95, damage: 6, armor: 0,
    xpDrop: [18, 22],
    size: 12,
    score: 1,
    drawFn: (ctx, x, y, af) => Sprites.enemyBat(ctx, x, y, af),
    barWidth: 20,
    barColor: '#8030a0',
  },
  golem: {
    name: 'Golem',
    hp: 150, speed: 28, damage: 25, armor: 3,
    xpDrop: [8, 14],
    size: 24,
    score: 3,
    drawFn: (ctx, x, y, af) => Sprites.enemyGolem(ctx, x, y, af),
    barWidth: 40,
    barColor: '#808080',
  },
  wraith: {
    name: 'Wraith',
    hp: 50, speed: 65, damage: 18, armor: 0,
    xpDrop: [5, 9],
    size: 15,
    score: 2,
    drawFn: (ctx, x, y, af) => Sprites.enemyWraith(ctx, x, y, af),
    barWidth: 32,
    barColor: '#8000a0',
  },
  boss: {
    name: 'BOSS',
    hp: 1200, speed: 40, damage: 40, armor: 5,
    xpDrop: [80, 120],
    size: 40,
    score: 20,
    drawFn: (ctx, x, y, af) => Sprites.enemyBoss(ctx, x, y, af),
    barWidth: 60,
    barColor: '#cc0000',
    isBoss: true,
  },
};

class Enemy {
  constructor(x, y, type, difficultyMult) {
    this.x = x; this.y = y;
    this.type = type;
    const def = ENEMY_DEFS[type];
    this.maxHp = Math.floor(def.hp * difficultyMult);
    this.hp = this.maxHp;
    this.speed = def.speed * (1 + (difficultyMult - 1) * 0.5);
    this.damage = Math.floor(def.damage * (1 + (difficultyMult - 1) * 0.6));
    this.armor = def.armor;
    this.size = def.size;
    this.xpDrop = def.xpDrop;
    this.score = def.score;
    this.isBoss = def.isBoss || false;
    this.def = def;
    this.animFrame = rng(0, 100);
    this.knockbackX = 0; this.knockbackY = 0;
    this.frozen = 0;
    this.poisoned = 0;
    this.isDead = false;
    this.id = Math.random();
  }

  update(dt, playerX, playerY) {
    this.animFrame += dt * 60;
    if (this.frozen > 0) { this.frozen -= dt; return; }

    // Move toward player
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const d = Math.sqrt(dx*dx + dy*dy) || 1;
    const spd = this.speed;
    this.x += (dx/d) * spd * dt + this.knockbackX * dt;
    this.y += (dy/d) * spd * dt + this.knockbackY * dt;

    this.knockbackX *= Math.pow(0.05, dt);
    this.knockbackY *= Math.pow(0.05, dt);

    if (this.poisoned > 0) {
      this.poisoned -= dt;
      this.hp -= 3 * dt;
      if (this.hp <= 0) this.isDead = true;
    }
  }

  takeDamage(dmg, isCrit = false) {
    const actual = Math.max(1, dmg - this.armor);
    this.hp -= actual;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
    }
    return { actual, isCrit };
  }

  knockback(fromX, fromY, force) {
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const d = Math.sqrt(dx*dx + dy*dy) || 1;
    this.knockbackX = (dx/d) * force;
    this.knockbackY = (dy/d) * force;
  }

  draw(ctx, screenX, screenY) {
    this.def.drawFn(ctx, screenX, screenY, this.animFrame);
    // Health bar
    if (this.hp < this.maxHp) {
      Sprites.drawHealthBar(ctx, screenX, screenY - this.size - 4,
        this.def.barWidth, this.hp, this.maxHp, this.def.barColor);
    }
    // Frozen effect
    if (this.frozen > 0) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#80d0ff';
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.size + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    // Boss name tag
    if (this.isBoss) {
      ctx.save();
      ctx.font = 'bold 10px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff4040';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 8;
      ctx.fillText('★ BOSS ★', screenX, screenY - this.size - 10);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  dropXP() {
    const count = rngInt(1, this.isBoss ? 15 : 3);
    const amount = rngInt(this.xpDrop[0], this.xpDrop[1]);
    const orbs = [];
    for (let i = 0; i < count; i++) {
      orbs.push({
        x: this.x + rng(-15, 15),
        y: this.y + rng(-15, 15),
        value: Math.ceil(amount / count),
        size: this.isBoss ? 8 : rng(4, 6)
      });
    }
    return orbs;
  }
}

// ---- Projectile ----
class Projectile {
  constructor(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.vx;
    this.vy = opts.vy;
    this.damage = opts.damage || 10;
    this.size = opts.size || 6;
    this.pierce = opts.pierce || 0;
    this.pierceCount = 0;
    this.bounce = opts.bounce || 0;
    this.bounceCount = 0;
    this._needsBounce = false;
    this.chain = opts.chain || 0;
    this.chainRange = opts.chainRange || 130;
    this.type = opts.type || 'bolt';
    this.color = opts.color || '#c050ff';
    this.lifetime = opts.lifetime || 3.0;
    this.age = 0;
    this.isDead = false;
    this.hitEnemies = new Set();
    this.isCrit = opts.isCrit || false;
    // Gem-based special flags
    this.spiraling = opts.spiraling || false;
    this._spiralOmega = 0;
    this.explosive = opts.explosive || false;
    this.explosionRadius = opts.explosionRadius || 0;
    this.virulentPoison = opts.virulentPoison || false;
  }

  update(dt) {
    if (this.spiraling) {
      // Gradually rotate velocity vector, creating a widening spiral
      this._spiralOmega += 2.8 * dt;
      const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const a = Math.atan2(this.vy, this.vx) + this._spiralOmega * dt;
      this.vx = Math.cos(a) * spd;
      this.vy = Math.sin(a) * spd;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.age += dt;
    if (this.age >= this.lifetime) this.isDead = true;
  }

  draw(ctx, screenX, screenY) {
    const a = Math.atan2(this.vy, this.vx);
    Sprites.drawMagicBolt(ctx, screenX, screenY, a, this.color, this.size);
  }

  // Returns true if the hit should be processed.
  // Sets isDead / _needsBounce based on pierce/bounce budget.
  hitEnemy(enemy) {
    if (this.hitEnemies.has(enemy.id)) return false;
    this.hitEnemies.add(enemy.id);
    // Pierce first
    if (this.pierceCount < this.pierce) {
      this.pierceCount++;
      return true;
    }
    // Then bounce
    if (this.bounceCount < this.bounce) {
      this.bounceCount++;
      this._needsBounce = true;
      return true;
    }
    this.isDead = true;
    return true;
  }
}

// ---- XP Orb ----
class XPOrb {
  constructor(x, y, value, size) {
    this.x = x; this.y = y;
    this.value = value;
    this.size = size || 5;
    this.age = 0;
    this.collected = false;
    this.vx = rng(-20, 20);
    this.vy = rng(-30, -10);
    this.settleTime = 0.4;
  }

  update(dt, playerX, playerY, playerRange) {
    this.age += dt;
    if (this.age < this.settleTime) {
      this.vx *= Math.pow(0.1, dt);
      this.vy += 80 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    } else {
      // Attracted to player if in range
      const d = dist(this.x, this.y, playerX, playerY);
      if (d < playerRange) {
        const a = angle(this.x, this.y, playerX, playerY);
        const speed = 200 + (playerRange - d) * 2;
        this.x += Math.cos(a) * speed * dt;
        this.y += Math.sin(a) * speed * dt;
        if (d < 12) this.collected = true;
      }
    }
  }

  draw(ctx, screenX, screenY) {
    Sprites.drawXPOrb(ctx, screenX, screenY, this.size, this.age * 60);
  }
}

// ---- Heart Pickup ----
class HeartPickup {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.age = 0;
    this.collected = false;
    this.healAmount = 30;
  }

  update(dt, playerX, playerY) {
    this.age += dt;
    const d = dist(this.x, this.y, playerX, playerY);
    if (d < 20) this.collected = true;
  }

  draw(ctx, screenX, screenY) {
    Sprites.drawHeart(ctx, screenX, screenY, 8, this.age * 60);
  }
}
