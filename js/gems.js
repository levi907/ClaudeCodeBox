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

function generateGem(rarityOverride) {
  let rarity = rarityOverride;
  if (!rarity) {
    const r = Math.random();
    rarity = r < 0.60 ? 'common' : r < 0.90 ? 'rare' : 'legendary';
  }

  const commonKeys   = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'common');
  const rareKeys     = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'rare');
  const legendaryKeys = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'legendary');

  const mods = [];

  if (rarity === 'common') {
    // 2 unique common mods
    for (const k of shuffleArray([...commonKeys]).slice(0, 2)) {
      mods.push({ type: k, value: MOD_VALUES[k] });
    }
  } else if (rarity === 'rare') {
    // 3 mods: 1-2 rare + rest common
    const rareCount = Math.random() < 0.5 ? 1 : 2;
    const pickedRare   = shuffleArray([...rareKeys]).slice(0, rareCount);
    const pickedCommon = shuffleArray([...commonKeys]).slice(0, 3 - rareCount);
    for (const k of [...pickedRare, ...pickedCommon]) {
      mods.push({ type: k, value: MOD_VALUES[k] });
    }
  } else {
    // Legendary: 1 legendary mod + 1 rare + 2 common  (4 total)
    const legMod  = pick(legendaryKeys);
    const rareMod = pick(rareKeys);
    const comMods = shuffleArray([...commonKeys]).slice(0, 2);
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
