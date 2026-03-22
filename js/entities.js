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
    this.pendingRelicLevels = 0;
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
      if (this.level % 5 === 0) {
        this.pendingRelicLevels++;
      } else {
        this.pendingLevelUps++;
      }
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
    hp: 600, speed: 40, damage: 40, armor: 5,
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
    this.poisonStacks = 0;      // stackable % HP poison stacks
    this.poisonStackTimer = 0;  // timer until stacks expire
    this.bleed = 0;     // bleed duration in seconds
    this.cursed = 0;    // cursed duration — takes 25% more damage
    this.decaying = 0;  // decay duration — loses 3% maxHp/s
    this.isDead = false;
    this.id = Math.random();
    // Monster mod system
    this.mods = [];
    this.rarity = 'normal';
    this.barrierActive = false;
    this.erraticTimer = 0;
    this.erraticOffset = 0;
    this.xpMult = 1;
    this._rarityBarColor = null;
  }

  update(dt, playerX, playerY) {
    this.animFrame += dt * 60;
    if (this.frozen > 0) { this.frozen -= dt; return; }

    // Erratic movement: periodically veers off-course but ultimately reaches player
    const isErratic = this.mods.includes('erratic');
    if (isErratic) {
      this.erraticTimer -= dt;
      if (this.erraticTimer <= 0) {
        this.erraticTimer = 0.5 + Math.random() * 1.2;
        this.erraticOffset = (Math.random() - 0.5) * 2.6;
      }
    }

    // Move toward player
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const d = Math.sqrt(dx*dx + dy*dy) || 1;
    const baseAngle = Math.atan2(dy, dx);
    const moveAngle = isErratic ? baseAngle + this.erraticOffset : baseAngle;
    const spd = this.speed;
    this.x += Math.cos(moveAngle) * spd * dt + this.knockbackX * dt;
    this.y += Math.sin(moveAngle) * spd * dt + this.knockbackY * dt;

    this.knockbackX *= Math.pow(0.05, dt);
    this.knockbackY *= Math.pow(0.05, dt);

    // Regeneration mod: heal 2% maxHp/s
    if (this.mods.includes('regeneration') && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.02 * dt);
    }

    if (this.poisoned > 0) {
      this.poisoned -= dt;
      this.hp -= (this.virulentlyPoisoned ? 12 : 3) * dt;
      if (this.hp <= 0) this.isDead = true;
    }

    if (this.bleed > 0) {
      this.bleed -= dt;
      this.hp -= 5 * dt;
      if (this.hp <= 0) this.isDead = true;
    }

    if (this.cursed > 0) this.cursed -= dt;

    if (this.decaying > 0) {
      this.decaying -= dt;
      this.hp -= this.maxHp * 0.20 * dt;
      if (this.hp <= 0) this.isDead = true;
    }

    if (this.poisonStacks > 0) {
      this.poisonStackTimer -= dt;
      this.hp -= this.maxHp * 0.02 * this.poisonStacks * dt;
      if (this.poisonStackTimer <= 0) this.poisonStacks = 0;
      if (this.hp <= 0) this.isDead = true;
    }
  }

  takeDamage(dmg, isCrit = false) {
    const curseMult = this.cursed > 0 ? 1.75 : 1;
    const actual = Math.max(1, Math.round(dmg * curseMult) - this.armor);
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
    // Rarity glow border (drawn behind sprite)
    if (this.rarity === 'uncommon') {
      ctx.save();
      const pulse = 0.7 + 0.3 * Math.sin(this.animFrame * 0.08);
      ctx.shadowColor = '#4499ff';
      ctx.shadowBlur = 14 * pulse;
      ctx.strokeStyle = `rgba(68,153,255,${0.75 + 0.2 * pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.size + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (this.rarity === 'rare') {
      ctx.save();
      const pulse = 0.65 + 0.35 * Math.sin(this.animFrame * 0.1);
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 18 * pulse;
      ctx.strokeStyle = `rgba(255,215,0,${0.8 + 0.2 * pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.size + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Sprite (scaled to current size relative to base def size)
    const scale = this.size / this.def.size;
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(scale, scale);
    this.def.drawFn(ctx, 0, 0, this.animFrame);
    ctx.restore();

    // Health bar
    if (this.hp < this.maxHp) {
      const barColor = this._rarityBarColor || this.def.barColor;
      Sprites.drawHealthBar(ctx, screenX, screenY - this.size - 4,
        this.def.barWidth * scale, this.hp, this.maxHp, barColor);
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

    // Barrier bubble
    if (this.barrierActive) {
      ctx.save();
      const pulse = 0.65 + 0.35 * Math.sin(this.animFrame * 0.14);
      ctx.shadowColor = '#88ccff';
      ctx.shadowBlur = 16 * pulse;
      ctx.strokeStyle = `rgba(136,204,255,${0.7 + 0.25 * pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.size + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.08 * pulse;
      ctx.fillStyle = '#88ccff';
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.size + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Rarity / boss name tag
    if (this.isBoss || this.rarity !== 'normal') {
      ctx.save();
      ctx.font = 'bold 9px "Courier New"';
      ctx.textAlign = 'center';
      if (this.isBoss) {
        ctx.fillStyle = '#ff4040';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 8;
        ctx.font = 'bold 10px "Courier New"';
        ctx.fillText('★ BOSS ★', screenX, screenY - this.size - 10);
      } else if (this.rarity === 'rare') {
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 6;
        ctx.fillText('★ RARE', screenX, screenY - this.size - 10);
      } else if (this.rarity === 'uncommon') {
        ctx.fillStyle = '#4499ff';
        ctx.shadowColor = '#4499ff';
        ctx.shadowBlur = 5;
        ctx.fillText('◆ UNCOMMON', screenX, screenY - this.size - 10);
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  dropXP() {
    const hasHugeXP = this.mods.includes('huge_xp');
    const baseCount = rngInt(1, this.isBoss ? 15 : 3);
    const count = hasHugeXP ? Math.max(12, baseCount * 5) : baseCount;
    const amount = rngInt(this.xpDrop[0], this.xpDrop[1]) * this.xpMult;
    const spread = hasHugeXP ? 50 : 15;
    const orbs = [];
    for (let i = 0; i < count; i++) {
      orbs.push({
        x: this.x + rng(-spread, spread),
        y: this.y + rng(-spread, spread),
        value: Math.ceil(amount / count),
        size: hasHugeXP ? rng(6, 9) : (this.isBoss ? 8 : rng(4, 6))
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
    this.bleed = opts.bleed || false;
    this.chainLightning = opts.chainLightning || false;
    this.reaper = opts.reaper || false;
    // New legendary mod flags
    this.lifeLeech = opts.lifeLeech || false;
    this.overload = opts.overload || false;
    this.frostNova = opts.frostNova || false;
    this.curse = opts.curse || false;
    this.decay = opts.decay || false;
    this.poisonChance = opts.poisonChance || 0;
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
  // Sets isDead / _needsBounce based on bounce/pierce budget.
  // Order: bounce first (active redirect), then pierce (passive pass-through), then die.
  hitEnemy(enemy) {
    if (this.hitEnemies.has(enemy.id)) return false;
    this.hitEnemies.add(enemy.id);
    // Spiraling projectiles pierce everything indefinitely
    if (this.spiraling) return true;
    // Bounce BEFORE pierce — bounce actively redirects toward new targets
    if (this.bounceCount < this.bounce) {
      this.bounceCount++;
      this._needsBounce = true;
      return true;
    }
    // Pierce after bounce is exhausted
    if (this.pierceCount < this.pierce) {
      this.pierceCount++;
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
    if (this.magnetized) {
      // Rush directly to player at high speed regardless of range
      const d = dist(this.x, this.y, playerX, playerY);
      const a = angle(this.x, this.y, playerX, playerY);
      const speed = 500 + (1 - Math.min(d / 400, 1)) * 500;
      this.x += Math.cos(a) * speed * dt;
      this.y += Math.sin(a) * speed * dt;
      if (d < 14) this.collected = true;
      return;
    }
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
    if (this.magnetized) {
      const d = dist(this.x, this.y, playerX, playerY);
      const a = angle(this.x, this.y, playerX, playerY);
      this.x += Math.cos(a) * 500 * dt;
      this.y += Math.sin(a) * 500 * dt;
      if (d < 15) this.collected = true;
      return;
    }
    const d = dist(this.x, this.y, playerX, playerY);
    if (d < 20) this.collected = true;
  }

  draw(ctx, screenX, screenY) {
    Sprites.drawHeart(ctx, screenX, screenY, 8, this.age * 60);
  }
}

// ---- Magic Orb Pickup (rare enemy drop — was XP Magnet) ----
class XPMagnet {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.age = 0;
    this.collected = false;
  }

  update(dt, playerX, playerY) {
    this.age += dt;
    if (dist(this.x, this.y, playerX, playerY) < 22) this.collected = true;
  }

  draw(ctx, screenX, screenY) {
    Sprites.drawMagicOrb(ctx, screenX, screenY, this.age);
  }
}

// ---- Rare Forge Pickup (1% drop) ----
class RareForge {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.age = 0;
    this.collected = false;
  }

  update(dt, playerX, playerY) {
    this.age += dt;
    if (dist(this.x, this.y, playerX, playerY) < 25) this.collected = true;
  }

  draw(ctx, screenX, screenY) {
    ctx.save();
    const pulse = 0.65 + 0.35 * Math.sin(this.age * 4.5);
    ctx.shadowColor = '#40c0ff';
    ctx.shadowBlur = 18 * pulse;
    ctx.font = 'bold 22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.9 + 0.1 * pulse;
    ctx.fillText('🔨', screenX, screenY);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.85;
    ctx.font = 'bold 7px "Courier New"';
    ctx.fillStyle = '#40c0ff';
    ctx.fillText('RARE FORGE', screenX, screenY + 17);
    ctx.restore();
  }
}

// ---- Dice Forge Pickup (0.5% drop) ----
class DiceForge {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.age = 0;
    this.collected = false;
  }

  update(dt, playerX, playerY) {
    this.age += dt;
    if (dist(this.x, this.y, playerX, playerY) < 25) this.collected = true;
  }

  draw(ctx, screenX, screenY) {
    ctx.save();
    const pulse = 0.65 + 0.35 * Math.sin(this.age * 5);
    ctx.shadowColor = '#c080ff';
    ctx.shadowBlur = 18 * pulse;
    ctx.font = 'bold 22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.9 + 0.1 * pulse;
    ctx.fillText('🎲', screenX, screenY);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.85;
    ctx.font = 'bold 7px "Courier New"';
    ctx.fillStyle = '#c080ff';
    ctx.fillText('DICE FORGE', screenX, screenY + 17);
    ctx.restore();
  }
}

// ---- Legendary Forge Pickup (dropped by bosses) ----
class LegendaryForge {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.age = 0;
    this.collected = false;
  }

  update(dt, playerX, playerY) {
    this.age += dt;
    if (dist(this.x, this.y, playerX, playerY) < 42) this.collected = true;
  }

  draw(ctx, screenX, screenY) {
    ctx.save();
    const pulse    = 0.55 + 0.45 * Math.sin(this.age * 3.5);
    const rotation = this.age * 1.2;
    const bob      = Math.sin(this.age * 2.8) * 5;

    // Outer ring glow
    ctx.shadowColor = '#ff8c00';
    ctx.shadowBlur  = 36 * pulse;
    ctx.strokeStyle = `rgba(255,140,0,${0.4 + 0.5 * pulse})`;
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(screenX, screenY + bob, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Rotating diamond bg
    ctx.save();
    ctx.translate(screenX, screenY + bob);
    ctx.rotate(rotation);
    ctx.fillStyle = `rgba(255,120,0,${0.18 + 0.12 * pulse})`;
    ctx.strokeStyle = `rgba(255,180,0,${0.6 + 0.4 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const s = 20;
    ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Hammer icon
    ctx.shadowColor = '#ffcc66';
    ctx.shadowBlur  = 14 * pulse;
    ctx.font        = `bold 26px serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha  = 0.9 + 0.1 * pulse;
    ctx.fillText('⚒', screenX, screenY + bob);

    // Label
    ctx.shadowBlur   = 8;
    ctx.shadowColor  = '#ff8c00';
    ctx.globalAlpha  = 0.9;
    ctx.font         = 'bold 10px "Courier New"';
    ctx.fillStyle    = '#ffcc44';
    ctx.fillText('✦ LEGENDARY FORGE ✦', screenX, screenY + bob + 34);
    ctx.restore();
  }
}
