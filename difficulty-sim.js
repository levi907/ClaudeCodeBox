#!/usr/bin/env node
// ============================================================
//  SPELL SURVIVORS — Invincible Player Difficulty Sim
//  Win = all bosses killed by 6 min AND enemy count never hits 150 cap.
//
//  Key calibration insight:
//  - Real AoE builds (multi-weapon + chain/explosive mods) do 10-25 kills/s
//  - Boss fights distract the player, reducing AoE clear rate
//  - That distraction is the main source of cap-hit risk
//  - Boss kill time variance (±25%) creates win/loss spread for median
// ============================================================
'use strict';

const ENEMY_DEFS = {
  zombie: { hp: 30,   speed: 45, damage: 12, armor: 0, xp: 20 },
  bat:    { hp: 10,   speed: 95, damage: 6,  armor: 0, xp: 20 },
  golem:  { hp: 150,  speed: 28, damage: 25, armor: 3, xp: 11 },
  wraith: { hp: 50,   speed: 65, damage: 18, armor: 0, xp: 7  },
  boss:   { hp: 2000, speed: 40, damage: 40, armor: 5, xp: 100, isBoss: true },
};

function getDiff(minutes, ramp) {
  if (minutes <= 2) return 1 + minutes * ramp.p1;
  if (minutes <= 4) return (1 + 2*ramp.p1) + (minutes-2) * ramp.p2;
  return (1 + 2*ramp.p1 + 2*ramp.p2) + (minutes-4) * ramp.p3;
}

function pickType(minutes) {
  const r = Math.random();
  if (minutes < 1)  return 'zombie';
  if (minutes < 2)  return r < 0.55 ? 'zombie' : 'bat';
  if (minutes < 3)  return r < 0.30 ? 'zombie' : r < 0.60 ? 'bat'  : 'golem';
  if (minutes < 4)  return r < 0.15 ? 'zombie' : r < 0.35 ? 'bat'  : r < 0.65 ? 'golem' : 'wraith';
  if (minutes < 5)  return r < 0.10 ? 'zombie' : r < 0.25 ? 'bat'  : r < 0.60 ? 'golem' : 'wraith';
  return r < 0.05 ? 'zombie' : r < 0.20 ? 'bat' : r < 0.55 ? 'golem' : 'wraith';
}

// ---- Player model ----
// AoE kill rate (enemies/s) reflects a real build at a given game minute:
//   - Multiple weapons active (unlocked via levels)
//   - AoE mods (chain lightning, explosive, cyclone) that hit clusters
//   - Calibrated so at peak:
//     weak  = 1-2 weapons, no AoE mods → ~6-8 kills/s
//     median = 4-5 weapons, some AoE  → ~14-18 kills/s
//     strong = 6 weapons + full AoE   → ~30-40 kills/s
//
// Boss presence reduces AoE clear rate (player attention/angle is split).
// BOSS_DISTRACTION: fraction of AoE kill rate while any boss is alive.
// Will be overridden per sweep below; best value = 0.70 (41% median win)
let BOSS_DISTRACTION = 0.70;

function killRate(tier, minutes) {
  const t = Math.min(1, minutes / 6);
  const rates = {
    weak:   { start: 2.0,  peak: 8.0  },
    median: { start: 4.0,  peak: 18.0 },
    strong: { start: 9.0,  peak: 38.0 },
  };
  const r = rates[tier];
  const easedT = t * t * (3 - 2*t);  // smooth-step
  return r.start + (r.peak - r.start) * easedT;
}

// Single-target DPS for boss fights (wand + focused fire)
function singleTargetDPS(tier, minutes) {
  const t = Math.min(1, minutes / 6);
  const dps = {
    weak:   { start: 15,  peak: 50  },
    median: { start: 30,  peak: 100 },
    strong: { start: 55,  peak: 200 },
  };
  const d = dps[tier];
  return d.start + (d.peak - d.start) * t;
}

