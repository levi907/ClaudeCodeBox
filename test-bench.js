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
    critChance: 0, lifesteal: 0, cooldownReduction: 0,
    kills: 0, isDead: false,
    invincibleTime: 0,

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

    // gem flags
    _meteorGem: false,
    _thunderAegis: false,
    _meteorInterval: 9,

    relicName, legMod,
  };
}

// ---- Apply a relic to player ----
const RELICS = {
  none:             p => {},
  forbidden_codex:  p => { p._extraChoices += 3; },
  arcane_cyclone:   p => { p._omniShot += 3; },
  giants_wand:      p => { p._projSizeMult = 8; p._giantsKnockback = 350; },
  cataclysm_clock:  p => { p._nukeInterval = 18; p._nukeRadius = 280; },
  berserker_rage:   p => { p._berserkerMaxMult = 3.0; },
  chain_death:      p => { p._chainDeathPct = 0.6; p._chainDeathRadius = 100; },
  soul_vampire:     p => { p._killHealPct = 0.08; },
  time_warp:        p => { p.cooldownReduction = 0.60; },
  iron_fortress:    p => { p.armor += 40; p._fortressShieldDur = 3; },
  void_prism:       p => { p._voidPrismChance = 1.0; },
  blood_pact:       p => { p.maxHp += 80; p.hp = p.maxHp; p._hpRegen += 4; },
  phantom_strike:   p => { p._phantomStrikeChance = 0.30; },
  echo_chamber:     p => { p._echoInterval = 6; },
  arcane_ward:      p => { p._wardDuration = 8; },
  reapers_scythe:   p => { p._reaperThreshold = 0.20; },
  cursed_mirror:    p => { p._cursedMirror = true; },
};

// ---- Apply a legendary gem mod to wand stats ----
const LEG_MODS = {
  none:            s => {},
  spiral:          s => { s.projLifetime = 9; },   // longer range
  explosive:       s => { s.explosive = true; s.explosionRadius = 60; },
  virulent_poison: s => { s.virulentPoison = true; },
  thunder_aegis:   s => { s.thunderAegis = true; },
  chain_lightning: s => { s.chainLightning = true; },
  meteor:          s => { s.meteor = true; },
  reaper:          s => { s.reaper = true; },
};

// ---- Wand stats (base + optional legendary mod) ----
function makeWandStats(legMod, cdr = 0) {
  const s = {
    damage: 15, cooldown: 1.0, projectiles: 1,
    pierce: 0, bounce: 0, chain: 0,
    projSpeed: 360, projLifetime: 2.5,
    explosive: false, explosionRadius: 60,
    virulentPoison: false, thunderAegis: false,
    chainLightning: false, meteor: false, reaper: false,
  };
  if (legMod && LEG_MODS[legMod]) LEG_MODS[legMod](s);
  s.effectiveCd = s.cooldown * (1 - Math.min(0.8, cdr));
  return s;
}

// ---- Simulate a 30-second fight ----
function simulate(relicName, legMod, durationSec = 30, seed = 42) {
  // Seed-like reset (Node Math.random isn't seedable without extra lib, just use fixed seed behavior)
  const p = makePlayer(relicName, legMod);
  RELICS[relicName](p);

  const ws = makeWandStats(legMod, p.cooldownReduction);

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
  }

  function fireShot() {
    const alive = enemies.filter(e => !e.isDead);
    if (alive.length === 0) return;

    shotCount++;

    let berserkerMult = 1.0;
    if (p._berserkerMaxMult) berserkerMult = 1 + p._berserkerMaxMult * (1 - p.hp / p.maxHp);

    const totalMult = p.damageMultiplier * berserkerMult;
    const projCount = ws.projectiles + (p._voidPrismChance ? 1 : 0);

    function hitEnemy(e, dmgMult = 1) {
      if (e.isDead) return;
      let dmg = Math.round(ws.damage * totalMult * dmgMult);
      const actual = Math.max(1, dmg - e.armor);
      e.hp -= actual;
      totalDamage.dealt += actual;
      if (e.hp <= 0) { e.isDead = true; onEnemyDead(e); return; }

      // Reaper (gem)
      if (ws.reaper && e.hp < e.maxHp * 0.20) {
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

      // Poison
      if (ws.virulentPoison && !e.virulentlyPoisoned) { e.virulentlyPoisoned = true; e.poisoned = 6; }

      // Lifesteal
      if (p.lifesteal > 0) p.hp = Math.min(p.maxHp, p.hp + actual * p.lifesteal);
    }

    for (let i = 0; i < projCount && i < alive.length; i++) {
      hitEnemy(alive[i % alive.length]);
      if (p._phantomStrikeChance && Math.random() < p._phantomStrikeChance) {
        hitEnemy(alive[i % alive.length], 3);
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
      if (e.poisoned > 0) { e.poisoned -= dt; e.hp -= 3 * dt; if (e.hp <= 0) { e.isDead = true; onEnemyDead(e); } }
      if (e.bleed > 0) { e.bleed -= dt; e.hp -= 5 * dt; if (e.hp <= 0) { e.isDead = true; onEnemyDead(e); } }
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

    // Cataclysm Clock nuke
    if (p._nukeInterval) {
      nukeTimer += dt;
      if (nukeTimer >= p._nukeInterval) {
        nukeTimer = 0;
        const dmg = ws.damage * 10;
        for (const e of enemies.filter(e => !e.isDead && dist(e.x, e.y, 0, 0) < p._nukeRadius)) {
          e.hp -= Math.max(1, dmg - e.armor);
          if (e.hp <= 0) { e.isDead = true; onEnemyDead(e); }
        }
        enemies = enemies.filter(e => !e.isDead);
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

    // Meteor gem
    if (p._meteorGem) {
      meteorTimer += dt;
      if (meteorTimer >= 9) {
        meteorTimer = 0;
        const dmg = ws.damage * 12;
        const targets = [...enemies].filter(e=>!e.isDead).sort(()=>Math.random()-0.5).slice(0,3);
        for (const t of targets) {
          const nearby = enemies.filter(n=>!n.isDead && dist(n.x,n.y,t.x,t.y)<110);
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
const RUNS = 10;     // average over 10 runs for variance

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
  ['chain_death', 'explosive'],
  ['arcane_cyclone', 'chain_lightning'],
  ['time_warp', 'spiral'],
  ['berserker_rage', 'reaper'],
  ['soul_vampire', 'virulent_poison'],
  ['void_prism', 'chain_lightning'],
  ['cataclysm_clock', 'meteor'],
  ['echo_chamber', 'explosive'],
  ['phantom_strike', 'chain_lightning'],
  ['reapers_scythe', 'reaper'],
];

console.log('\n── COMBOS (relic + legendary mod) ──');
console.log('Relic + Mod                               Kills  Survive%  DmgDealt');
for (const [r, m] of COMBOS) {
  const res = avgRuns(r, m);
  const label = `${r} + ${m}`.padEnd(42);
  console.log(`${label} ${String(res.kills).padStart(5)}  ${String(res.surviveRate).padStart(7)}%  ${String(res.dmgDealt).padStart(8)}`);
}

console.log('\n====================================================');
console.log(' DONE — use results above to tune mod/relic numbers');
console.log('====================================================\n');
