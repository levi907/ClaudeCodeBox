// ============================================================
//  SPELL SURVIVORS - Gem System
//  Gems socket into the wand and modify its behavior.
//  Common: 2 mods | Rare: 3 mods | Legendary: 3 mods + 1 legendary
// ============================================================

const MOD_DEFS = {
  // --- Common mods (grey) - basic stat upgrades ---
  flat_damage:     { rarity: 'common',    label: '+Damage',       color: '#aabbcc', format: v => `+${v} Damage` },
  attack_speed:    { rarity: 'common',    label: '+Attack Speed', color: '#aabbcc', format: v => `-${(v * 1000) | 0}ms Cooldown` },
  max_hp:          { rarity: 'common',    label: '+Max HP',       color: '#aabbcc', format: v => `+${v} Max HP` },
  move_speed:      { rarity: 'common',    label: '+Move Speed',   color: '#aabbcc', format: v => `+${Math.round(v * 100)}% Speed` },
  lifesteal:       { rarity: 'common',    label: '+Lifesteal',    color: '#aabbcc', format: v => `+${Math.round(v * 100)}% Lifesteal` },
  crit_chance:     { rarity: 'common',    label: '+Crit Chance',  color: '#aabbcc', format: v => `+${Math.round(v * 100)}% Crit` },

  // --- Rare mods (gold) - advanced upgrades ---
  extra_projectile: { rarity: 'rare',     label: '+Projectiles',  color: '#ffd700', format: v => `+${v} Projectile` },
  pierce:           { rarity: 'rare',     label: '+Pierce',       color: '#ffd700', format: v => `+${v} Pierce` },
  bounce:           { rarity: 'rare',     label: '+Bounce',       color: '#ffd700', format: v => `+${v} Bounce` },
  chain:            { rarity: 'rare',     label: '+Chain',        color: '#ffd700', format: v => `+${v} Chain` },
  cooldown_reduce:  { rarity: 'rare',     label: '-Cooldown',     color: '#ffd700', format: v => `-${Math.round(v * 100)}% Cooldown` },
  damage_percent:   { rarity: 'rare',     label: '+Damage%',      color: '#ffd700', format: v => `+${Math.round(v * 100)}% Damage` },

  // --- Legendary mods (orange) - unique game-changing effects ---
  spiral:           { rarity: 'legendary', label: 'Spiral',          color: '#ff8c00', format: () => 'Projectiles spiral outward' },
  explosive:        { rarity: 'legendary', label: 'Explosive',       color: '#ff8c00', format: () => 'Projectiles explode on contact' },
  virulent_poison:  { rarity: 'legendary', label: 'Virulent Poison', color: '#ff8c00', format: () => 'Poison spreads on enemy death' },
  thunder_aegis:    { rarity: 'legendary', label: 'Thunder Aegis',   color: '#ff8c00', format: () => 'AOE lightning when you take damage' },
};

// Drop weight for each mod (higher = more likely to appear)
const MOD_WEIGHTS = {
  // Common - balanced, basic stats slightly more common
  flat_damage:      5,
  attack_speed:     4,
  max_hp:           5,
  move_speed:       3,
  lifesteal:        3,
  crit_chance:      3,
  // Rare - projectile-count and chain mods are more impactful so rarer
  extra_projectile: 2,
  pierce:           3,
  bounce:           2,
  chain:            2,
  cooldown_reduce:  4,
  damage_percent:   4,
  // Legendary mods - equal chance within legendary tier
  spiral:           1,
  explosive:        1,
  virulent_poison:  1,
  thunder_aegis:    1,
};

// Numeric value for each non-legendary mod
const MOD_VALUES = {
  flat_damage: 10,
  attack_speed: 0.12,
  max_hp: 25,
  move_speed: 0.12,
  lifesteal: 0.06,
  crit_chance: 0.08,
  extra_projectile: 1,
  pierce: 1,
  bounce: 1,
  chain: 1,
  cooldown_reduce: 0.18,
  damage_percent: 0.25,
};

const GEM_COLORS = {
  common:    { bg: '#0d1a22', border: '#5577aa', glow: 'rgba(85,119,170,0.4)',  dot: '#6688bb' },
  rare:      { bg: '#0d0d22', border: '#4466cc', glow: 'rgba(68,102,204,0.5)',  dot: '#6699ff' },
  legendary: { bg: '#22100a', border: '#cc7700', glow: 'rgba(204,119,0,0.6)',   dot: '#ffaa33' },
};

// Pick `n` unique keys from a list using MOD_WEIGHTS
function weightedPickUnique(keys, n) {
  const pool = [...keys];
  const result = [];
  while (result.length < n && pool.length > 0) {
    const total = pool.reduce((s, k) => s + (MOD_WEIGHTS[k] || 1), 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= (MOD_WEIGHTS[pool[i]] || 1);
      if (r <= 0) { result.push(pool.splice(i, 1)[0]); break; }
    }
  }
  return result;
}

function generateGem(rarityOverride) {
  let rarity = rarityOverride;
  if (!rarity) {
    const r = Math.random();
    rarity = r < 0.70 ? 'common' : r < 0.94 ? 'rare' : 'legendary';
  }

  const commonKeys   = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'common');
  const rareKeys     = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'rare');
  const legendaryKeys = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'legendary');

  const mods = [];

  if (rarity === 'common') {
    for (const k of weightedPickUnique(commonKeys, 2)) {
      mods.push({ type: k, value: MOD_VALUES[k] });
    }
  } else if (rarity === 'rare') {
    const rareCount = Math.random() < 0.5 ? 1 : 2;
    const pickedRare   = weightedPickUnique(rareKeys, rareCount);
    const pickedCommon = weightedPickUnique(commonKeys, 3 - rareCount);
    for (const k of [...pickedRare, ...pickedCommon]) {
      mods.push({ type: k, value: MOD_VALUES[k] });
    }
  } else {
    // Legendary: 1 legendary mod + 1 rare + 2 common  (4 total)
    const [legMod]  = weightedPickUnique(legendaryKeys, 1);
    const [rareMod] = weightedPickUnique(rareKeys, 1);
    const comMods   = weightedPickUnique(commonKeys, 2);
    mods.push({ type: legMod, value: null });
    mods.push({ type: rareMod, value: MOD_VALUES[rareMod] });
    for (const k of comMods) mods.push({ type: k, value: MOD_VALUES[k] });
  }

  return {
    id: `gem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    rarity,
    mods,
  };
}
