#!/usr/bin/env node
// ============================================================
//  SPELL SURVIVORS - Balance Test Bench
//  Headless simulation: measures each relic/legendary mod in
//  isolation. Reports kills per 30s and survivability score.
// ============================================================
'use strict';

// ---- Minimal game math ----
const rng = (a, b) => Math.random() * (b - a) + a;
const dist = (ax, ay, bx, by) => Math.sqrt((bx-ax)**2+(by-ay)**2);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---- Enemy defs (from entities.js) ----
const ENEMY_DEFS = {
  zombie: { hp: 30, damage: 8,  armor: 0,  speed: 55,  xp: 10 },
  bat:    { hp: 20, damage: 6,  armor: 0,  speed: 90,  xp: 8  },
  golem:  { hp: 80, damage: 14, armor: 4,  speed: 40,  xp: 20 },
  wraith: { hp: 55, damage: 10, armor: 2,  speed: 70,  xp: 15 },
  boss:   { hp: 500,damage: 25, armor: 8,  speed: 45,  xp: 100 },
};

// ---- Base player ----
function makePlayer(relicName, legMod) {
  return {
    hp: 100, maxHp: 100, armor: 0,
    damageMultiplier: 1.0, speedMultiplier: 1.0,
    critChance: 0.10, lifesteal: 0, cooldownReduction: 0,
    kills: 0, isDead: false,
    invincibleTime: 0,
    xpRangeBonus: 0, _xpMult: 1.0,

    _relicPierceBonus: 0,

    // relic flags
    _hpRegen: 0,
    _omniShot: 0,
    _projSizeMult: 1,
    _nukeInterval: 0, _nukeRadius: 0,
    _berserkerMaxMult: 0,
    _chainDeathPct: 0, _chainDeathRadius: 0,
    _killHealPct: 0,
    _voidPrismChance: 0,
    _fortressShieldDur: 0,
    _wardDuration: 0,
    _phantomStrikeChance: 0,
    _echoInterval: 0,
    _reaperThreshold: 0,
    _cursedMirror: false,
    _giantsKnockback: 0,
    _extraChoices: 0,
    // new relic mechanics
    _soulDrain: 0, _soulDrainTimer: 0,
    _thorns: 0, _thornsTimer: 0,
    _bloodPactBleed: false,
    _wardZap: false, _wardZapTimer: 0,
    _mirrorPulse: false, _mirrorPulseTimer: 0,

    // gem flags
    _meteorGem: false,
    _thunderAegis: false,
    // New legendary mod gem flags
    _soulBurstGem: false,
    _shockwaveGem: false,
    _combustionGem: false,
    _bloodFrenzyGem: false,
    _stormCallGem: false,
    _timeStopGem: false,
    _gravitonGem: false,
    _sigilGem: false,
    _warpBoltGem: false,
    _arcaneSurgeGem: false,
    _bloodFrenzyStacks: 0,
    _bloodFrenzyTimer: 0,
    _arcaneKillCount: 0,

    relicName, legMod,
  };
}

// ---- Apply a relic to player ----
const RELICS = {
  none:             p => {},
  forbidden_codex:  p => { p._extraChoices += 3; p.damageMultiplier += 1.0; p._relicPierceBonus += 3; },
  arcane_cyclone:   p => { p._omniShot += 3; },
  giants_wand:      p => { p._projSizeMult = 8; p._giantsKnockback = 350; p._omniShot += 2; },
  cataclysm_clock:  p => { p._nukeInterval = 12; p._nukeRadius = 550; },
  berserker_rage:   p => { p._berserkerMaxMult = 3.0; p.damageMultiplier *= 2.0; p._relicPierceBonus += 3; },
  chain_death:      p => { p._chainDeathPct = 0.6; p._chainDeathRadius = 100; },
  soul_vampire:     p => { p._killHealPct = 0.08; p._soulDrain = 80; },
  time_warp:        p => { p.cooldownReduction = 0.60; p._relicPierceBonus += 3; },
  iron_fortress:    p => { p.armor += 40; p._fortressShieldDur = 3; p._thorns += 20; },
  void_prism:       p => { p._voidPrismChance = 1.0; p._relicPierceBonus += 3; },
  blood_pact:       p => { p.maxHp += 80; p.hp = p.maxHp; p._hpRegen += 4; p._bloodPactBleed = true; p.damageMultiplier += 0.8; p._relicPierceBonus += 3; },
  phantom_strike:   p => { p._phantomStrikeChance = 0.30; p._relicPierceBonus += 4; },
  echo_chamber:     p => { p._echoInterval = 4; },
  arcane_ward:      p => { p._wardDuration = 8; p._wardZap = true; },
  reapers_scythe:   p => { p._reaperThreshold = 0.25; p.damageMultiplier += 0.6; p._relicPierceBonus += 3; },
  cursed_mirror:    p => { p._cursedMirror = true; p._mirrorPulse = true; },
};

