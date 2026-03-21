// ============================================================
//  SPELL SURVIVORS - Weapon System
//  The wand is the only weapon. Gems socketed into it drive
//  all of its stats and special behaviors.
// ============================================================

class Wand {
  constructor() {
    this.socketedGems = [null, null, null]; // 3 gem sockets
    this.cooldownTimer = 0;
    this._shotCount = 0; // tracks total shots fired (for echo_chamber)
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
      armorBonus: 0,
      hpRegenBonus: 0,
      projSizeBonus: 0,
      thornsBonus: 0,

      // Rare gem flags
      multicastChance: 0,
      bleed: false,
      poisonChance: 0,

      // Legendary effects (original)
      spiral: false,
      explosive: false,
      explosionRadius: 60,
      virulentPoison: false,
      thunderAegis: false,
      chainLightning: false,
      meteor: false,
      reaper: false,

      // Pickup range bonus (attract/magnetism/void_pull)
      xpRangeBonus: 0,

      // New legendary mods
      lifeLeech: false,
      bounty: false,
      phaseShot: false,
      doubleTap: false,
      overload: false,
      frostNova: false,
      curse: false,
      decay: false,
      soulBurst: false,
      shockwave: false,
      combustion: false,
      bloodFrenzy: false,
      stormCall: false,
      timeStop: false,
      graviton: false,
      arcaneSurge: false,
      unstableCore: false,
      mirrorShot: false,
      sigil: false,
      warpBolt: false,
      voidPull: false,
      vitalSurge: false,
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
          case 'armor':             s.armorBonus += mod.value; break;
          case 'hp_regen':          s.hpRegenBonus += mod.value; break;
          case 'proj_size':         s.projSizeBonus += mod.value; break;
          case 'thorns':            s.thornsBonus += mod.value; break;
          case 'multicast':         s.multicastChance += mod.value; break;
          case 'bleed':             s.bleed = true; break;
          case 'poison_chance':     s.poisonChance += mod.value; break;
          case 'attract':           s.xpRangeBonus += mod.value; break;
          case 'magnetism':         s.xpRangeBonus += mod.value; break;
          case 'spiral':            s.spiral = true; break;
          case 'explosive':         s.explosive = true; break;
          case 'virulent_poison':   s.virulentPoison = true; break;
          case 'thunder_aegis':     s.thunderAegis = true; break;
          case 'chain_lightning':   s.chainLightning = true; break;
          case 'meteor':            s.meteor = true; break;
          case 'reaper':            s.reaper = true; break;
          case 'life_leech':        s.lifeLeech = true; break;
          case 'bounty':            s.bounty = true; break;
          case 'phase_shot':        s.phaseShot = true; break;
          case 'double_tap':        s.doubleTap = true; break;
          case 'overload':          s.overload = true; break;
          case 'frost_nova':        s.frostNova = true; break;
          case 'curse':             s.curse = true; break;
          case 'decay':             s.decay = true; break;
          case 'soul_burst':        s.soulBurst = true; break;
          case 'shockwave':         s.shockwave = true; break;
          case 'combustion':        s.combustion = true; break;
          case 'blood_frenzy':      s.bloodFrenzy = true; break;
          case 'storm_call':        s.stormCall = true; break;
          case 'time_stop':         s.timeStop = true; break;
          case 'graviton':          s.graviton = true; break;
          case 'arcane_surge':      s.arcaneSurge = true; break;
          case 'unstable_core':     s.unstableCore = true; break;
          case 'mirror_shot':       s.mirrorShot = true; break;
          case 'sigil':             s.sigil = true; break;
          case 'warp_bolt':         s.warpBolt = true; break;
          case 'void_pull':         s.voidPull = true; break;
          case 'vital_surge':       s.vitalSurge = true; break;
        }
      }
    }
    // Single-target legendary mods: add pierce so their effects spread through packs
    // Spiral shoots wide arcs — compensate with +100% damage and extra pierce
    if (s.spiral)          { s.pierce += 4; s.damageMultBonus += 1.0; }
    if (s.virulentPoison)  s.pierce += 4;
    if (s.thunderAegis)    s.pierce += 3;
    if (s.reaper)          s.pierce += 4;
    if (s.lifeLeech)       s.pierce += 4;
    if (s.doubleTap)       s.pierce += 4;
    if (s.curse)           s.pierce += 4;
    if (s.decay)           s.pierce += 4;
    if (s.bloodFrenzy)     s.pierce += 3;
    if (s.unstableCore)    s.pierce += 4;
    if (s.mirrorShot)      s.pierce += 3;
    if (s.shockwave)       s.pierce += 3;
    // Phase shot: pierces everything — reward with +100% damage bonus
    if (s.phaseShot)       s.damageMultBonus += 1.0;

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
    const targets = game.getNearestEnemies(count + 4);
    if (targets.length === 0) return;

    this._shotCount++;

    // Berserker rage: damage bonus based on missing HP
    let berserkerMult = 1.0;
    if (p._berserkerMaxMult) {
      const hpRatio = p.hp / p.maxHp;
      berserkerMult = 1 + p._berserkerMaxMult * (1 - hpRatio);
    }

    // Blood Frenzy: stacking kill bonus
    const bloodFrenzyMult = p._bloodFrenzyMult || 1.0;

    const totalDmgMult = p.damageMultiplier * (1 + stats.damageMultBonus) * berserkerMult * bloodFrenzyMult;
    const projSize = 7 * (p._projSizeMult || 1); // projSizeBonus already applied to _projSizeMult

    const spawnProj = (target, extraTarget, dmgOverride, angleOverride) => {
      const tgt = extraTarget || target;
      let a = angleOverride !== undefined ? angleOverride : angle(p.x, p.y, tgt.x, tgt.y);
      if (count > 1 && !extraTarget && angleOverride === undefined) a += rng(-0.15, 0.15);

      let mult = dmgOverride || totalDmgMult;
      // Unstable Core: 8% chance to deal 8× damage
      if (stats.unstableCore && Math.random() < 0.08) mult *= 8;

      const baseDmg = Math.round(stats.damage * mult);
      const isCrit  = Math.random() < (p.critChance + stats.critBonus);
      const dmg     = isCrit ? baseDmg * 2 : baseDmg;

      // Phase Shot: pierce all enemies; relics can also grant pierce
      const effectivePierce = stats.phaseShot ? 999 : stats.pierce + (p._relicPierceBonus || 0);

      game.spawnProjectile(new Projectile({
        x: p.x, y: p.y,
        vx: Math.cos(a) * stats.projSpeed,
        vy: Math.sin(a) * stats.projSpeed,
        damage: dmg,
        size: projSize,
        pierce: effectivePierce,
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
        bleed: stats.bleed,
        chainLightning: stats.chainLightning,
        reaper: stats.reaper,
        lifeLeech: stats.lifeLeech,
        overload: stats.overload,
        frostNova: stats.frostNova,
        curse: stats.curse,
        decay: stats.decay,
        poisonChance: stats.poisonChance,
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

      // Multicast: chance to fire the same shot twice
      if (stats.multicastChance && Math.random() < stats.multicastChance) {
        spawnProj(target);
      }

      // Phantom Strike: fire a 3× damage phantom bolt
      if (p._phantomStrikeChance && Math.random() < p._phantomStrikeChance) {
        spawnProj(target, null, totalDmgMult * 3);
      }

      // Double Tap: fire a second bolt at 85% damage
      if (stats.doubleTap) {
        spawnProj(target, null, totalDmgMult * 0.85);
      }

      // Mirror Shot: 25% chance to fire 3 spread copies
      if (stats.mirrorShot && Math.random() < 0.25) {
        const baseAngle = angle(p.x, p.y, target.x, target.y);
        spawnProj(target, null, totalDmgMult * 0.7, baseAngle - 0.35);
        spawnProj(target, null, totalDmgMult * 0.7, baseAngle);
        spawnProj(target, null, totalDmgMult * 0.7, baseAngle + 0.35);
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
          bleed: stats.bleed,
          chainLightning: stats.chainLightning,
          reaper: stats.reaper,
          poisonChance: stats.poisonChance,
        }));
      }
    }

    // Echo Chamber: every Nth shot fires bonus omni projectiles
    if (p._echoInterval && this._shotCount % p._echoInterval === 0) {
      const baseDmg = Math.round(stats.damage * totalDmgMult);
      const echoCount = 6;
      for (let i = 0; i < echoCount; i++) {
        const a = (Math.PI * 2 * i) / echoCount;
        game.spawnProjectile(new Projectile({
          x: p.x, y: p.y,
          vx: Math.cos(a) * stats.projSpeed,
          vy: Math.sin(a) * stats.projSpeed,
          damage: baseDmg,
          size: projSize * 1.3,
          pierce: stats.pierce,
          bounce: 0,
          chain: 0,
          chainRange: 0,
          type: 'bolt',
          color: '#00ffcc',
          lifetime: 2.5,
          spiraling: false,
          explosive: stats.explosive,
          explosionRadius: stats.explosionRadius,
        }));
      }
    }
  }
}