// ---- Simulate one run ----
function simulateRun(cfg, tier = 'median') {
  const TICK  = 1 / 30;
  const END_T = 360;
  const CAP   = 150;

  let enemies = [];
  let spawnTimer = 0;
  let bossSpawned = cfg.bossMinutes.map(() => false);
  let bossKillTimes = [];
  let hitCap = false;
  let aliveCount = 0;

  for (let tick = 0; tick * TICK < END_T; tick++) {
    const t       = tick * TICK;
    const minutes = t / 60;

    const diff     = getDiff(minutes, cfg.ramp);
    const bossDiff = getDiff(minutes, { p1: cfg.ramp.p1*1.8, p2: cfg.ramp.p2*1.8, p3: cfg.ramp.p3*1.8 });

    // Boss spawns
    for (let bi = 0; bi < cfg.bossMinutes.length; bi++) {
      if (!bossSpawned[bi] && t >= cfg.bossMinutes[bi] * 60) {
        bossSpawned[bi] = true;
        const def = ENEMY_DEFS.boss;
        enemies.push({
          type: 'boss', isBoss: true,
          hp: Math.floor(def.hp * bossDiff),
          spawnTime: t,
          isDead: false,
        });
        aliveCount++;
      }
    }

    // Regular spawns
    spawnTimer += TICK;
    const spawnInterval = Math.max(cfg.spawnMin, cfg.spawnStart - t * cfg.spawnRampRate);
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      const count = Math.min(1 + Math.floor(minutes * cfg.waveGrowth), cfg.maxWave);
      for (let i = 0; i < count && aliveCount < CAP; i++) {
        const type = pickType(minutes);
        const def  = ENEMY_DEFS[type];
        enemies.push({ type, isBoss: false, hp: Math.floor(def.hp * diff), isDead: false });
        aliveCount++;
      }
    }

    // Check cap AFTER spawning
    if (aliveCount >= CAP) hitCap = true;

    // Player kills enemies
    if (aliveCount > 0) {
      const hasBoss = enemies.some(e => e.isBoss && !e.isDead);

      // Boss damage (single-target DPS with ±25% variance per boss tick)
      if (hasBoss) {
        const dpsVariance = 0.75 + Math.random() * 0.50;  // 0.75–1.25
        const bDmg = singleTargetDPS(tier, minutes) * dpsVariance * TICK;
        for (const e of enemies) {
          if (e.isBoss && !e.isDead) {
            e.hp -= bDmg;
            if (e.hp <= 0) {
              e.isDead = true;
              aliveCount--;
              bossKillTimes.push({ spawnTime: e.spawnTime, killTime: t, killDelay: t - e.spawnTime });
            }
            break;  // one boss at a time
          }
        }
      }

      // AoE clearing — reduced while boss is alive (player focus split)
      const bossStillAlive = enemies.some(e => e.isBoss && !e.isDead);
      const kr = killRate(tier, minutes) * (bossStillAlive ? BOSS_DISTRACTION : 1.0);
      const krVariance = 0.80 + Math.random() * 0.40;  // ±20%
      let toKill = kr * krVariance * TICK;

      for (const e of enemies) {
        if (toKill <= 0) break;
        if (e.isDead || e.isBoss) continue;
        if (toKill >= 1) {
          e.isDead = true;
          aliveCount--;
          toKill -= 1;
        } else {
          if (Math.random() < toKill) {
            e.isDead = true;
            aliveCount--;
          }
          break;
        }
      }
    }

    // Prune dead enemies periodically to keep array manageable
    if (tick % 150 === 0) enemies = enemies.filter(e => !e.isDead);
  }

  const numBossesSpawned = bossSpawned.filter(Boolean).length;
  const allBossesKilled = bossKillTimes.length === numBossesSpawned;
  return { win: allBossesKilled && !hitCap, hitCap, allBossesKilled, bossKillTimes };
}

function batchTest(cfg, tier = 'median', runs = 500) {
  let wins = 0, capHits = 0, bossFailures = 0;
  const killDelays = [];
  for (let i = 0; i < runs; i++) {
    const r = simulateRun(cfg, tier);
    if (r.win) wins++;
    if (r.hitCap) capHits++;
    if (!r.allBossesKilled) bossFailures++;
    for (const bt of r.bossKillTimes) killDelays.push(bt.killDelay);
  }
  const avgKillDelay = killDelays.length
    ? (killDelays.reduce((a,b)=>a+b,0)/killDelays.length).toFixed(1)+'s'
    : 'N/A';
  return {
    winRate:      (wins          / runs * 100).toFixed(1) + '%',
    capRate:      (capHits       / runs * 100).toFixed(1) + '%',
    bossFailRate: (bossFailures  / runs * 100).toFixed(1) + '%',
    bossTime:     avgKillDelay,
  };
}

// ---- Configs ----
const CURRENT = {
  ramp:         { p1: 0.12, p2: 0.12, p3: 0.12 },
  bossMinutes:  [1.5, 3, 4.5, 6],
  spawnStart:   1.2, spawnMin: 0.30, spawnRampRate: 0.010,
  waveGrowth:   0.5, maxWave: 6,
};

// Tuned: easy start, brutal late game
// Piecewise ramp: gentle (0-2min) → moderate (2-4min) → brutal (4-6min)
// 3 bosses at 2, 3.5, 5 min (removed 6-min boss; game ends at 6 min)
const TUNED = {
  ramp:         { p1: 0.07, p2: 0.20, p3: 0.45 },
  bossMinutes:  [2, 3.5, 5],
  spawnStart:   1.4, spawnMin: 0.35, spawnRampRate: 0.009,
  waveGrowth:   0.9, maxWave: 10,
};