// ---- Apply a legendary gem mod to wand stats ----
const LEG_MODS = {
  none:            (s, p) => {},
  spiral:          (s, p) => { s.projLifetime = 9; s.pierce += 3; },
  explosive:       (s, p) => { s.explosive = true; s.explosionRadius = 60; },
  virulent_poison: (s, p) => { s.virulentPoison = true; s.pierce += 3; },
  thunder_aegis:   (s, p) => { s.thunderAegis = true; s.pierce += 2; },
  chain_lightning: (s, p) => { s.chainLightning = true; },
  meteor:          (s, p) => { s.meteorGem = true; },
  reaper:          (s, p) => { s.reaper = true; s.pierce += 3; },
  // New legendary mods
  life_leech:      (s, p) => { s.lifeLeech = true; s.pierce += 3; },
  bounty:          (s, p) => { p._xpMult = 1.7; },
  phase_shot:      (s, p) => { s.pierce = 999; },
  double_tap:      (s, p) => { s.doubleTap = true; s.pierce += 3; },
  overload:        (s, p) => { s.overload = true; p.critChance = Math.max(p.critChance, 0.40); },
  frost_nova:      (s, p) => { s.frostNova = true; },
  curse:           (s, p) => { s.curse = true; s.pierce += 3; },
  decay:           (s, p) => { s.decay = true; s.decayDuration = 10; s.pierce += 3; },
  soul_burst:      (s, p) => { p._soulBurstGem = true; },
  shockwave:       (s, p) => { p._shockwaveGem = true; s.pierce += 2; },
  combustion:      (s, p) => { p._combustionGem = true; s.virulentPoison = true; },
  blood_frenzy:    (s, p) => { p._bloodFrenzyGem = true; s.pierce += 2; },
  storm_call:      (s, p) => { p._stormCallGem = true; },
  time_stop:       (s, p) => { p._timeStopGem = true; },
  graviton:        (s, p) => { p._gravitonGem = true; },
  arcane_surge:    (s, p) => { p._arcaneSurgeGem = true; },
  unstable_core:   (s, p) => { s.unstableCore = true; s.pierce += 3; },
  mirror_shot:     (s, p) => { s.mirrorShot = true; s.pierce += 2; },
  sigil:           (s, p) => { p._sigilGem = true; },
  warp_bolt:       (s, p) => { p._warpBoltGem = true; },
  void_pull:       (s, p) => { p.xpRangeBonus = 400; },
  poison_chance:   (s, p) => { s.poisonChance = 0.10; }, // 10% chance to apply a poison stack per hit
};

// ---- Wand stats (base + optional legendary mod) ----
function makeWandStats(legMod, cdr = 0, player = null) {
  const s = {
    damage: 20, cooldown: 1.0, projectiles: 1,
    pierce: 0, bounce: 0, chain: 0,
    projSpeed: 360, projLifetime: 2.5,
    explosive: false, explosionRadius: 60,
    virulentPoison: false, thunderAegis: false,
    chainLightning: false, meteorGem: false, reaper: false,
    lifeLeech: false, doubleTap: false, overload: false,
    frostNova: false, curse: false, decay: false,
    unstableCore: false, mirrorShot: false,
  };
  if (legMod && LEG_MODS[legMod]) LEG_MODS[legMod](s, player || {});
  s.effectiveCd = s.cooldown * (1 - Math.min(0.8, cdr));
  return s;
}

