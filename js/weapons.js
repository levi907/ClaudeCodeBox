// ============================================================
//  SPELL SURVIVORS - Weapon System
//  The wand is the only weapon. Gems socketed into it drive
//  all of its stats and special behaviors.
// ============================================================

class Wand {
  constructor() {
    this.socketedGems = [null, null, null]; // 3 gem sockets
    this.cooldownTimer = 0;
  }

  // Derive all wand stats and player-affecting bonuses from socketed gems
  computeStats() {
    const s = {
      // Base wand fire stats
      damage: 15,
      cooldown: 1.0,
      projectiles: 1,
      pierce: 0,
      bounce: 0,
      chain: 0,
      chainRange: 130,
      projSpeed: 360,

      // Player bonuses granted by gems
      maxHpBonus: 0,
      moveSpeedBonus: 0,
      lifestealBonus: 0,
      critBonus: 0,
      cooldownReduction: 0,
      damageMultBonus: 0,

      // Legendary effects
      spiral: false,
      explosive: false,
      explosionRadius: 60,
      virulentPoison: false,
      thunderAegis: false,
    };

    for (const gem of this.socketedGems) {
      if (!gem) continue;
      for (const mod of gem.mods) {
        switch (mod.type) {
          case 'flat_damage':       s.damage += mod.value; break;
          case 'attack_speed':      s.cooldown = Math.max(0.25, s.cooldown - mod.value); break;
          case 'max_hp':            s.maxHpBonus += mod.value; break;
          case 'move_speed':        s.moveSpeedBonus += mod.value; break;
          case 'lifesteal':         s.lifestealBonus += mod.value; break;
          case 'crit_chance':       s.critBonus += mod.value; break;
          case 'extra_projectile':  s.projectiles += mod.value; break;
          case 'pierce':            s.pierce += mod.value; break;
          case 'bounce':            s.bounce += mod.value; break;
          case 'chain':             s.chain += mod.value; break;
          case 'cooldown_reduce':   s.cooldownReduction += mod.value; break;
          case 'damage_percent':    s.damageMultBonus += mod.value; break;
          case 'spiral':            s.spiral = true; break;
          case 'explosive':         s.explosive = true; break;
          case 'virulent_poison':   s.virulentPoison = true; break;
          case 'thunder_aegis':     s.thunderAegis = true; break;
        }
      }
    }
    return s;
  }

  update(dt, game) {
    const stats = this.computeStats();
    const totalCdr = Math.min(0.8, stats.cooldownReduction + game.player.cooldownReduction);
    const cd = stats.cooldown * (1 - totalCdr);

    this.cooldownTimer -= dt;
    if (this.cooldownTimer <= 0) {
      this.cooldownTimer = cd;
      this._fire(game, stats);
    }
  }

  _fire(game, stats) {
    const p = game.player;
    const count = stats.projectiles + p.projectileCountBonus;
    const targets = game.getNearestEnemies(count + 2); // a few extras for prism
    if (targets.length === 0) return;

    // Berserker rage: damage bonus based on missing HP
    let berserkerMult = 1.0;
    if (p._berserkerMaxMult) {
      const hpRatio = p.hp / p.maxHp;
      berserkerMult = 1 + p._berserkerMaxMult * (1 - hpRatio);
    }

    const totalDmgMult = p.damageMultiplier * (1 + stats.damageMultBonus) * berserkerMult;
    const projSize = 7 * (p._projSizeMult || 1);

    const spawnProj = (target, extraTarget) => {
      const tgt = extraTarget || target;
      let a = angle(p.x, p.y, tgt.x, tgt.y);
      if (count > 1 && !extraTarget) a += rng(-0.15, 0.15);

      const baseDmg = Math.round(stats.damage * totalDmgMult);
      const isCrit  = Math.random() < (p.critChance + stats.critBonus);
      const dmg     = isCrit ? baseDmg * 2 : baseDmg;

      game.spawnProjectile(new Projectile({
        x: p.x, y: p.y,
        vx: Math.cos(a) * stats.projSpeed,
        vy: Math.sin(a) * stats.projSpeed,
        damage: dmg,
        size: projSize,
        pierce: stats.pierce,
        bounce: stats.bounce,
        chain: stats.chain,
        chainRange: stats.chainRange,
        type: 'bolt',
        color: '#c050ff',
        lifetime: stats.spiral ? 9.0 : 2.5,
        isCrit,
        spiraling: stats.spiral,
        explosive: stats.explosive,
        explosionRadius: stats.explosionRadius,
        virulentPoison: stats.virulentPoison,
      }));
    };

    // Main targeted shots
    for (let i = 0; i < count; i++) {
      const target = targets[i % targets.length];
      spawnProj(target);

      // Void Prism: chance to fire at a second target
      if (p._voidPrismChance && Math.random() < p._voidPrismChance) {
        const altTarget = targets.find((t, idx) => idx !== (i % targets.length)) || target;
        spawnProj(target, altTarget);
      }
    }

    // Arcane Cyclone: omni-directional shots
    if (p._omniShot > 0) {
      const baseDmg = Math.round(stats.damage * totalDmgMult);
      const isCrit  = Math.random() < (p.critChance + stats.critBonus);
      const dmg     = isCrit ? baseDmg * 2 : baseDmg;
      for (let i = 0; i < p._omniShot; i++) {
        const a = (Math.PI * 2 * i) / p._omniShot;
        game.spawnProjectile(new Projectile({
          x: p.x, y: p.y,
          vx: Math.cos(a) * stats.projSpeed,
          vy: Math.sin(a) * stats.projSpeed,
          damage: dmg,
          size: projSize,
          pierce: stats.pierce,
          bounce: 0,
          chain: 0,
          chainRange: stats.chainRange,
          type: 'bolt',
          color: '#ff80c0',
          lifetime: stats.spiral ? 9.0 : 2.5,
          isCrit,
          spiraling: stats.spiral,
          explosive: stats.explosive,
          explosionRadius: stats.explosionRadius,
          virulentPoison: stats.virulentPoison,
        }));
      }
    }
  }
}