// ── Sweep BOSS_DISTRACTION to find ~40% median win rate ──
console.log('\n── BOSS_DISTRACTION SWEEP (TUNED, 500 runs each) ──');
console.log('  Distract  weak_win  median_win  strong_win  median_cap');
for (const bd of [0.50, 0.55, 0.60, 0.65, 0.70, 0.75]) {
  BOSS_DISTRACTION = bd;
  const w = batchTest(TUNED, 'weak',   300);
  const m = batchTest(TUNED, 'median', 500);
  const s = batchTest(TUNED, 'strong', 300);
  console.log(`  ${bd.toFixed(2)}      ${w.winRate.padStart(6)}    ${m.winRate.padStart(6)}      ${s.winRate.padStart(6)}      ${m.capRate}`);
}

// Pick the best distraction value, then run full results
const BEST_DISTRACTION = 0.70;
BOSS_DISTRACTION = BEST_DISTRACTION;

console.log(`\n\n── FINAL RESULTS (distraction=${BEST_DISTRACTION}) ──`);
console.log('\n======================================================');
console.log(' SPELL SURVIVORS — DIFFICULTY SIM (invincible player)');
console.log(` Win = all bosses killed + never hit 150 enemy cap`);
console.log(` Boss distraction factor: ${BOSS_DISTRACTION}`);
console.log(' 500 runs per scenario');
console.log('======================================================\n');

for (const [name, cfg] of [['CURRENT', CURRENT], ['TUNED', TUNED]]) {
  console.log(`── ${name} ──`);
  console.log('  Tier     WinRate  CapHitRate  BossFailRate  AvgBossKill');
  for (const tier of ['weak','median','strong']) {
    const r = batchTest(cfg, tier, 500);
    console.log(`  ${tier.padEnd(8)} ${r.winRate.padStart(6)}   ${r.capRate.padStart(6)}      ${r.bossFailRate.padStart(6)}         ${r.bossTime}`);
  }
  console.log();
}

// Show the tuned difficulty curve
console.log('── TUNED DIFFICULTY CURVE ──');
console.log('  min  diff  zombie_hp  golem_hp  wraith_hp  boss_hp(at spawn)');
for (const m of [0, 1, 2, 3, 4, 5]) {
  const d  = getDiff(m, TUNED.ramp);
  const bd = getDiff(m, { p1: TUNED.ramp.p1*1.8, p2: TUNED.ramp.p2*1.8, p3: TUNED.ramp.p3*1.8 });
  console.log(`   ${m}min  ${d.toFixed(2)}×     ${Math.floor(30*d)}hp       ${Math.floor(150*d)}hp       ${Math.floor(50*d)}hp    ${Math.floor(2000*bd)}hp`);
}

// Spawn rates
console.log('\n── TUNED SPAWN RATE ──');
for (const t of [0, 60, 120, 180, 240, 300, 360]) {
  const interval = Math.max(TUNED.spawnMin, TUNED.spawnStart - t * TUNED.spawnRampRate);
  const waveCount = Math.min(1 + Math.floor((t/60) * TUNED.waveGrowth), TUNED.maxWave);
  const perSec = (waveCount / interval).toFixed(1);
  console.log(`  t=${String(t).padStart(3)}s (${(t/60).toFixed(1)}m): interval=${interval.toFixed(2)}s  wave=${waveCount}  => ${perSec} enemies/s`);
}

// Player kill rate vs spawn rate comparison
console.log('\n── MEDIAN KILL RATE vs SPAWN RATE (TUNED) ──');
console.log('  min  killRate  spawn/s  delta  (+ = clearing, - = accumulating)');
for (const m of [0, 1, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]) {
  const kr = killRate('median', m);
  const t = m * 60;
  const interval = Math.max(TUNED.spawnMin, TUNED.spawnStart - t * TUNED.spawnRampRate);
  const wave = Math.min(1 + Math.floor(m * TUNED.waveGrowth), TUNED.maxWave);
  const spawn = wave / interval;
  const krBoss = kr * BOSS_DISTRACTION;
  const delta = (kr - spawn).toFixed(1);
  const deltaBoss = (krBoss - spawn).toFixed(1);
  console.log(`  ${String(m).padStart(3)}m  ${kr.toFixed(1).padStart(7)}/s  ${spawn.toFixed(1).padStart(6)}/s  ${delta.padStart(5)} (boss: ${deltaBoss})`);
}
console.log('\n======================================================\n');