// ---- Simulate a 30-second fight ----
function simulate(relicName, legMod, durationSec = 30, seed = 42) {
  // Seed-like reset (Node Math.random isn't seedable without extra lib, just use fixed seed behavior)
  const p = makePlayer(relicName, legMod);
  RELICS[relicName](p);

  const ws = makeWandStats(legMod, p.cooldownReduction, p);

  // Enemy pool — rolling respawn from wave timer
  let enemies = [];
  let spawnTimer = 0;
  const SPAWN_INTERVAL = 0.6; // enemies per second at mid-game
  const SPAWN_COUNT = 3;
  const WORLD_RADIUS = 500;

  let wandTimer = 0;
  let nukeTimer = 0;
  let meteorTimer = 0;
  let wardTimer = 999;
  let shotCount = 0;
  let stormTimer = 0;
  let timeStopTimer = 0;
  let gravitonTimer = 0;
  let sigilTimer = 0;
  let sigilList = [];
  let warpBoltTimer = 0;
  let thunderAegisTimer = 0;

  const totalDamage = { dealt: 0 };
  const damageReceived = { total: 0 };

  // Enemy factory
  function spawnEnemy() {
    const a = Math.random() * Math.PI * 2;
    const r = 300 + Math.random() * 200;
    const types = ['zombie', 'bat', 'golem', 'wraith'];
    const type = types[Math.floor(Math.random() * types.length)];
    const def = ENEMY_DEFS[type];
    const diff = 1.2; // mid-game difficulty
    return {
      x: Math.cos(a) * r, y: Math.sin(a) * r,
      hp: Math.floor(def.hp * diff), maxHp: Math.floor(def.hp * diff),
      armor: def.armor, damage: def.damage,
      speed: def.speed, size: 18,
      isDead: false, id: Math.random(),
      poisoned: 0, bleed: 0,
      virulentlyPoisoned: false,
    };
  }

  function spawnN(n) {
    for (let i = 0; i < n; i++) enemies.push(spawnEnemy());
  }

  spawnN(8); // initial pack

  function onEnemyDead(e) {
    p.kills++;

    // Soul Vampire
    if (p._killHealPct) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * p._killHealPct);

    // Chain Death (no cascade: _chainKill flag prevents re-triggering)
    if (p._chainDeathPct && p._chainDeathRadius && !e._chainKill) {
      const dmg = Math.round(e.maxHp * p._chainDeathPct);
      const nearby = enemies.filter(n => !n.isDead && n !== e && dist(n.x, n.y, e.x, e.y) < p._chainDeathRadius);
      for (const n of nearby) {
        n.hp -= Math.max(1, dmg - n.armor);
        if (n.hp <= 0) { n._chainKill = true; n.isDead = true; onEnemyDead(n); }
      }
    }

    // Soul Burst: fire 3 bolts at nearby enemies (simulate as 3 hits)
    if (p._soulBurstGem) {
      const alive = enemies.filter(e2 => !e2.isDead);
      const boltDmg = Math.round(ws.damage * p.damageMultiplier * 0.8);
      for (let i = 0; i < Math.min(3, alive.length); i++) {
        const actual = Math.max(1, boltDmg - alive[i].armor);
        alive[i].hp -= actual;
        totalDamage.dealt += actual;
        if (alive[i].hp <= 0) { alive[i].isDead = true; onEnemyDead(alive[i]); }
      }
    }

    // Combustion: poisoned enemies explode (no cascade)
    if (p._combustionGem && e.poisoned > 0 && !e._combustionKill) {
      const combDmg = Math.round(e.maxHp * 0.6);
      const nearby = enemies.filter(n => !n.isDead && dist(n.x, n.y, e.x, e.y) < 120);
      for (const n of nearby) {
        const ca = Math.max(1, combDmg - n.armor);
        n.hp -= ca; totalDamage.dealt += ca;
        if (n.hp <= 0) { n._combustionKill = true; n.isDead = true; onEnemyDead(n); }
      }
    }

    // Shockwave: on kill, deal 150% base damage to 8 nearby enemies
    if (p._shockwaveGem && !e._shockwaveKill) {
      const shockDmg = Math.round(ws.damage * p.damageMultiplier * 0.8);
      const shockTargets = [...enemies].filter(n => !n.isDead && n !== e)
        .sort((a, b) => dist(a.x, a.y, e.x, e.y) - dist(b.x, b.y, e.x, e.y)).slice(0, 6);
      for (const n of shockTargets) {
        n.hp -= Math.max(1, shockDmg - n.armor);
        totalDamage.dealt += Math.max(1, shockDmg - n.armor);
        if (n.hp <= 0) { n._shockwaveKill = true; n.isDead = true; onEnemyDead(n); }
      }
    }

    // Blood Frenzy: +15% dmg per kill for 5s (max 8 stacks)
    if (p._bloodFrenzyGem) {
      p._bloodFrenzyStacks = Math.min(8, p._bloodFrenzyStacks + 1);
      p._bloodFrenzyTimer = 5;
    }

    // Arcane Surge: every 5 kills fire 10 bolts
    if (p._arcaneSurgeGem) {
      p._arcaneKillCount++;
      if (p._arcaneKillCount % 5 === 0) {
        const alive = enemies.filter(e2 => !e2.isDead);
        const surgeDmg = Math.round(ws.damage * p.damageMultiplier * 1.5);
        for (let i = 0; i < Math.min(10, alive.length); i++) {
          const actual = Math.max(1, surgeDmg - alive[i].armor);
          alive[i].hp -= actual;
          totalDamage.dealt += actual;
          if (alive[i].hp <= 0) { alive[i].isDead = true; onEnemyDead(alive[i]); }
        }
      }
    }
  }

  function fireShot() {
    const alive = enemies.filter(e => !e.isDead);
    if (alive.length === 0) return;

    shotCount++;

    let berserkerMult = 1.0;
    if (p._berserkerMaxMult) berserkerMult = 1 + p._berserkerMaxMult * (1 - p.hp / p.maxHp);
    const bloodFrenzyMult = p._bloodFrenzyMult || 1.0;

    const totalMult = p.damageMultiplier * berserkerMult * bloodFrenzyMult;
    const totalPierce = (ws.pierce || 0) + (p._relicPierceBonus || 0);
    const projCount = ws.projectiles + (p._voidPrismChance ? 1 : 0);
    // Each projectile can pierce N additional targets (capped at alive.length)
    const targetsPerProj = 1 + Math.min(totalPierce, alive.length - 1);

    function hitEnemy(e, dmgMult = 1) {
      if (e.isDead) return;
      let finalMult = dmgMult;
      // Unstable Core: 18% chance 10× damage
      if (ws.unstableCore && Math.random() < 0.18) finalMult *= 10;
      let dmg = Math.round(ws.damage * totalMult * finalMult);
      const isCrit = Math.random() < p.critChance;
      if (isCrit) dmg *= 2;
      // Curse: apply first so the applying hit also benefits (+75% damage)
      if (ws.curse) e.cursed = Math.max(e.cursed || 0, 8);
      const curseMult = e.cursed > 0 ? 1.75 : 1;
      const actual = Math.max(1, Math.round(dmg * curseMult) - e.armor);
      e.hp -= actual;
      totalDamage.dealt += actual;

      // Life Leech
      if (ws.lifeLeech) p.hp = Math.min(p.maxHp, p.hp + actual * 0.12);

      // Overload: crit hits target 2 closest enemies for 60% AoE damage
      if (ws.overload && isCrit) {
        const oaDmg = Math.round(ws.damage * totalMult * 0.8);
        const oaTargets = [...alive].filter(t => !t.isDead && t !== e)
          .sort((a, b) => dist(a.x, a.y, e.x, e.y) - dist(b.x, b.y, e.x, e.y)).slice(0, 3);
        for (const t of oaTargets) {
          const oa = Math.max(1, oaDmg - t.armor);
          t.hp -= oa; totalDamage.dealt += oa;
          if (t.hp <= 0) { t.isDead = true; onEnemyDead(t); }
        }
      }

      // Frost Nova: 20% chance freeze nearby
      if (ws.frostNova && Math.random() < 0.20) {
        for (const t of alive.filter(t => !t.isDead && dist(t.x, t.y, e.x, e.y) < 150)) t.frozen = Math.max(t.frozen || 0, 2);
      }

      // Decay mod: apply decay (10s at 12% maxHp/s)
      if (ws.decay) e.decaying = Math.max(e.decaying || 0, ws.decayDuration || 10);

      if (e.hp <= 0) { e.isDead = true; onEnemyDead(e); return; }

      // Reaper (gem): execute at 40% HP
      if (ws.reaper && e.hp < e.maxHp * 0.40) {
        e.isDead = true; onEnemyDead(e); return;
      }

      // Chain Lightning
      if (ws.chainLightning) {
        const chainDmg = Math.round(ws.damage * totalMult * 0.6);
        const ct = alive.filter(t => !t.isDead && t !== e && dist(t.x, t.y, e.x, e.y) < 200)
          .sort((a,b) => dist(0,0,a.x,a.y) - dist(0,0,b.x,b.y)).slice(0, 3);
        for (const t of ct) {
          const ca = Math.max(1, chainDmg - t.armor);
          t.hp -= ca; totalDamage.dealt += ca;
          if (t.hp <= 0) { t.isDead = true; onEnemyDead(t); }
        }
      }

      // Explosive
      if (ws.explosive) {
        const nearby = alive.filter(t => !t.isDead && t !== e && dist(t.x, t.y, e.x, e.y) < ws.explosionRadius);
        for (const t of nearby) {
          const ea = Math.max(1, Math.round(ws.damage * totalMult * 0.7) - t.armor);
          t.hp -= ea; totalDamage.dealt += ea;
          if (t.hp <= 0) { t.isDead = true; onEnemyDead(t); }
        }
      }

      // Blood Pact: shots apply bleed
      if (p._bloodPactBleed) e.bleed = Math.max(e.bleed || 0, 3);

      // Poison (virulent): 10s duration at 12 dmg/s
      if (ws.virulentPoison && !e.virulentlyPoisoned) { e.virulentlyPoisoned = true; e.poisoned = 10; }

      // Stackable % HP poison (poison_chance stat)
      if (ws.poisonChance && Math.random() < ws.poisonChance) {
        e.poisonStacks = Math.min((e.poisonStacks || 0) + 1, 8);
        e.poisonStackTimer = 4.0;
      }

      // Lifesteal
      if (p.lifesteal > 0) p.hp = Math.min(p.maxHp, p.hp + actual * p.lifesteal);
    }

    for (let i = 0; i < projCount && i < alive.length; i++) {
      // Pierce: hit multiple targets per projectile
      for (let pi = 0; pi < targetsPerProj && (i + pi) < alive.length; pi++) {
        hitEnemy(alive[(i + pi) % alive.length]);
      }
      if (p._phantomStrikeChance && Math.random() < p._phantomStrikeChance) {
        hitEnemy(alive[i % alive.length], 3);
      }
      // Double Tap: second shot at 85% damage
      if (ws.doubleTap && i < alive.length) {
        hitEnemy(alive[i % alive.length], 0.85);
      }
      // Mirror Shot: 40% chance fire 3 spread copies at 70%
      if (ws.mirrorShot && Math.random() < 0.40) {
        for (let m = 0; m < 3; m++) hitEnemy(alive[i % alive.length], 0.7);
      }
    }

    // Omni shots (Arcane Cyclone)
    if (p._omniShot > 0) {
      // Hit up to _omniShot random enemies
      const omniTargets = [...alive].sort(() => Math.random() - 0.5).slice(0, p._omniShot);
      for (const t of omniTargets) hitEnemy(t);
    }

    // Echo Chamber: every Nth shot hits 6 extra
    if (p._echoInterval && shotCount % p._echoInterval === 0) {
      const echoTargets = [...alive].sort(() => Math.random() - 0.5).slice(0, 6);
      for (const t of echoTargets) hitEnemy(t);
    }
  }

  // ---- Main simulation loop (fixed 60fps ticks) ----
  const dt = 1 / 60;
  const totalTicks = Math.round(durationSec / dt);

  for (let tick = 0; tick < totalTicks; tick++) {
    if (p.isDead) break;

    const t = tick * dt;

    // HP regen
    if (p._hpRegen) p.hp = Math.min(p.maxHp, p.hp + p._hpRegen * dt);

    // Ward regenerates
    if (p._wardDuration) wardTimer += dt;

    // Invincibility decay
    if (p.invincibleTime > 0) p.invincibleTime -= dt;

    // Iron Fortress low-HP shield
    if (p._fortressShieldDur && p.hp / p.maxHp < 0.25 && p.invincibleTime <= 0) {
      p.invincibleTime = p._fortressShieldDur;
    }

    // Spawn enemies
    spawnTimer += dt;
    if (spawnTimer >= SPAWN_INTERVAL) {
      spawnTimer = 0;
      spawnN(SPAWN_COUNT);
    }

    // Remove dead enemies; cap list size
    enemies = enemies.filter(e => !e.isDead);
    if (enemies.length > 120) enemies.length = 120;

    // Update enemy DoTs
    for (const e of enemies) {
      if (e.frozen > 0) e.frozen -= dt;
      if (e.poisoned > 0) { e.poisoned -= dt; e.hp -= (e.virulentlyPoisoned ? 12 : 3) * dt; if (e.hp <= 0) { e.isDead = true; onEnemyDead(e); } }
      if (e.poisonStacks > 0) {
        e.poisonStackTimer -= dt;
        if (e.poisonStackTimer <= 0) { e.poisonStacks = 0; }
        else { e.hp -= e.poisonStacks * 0.02 * e.maxHp * dt; if (e.hp <= 0) { e.isDead = true; onEnemyDead(e); } }
      }
      if (e.bleed > 0) { e.bleed -= dt; e.hp -= 5 * dt; if (e.hp <= 0) { e.isDead = true; onEnemyDead(e); } }
      if (e.cursed > 0) e.cursed -= dt;
      if (e.decaying > 0) { e.decaying -= dt; e.hp -= e.maxHp * 0.12 * dt; if (e.hp <= 0) { e.isDead = true; onEnemyDead(e); } }
    }
    enemies = enemies.filter(e => !e.isDead);

    // Enemies attack player
    for (const e of enemies) {
      if (dist(e.x, e.y, 0, 0) < 25) {
        if (p.invincibleTime <= 0) {
          // Ward
          if (p._wardDuration && wardTimer >= p._wardDuration) {
            wardTimer = 0;
          } else {
            const dmg = Math.max(0, e.damage - p.armor);
            p.hp -= dmg;
            damageReceived.total += dmg;
            // Cursed Mirror
            if (p._cursedMirror) {
              const nearby = enemies.filter(n => dist(n.x, n.y, 0, 0) < 300);
              for (const n of nearby) { n.hp -= Math.max(1, e.damage - n.armor); if (n.hp <= 0) { n.isDead = true; onEnemyDead(n); } }
            }
            if (p.hp <= 0) { p.isDead = true; break; }
            p.invincibleTime = 0.6;
          }
        }
      }
    }

    // Wand fires
    wandTimer += dt;
    if (wandTimer >= ws.effectiveCd) {
      wandTimer = 0;
      fireShot();
    }

    // Blood Frenzy decay
    if (p._bloodFrenzyStacks > 0) {
      p._bloodFrenzyTimer -= dt;
      if (p._bloodFrenzyTimer <= 0) { p._bloodFrenzyStacks = 0; p._bloodFrenzyTimer = 0; }
    }
    // Blood frenzy multiplier applied to damageMultiplier dynamically
    p._bloodFrenzyMult = 1 + 0.15 * p._bloodFrenzyStacks;

    // Storm Call: lightning strikes 5 enemies every 9s
    if (p._stormCallGem) {
      stormTimer += dt;
      if (stormTimer >= 9) {
        stormTimer = 0;
        const stormDmg = Math.round(ws.damage * p.damageMultiplier * 6);
        const stormTargets = [...enemies].filter(e=>!e.isDead).sort(()=>Math.random()-0.5).slice(0,5);
        for (const t of stormTargets) {
          const sa = Math.max(1, stormDmg - t.armor);
          t.hp -= sa; totalDamage.dealt += sa;
          if (t.hp <= 0) { t.isDead = true; onEnemyDead(t); }
        }
      }
    }

    // Time Stop: freeze all enemies every 15s
    if (p._timeStopGem) {
      timeStopTimer += dt;
      if (timeStopTimer >= 15) {
        timeStopTimer = 0;
        for (const e of enemies) e.frozen = Math.max(e.frozen || 0, 1.5);
      }
    }

    // Graviton: pull all enemies toward center every 16s
    if (p._gravitonGem) {
      gravitonTimer += dt;
      if (gravitonTimer >= 16) {
        gravitonTimer = 0;
        for (const e of enemies) {
          e.x *= 0.6; e.y *= 0.6; // pull 40% closer
        }
      }
    }

    // Sigil: place damage zone every 18s
    if (p._sigilGem) {
      sigilTimer += dt;
      if (sigilTimer >= 18) {
        sigilTimer = 0;
        sigilList.push({ age: 0, duration: 7 });
      }
      for (let si = sigilList.length - 1; si >= 0; si--) {
        sigilList[si].age += dt;
        if (sigilList[si].age >= sigilList[si].duration) { sigilList.splice(si, 1); continue; }
        // Damage 8 closest enemies (models enemies clustering around player in real gameplay)
        const sigilTargets = [...enemies].filter(e=>!e.isDead)
          .sort((a,b)=>dist(a.x,a.y,0,0)-dist(b.x,b.y,0,0)).slice(0, 8);
        for (const e of sigilTargets) {
          e.hp -= 15 * dt;
          totalDamage.dealt += 15 * dt;
          if (e.hp <= 0) { e.isDead = true; onEnemyDead(e); }
        }
      }
    }

    // Warp Bolt: fire massive bolt every 10s
    if (p._warpBoltGem) {
      warpBoltTimer += dt;
      if (warpBoltTimer >= 10) {
        warpBoltTimer = 0;
        const wbDmg = Math.round(ws.damage * p.damageMultiplier * 5);
        const wbTargets = [...enemies].filter(e=>!e.isDead)
          .sort((a,b)=>dist(a.x,a.y,0,0)-dist(b.x,b.y,0,0)).slice(0, 4);
        for (const t of wbTargets) {
          const wa = Math.max(1, wbDmg - t.armor);
          t.hp -= wa; totalDamage.dealt += wa;
          if (t.hp <= 0) { t.isDead = true; onEnemyDead(t); }
        }
      }
    }

    // Cataclysm Clock nuke (cap to 15 enemies to model realistic screen density)
    if (p._nukeInterval) {
      nukeTimer += dt;
      if (nukeTimer >= p._nukeInterval) {
        nukeTimer = 0;
        const dmg = ws.damage * 10;
        const nukeTargets = [...enemies].filter(e => !e.isDead && dist(e.x, e.y, 0, 0) < p._nukeRadius)
          .sort((a, b) => dist(a.x, a.y, 0, 0) - dist(b.x, b.y, 0, 0)).slice(0, 15);
        for (const e of nukeTargets) {
          e.hp -= Math.max(1, dmg - e.armor);
          if (e.hp <= 0) { e.isDead = true; onEnemyDead(e); }
        }
        enemies = enemies.filter(e => !e.isDead);
      }
    }

    // Soul Drain aura: deal 5 damage/s to 8 closest enemies (models clustering in real gameplay)
    if (p._soulDrain > 0) {
      p._soulDrainTimer += dt;
      if (p._soulDrainTimer >= 1) {
        p._soulDrainTimer = 0;
        const drainTargets = [...enemies].filter(e => !e.isDead)
          .sort((a, b) => dist(a.x, a.y, 0, 0) - dist(b.x, b.y, 0, 0)).slice(0, 8);
        for (const e of drainTargets) {
          const drainDmg = Math.max(1, 5 - e.armor);
          e.hp -= drainDmg;
          totalDamage.dealt += drainDmg;
          p.hp = Math.min(p.maxHp, p.hp + 2);
          if (e.hp <= 0) { e.isDead = true; onEnemyDead(e); }
        }
      }
    }

    // Thorns aura (Iron Fortress): damage 3 closest enemies every 2s (models melee clustering)
    if (p._thorns > 0) {
      p._thornsTimer += dt;
      if (p._thornsTimer >= 2) {
        p._thornsTimer = 0;
        const thornTargets = [...enemies].filter(e => !e.isDead)
          .sort((a, b) => dist(a.x, a.y, 0, 0) - dist(b.x, b.y, 0, 0)).slice(0, 3);
        for (const e of thornTargets) {
          const thornDmg = Math.max(1, p._thorns - e.armor);
          e.hp -= thornDmg;
          totalDamage.dealt += thornDmg;
          if (e.hp <= 0) { e.isDead = true; onEnemyDead(e); }
        }
      }
    }

    // Arcane Ward zap: discharge at 6 nearest enemies every _wardDuration seconds
    if (p._wardZap) {
      p._wardZapTimer += dt;
      if (p._wardZapTimer >= p._wardDuration) {
        p._wardZapTimer = 0;
        const zapDmg = Math.round(ws.damage * p.damageMultiplier * 3);
        const zapTargets = [...enemies].filter(e => !e.isDead)
          .sort((a, b) => dist(a.x, a.y, 0, 0) - dist(b.x, b.y, 0, 0)).slice(0, 6);
        for (const t of zapTargets) {
          const za = Math.max(1, zapDmg - t.armor);
          t.hp -= za; totalDamage.dealt += za;
          if (t.hp <= 0) { t.isDead = true; onEnemyDead(t); }
        }
      }
    }

    // Cursed Mirror pulse: 30 arcane damage to 10 closest enemies every 6s
    if (p._mirrorPulse) {
      p._mirrorPulseTimer += dt;
      if (p._mirrorPulseTimer >= 6) {
        p._mirrorPulseTimer = 0;
        const pulseTargets = [...enemies].filter(e => !e.isDead)
          .sort((a, b) => dist(a.x, a.y, 0, 0) - dist(b.x, b.y, 0, 0)).slice(0, 10);
        for (const e of pulseTargets) {
          const pulseDmg = Math.max(1, 30 - e.armor);
          e.hp -= pulseDmg;
          totalDamage.dealt += pulseDmg;
          if (e.hp <= 0) { e.isDead = true; onEnemyDead(e); }
        }
      }
    }

    // Reaper's Scythe relic: execute low-HP
    if (p._reaperThreshold) {
      for (const e of enemies) {
        if (!e.isDead && e.hp > 0 && e.hp < e.maxHp * p._reaperThreshold) {
          e.isDead = true; onEnemyDead(e);
        }
      }
    }

    // Thunder Aegis: periodic burst every 8s to 8 nearest enemies for 1.5× damage
    if (ws.thunderAegis) {
      thunderAegisTimer += dt;
      if (thunderAegisTimer >= 8) {
        thunderAegisTimer = 0;
        const taDmg = Math.round(ws.damage * p.damageMultiplier * 1.5);
        const taTargets = [...enemies].filter(e=>!e.isDead)
          .sort((a,b)=>dist(a.x,a.y,0,0)-dist(b.x,b.y,0,0)).slice(0, 8);
        for (const t of taTargets) {
          const ta = Math.max(1, taDmg - t.armor);
          t.hp -= ta; totalDamage.dealt += ta;
          if (t.hp <= 0) { t.isDead = true; onEnemyDead(t); }
        }
      }
    }

    // Meteor gem (1 meteor, 6× dmg, 80px radius)
    if (ws.meteorGem) {
      meteorTimer += dt;
      if (meteorTimer >= 9) {
        meteorTimer = 0;
        const dmg = Math.round(ws.damage * p.damageMultiplier * 6);
        const targets = [...enemies].filter(e=>!e.isDead).sort(()=>Math.random()-0.5).slice(0,1);
        for (const t of targets) {
          const nearby = enemies.filter(n=>!n.isDead && dist(n.x,n.y,t.x,t.y)<80);
          for (const n of nearby) { n.hp -= Math.max(1,dmg-n.armor); if(n.hp<=0){n.isDead=true;onEnemyDead(n);} }
        }
      }
    }
  }

  const survived = !p.isDead;
  const survivedSeconds = survived ? durationSec : p.isDead ? durationSec : durationSec;

  return {
    kills: p.kills,
    survived,
    damageReceived: damageReceived.total,
    finalHp: p.hp,
    totalDamage: totalDamage.dealt,
  };
}

