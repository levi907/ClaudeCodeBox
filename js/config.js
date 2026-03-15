// ============================================================
//  SPELL SURVIVORS - Configuration & Constants
// ============================================================

const CONFIG = {
  // Canvas / display
  BASE_WIDTH: 960,
  BASE_HEIGHT: 540,

  // Player
  PLAYER_BASE_HP: 100,
  PLAYER_BASE_SPEED: 130,
  PLAYER_BASE_ARMOR: 0,
  PLAYER_SIZE: 22,
  PLAYER_INVINCIBLE_DURATION: 0.6,

  // XP
  XP_MAGNET_RANGE: 120,
  XP_BASE_REQUIREMENT: [0, 100, 220, 380, 590, 860, 1200, 1620, 2140, 2780, 3560],
  XP_LEVEL_MULTIPLIER: 1.35,

  // Enemy
  ENEMY_SPAWN_MARGIN: 80,   // pixels beyond screen edge
  ENEMY_SPAWN_INTERVAL_START: 1.2,  // seconds
  ENEMY_SPAWN_INTERVAL_MIN: 0.3,
  BOSS_SPAWN_MINUTES: [3, 6, 10, 15, 20],

  // World
  TILE_SIZE: 64,
  WORLD_CHUNKS: 8,

  // Weapons
  MAX_WEAPONS: 6,
  MAX_RELICS: 6,
  MAX_ITEM_LEVEL: 5,

  // Difficulty
  DIFFICULTY_RAMP: 0.12,   // enemy stat multiplier per minute
};

// ============================================================
//  Utility Functions
// ============================================================

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rng(min, max) { return Math.random() * (max - min) + min; }
function rngInt(min, max) { return Math.floor(rng(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dist(ax, ay, bx, by) { return Math.sqrt((bx-ax)**2 + (by-ay)**2); }
function distSq(ax, ay, bx, by) { return (bx-ax)**2 + (by-ay)**2; }
function angle(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function normalizeAngle(a) { while(a < 0) a += Math.PI*2; while(a > Math.PI*2) a -= Math.PI*2; return a; }

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getXPRequired(level) {
  if (level < CONFIG.XP_LEVEL_MULTIPLIER.length) return CONFIG.XP_BASE_REQUIREMENT[level] || 100;
  return Math.floor(100 * Math.pow(CONFIG.XP_LEVEL_MULTIPLIER, level));
}

// Color helpers
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return {r,g,b};
}
function rgba(r, g, b, a) { return `rgba(${r},${g},${b},${a})`; }
function lerpColor(c1, c2, t) {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  return `rgb(${Math.round(lerp(a.r,b.r,t))},${Math.round(lerp(a.g,b.g,t))},${Math.round(lerp(a.b,b.b,t))})`;
}

// XP level requirement (simpler version)
function xpRequired(level) {
  const base = [0, 100, 220, 380, 590, 860, 1200, 1620, 2140, 2780, 3560];
  if (level <= base.length - 1) return base[level];
  let v = base[base.length - 1];
  for (let i = base.length - 1; i < level; i++) v = Math.floor(v * 1.35);
  return v;
}