// ---- Run all tests ----
const DURATION = 60; // 60-second sim per test
const RUNS = 100;    // average over 100 runs for variance

function avgRuns(relicName, legMod) {
  let totalKills = 0, totalDmgReceived = 0, totalDmgDealt = 0, survivedCount = 0;
  for (let i = 0; i < RUNS; i++) {
    const r = simulate(relicName, legMod, DURATION);
    totalKills += r.kills;
    totalDmgReceived += r.damageReceived;
    totalDmgDealt += r.totalDamage;
    if (r.survived) survivedCount++;
  }
  return {
    kills: (totalKills / RUNS).toFixed(1),
    surviveRate: ((survivedCount / RUNS) * 100).toFixed(0),
    dmgDealt: (totalDmgDealt / RUNS).toFixed(0),
    dmgReceived: (totalDmgReceived / RUNS).toFixed(0),
  };
}

console.log('\n====================================================');
console.log(' SPELL SURVIVORS — BALANCE TEST BENCH');
console.log(` Simulation: ${DURATION}s per test, ${RUNS} runs averaged`);
console.log('====================================================\n');

// Test all relics (no legendary mod)
console.log('── RELICS (base wand, no legendary gem) ──');
console.log('Relic               Kills  Survive%  DmgDealt  DmgRcvd');
for (const r of Object.keys(RELICS)) {
  const res = avgRuns(r, 'none');
  const name = r.padEnd(20);
  console.log(`${name} ${String(res.kills).padStart(5)}  ${String(res.surviveRate).padStart(7)}%  ${String(res.dmgDealt).padStart(8)}  ${String(res.dmgReceived).padStart(7)}`);
}

// Test all legendary mods (no relic)
console.log('\n── LEGENDARY MODS (no relic) ──');
console.log('Mod                 Kills  Survive%  DmgDealt  DmgRcvd');
for (const m of Object.keys(LEG_MODS)) {
  const res = avgRuns('none', m);
  const name = m.padEnd(20);
  console.log(`${name} ${String(res.kills).padStart(5)}  ${String(res.surviveRate).padStart(7)}%  ${String(res.dmgDealt).padStart(8)}  ${String(res.dmgReceived).padStart(7)}`);
}

// Test selected powerful combos
const COMBOS = [
  ['chain_death',    'explosive'],
  ['arcane_cyclone', 'chain_lightning'],
  ['time_warp',      'spiral'],
  ['berserker_rage', 'reaper'],
  ['soul_vampire',   'virulent_poison'],
  ['void_prism',     'chain_lightning'],
  ['cataclysm_clock','meteor'],
  ['echo_chamber',   'explosive'],
  ['phantom_strike', 'chain_lightning'],
  ['reapers_scythe', 'reaper'],
  ['blood_pact',     'poison_chance'],
  ['phantom_strike', 'poison_chance'],
  ['berserker_rage', 'decay'],
  ['time_warp',      'double_tap'],
];

console.log('\n── COMBOS (relic + legendary mod) ──');
console.log('Relic + Mod                               Kills  Survive%  DmgDealt');
for (const [r, m] of COMBOS) {
  const res = avgRuns(r, m);
  const label = `${r} + ${m}`.padEnd(42);
  console.log(`${label} ${String(res.kills).padStart(5)}  ${String(res.surviveRate).padStart(7)}%  ${String(res.dmgDealt).padStart(8)}`);
}

// ── Enemy type kill test ──
// Verify each monster type is killable: track average shots to kill
console.log('\n── ENEMY TYPE KILL VERIFICATION (base wand, 100 trials each) ──');
console.log('Type       Avg shots to kill  Killable');
const ENEMY_TYPES_TEST = ['zombie', 'bat', 'golem', 'wraith', 'boss'];
for (const type of ENEMY_TYPES_TEST) {
  const def = ENEMY_DEFS[type];
  const diff = 1.0;
  const eDmg = 20; // base wand damage
  const ePierce = 0;
  let totalShots = 0;
  const KILL_TRIALS = 100;
  for (let i = 0; i < KILL_TRIALS; i++) {
    const hp = Math.floor(def.hp * diff);
    const armor = def.armor;
    let remaining = hp;
    let shots = 0;
    while (remaining > 0 && shots < 500) {
      const isCrit = Math.random() < 0.10;
      const dmg = isCrit ? eDmg * 2 : eDmg;
      remaining -= Math.max(1, dmg - armor);
      shots++;
    }
    totalShots += shots;
  }
  const avg = (totalShots / KILL_TRIALS).toFixed(1);
  const killable = totalShots < 500 * KILL_TRIALS ? 'YES ✓' : 'NO ✗';
  console.log(`${type.padEnd(10)} ${String(avg).padStart(17)}  ${killable}`);
}

console.log('\n====================================================');
console.log(' DONE — use results above to tune mod/relic numbers');
console.log('====================================================\n');
