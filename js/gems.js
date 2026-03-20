// ============================================================
//  SPELL SURVIVORS - Gem System
//  Gems socket into the wand and modify its behavior.
//  Common: 1 mod | Rare: 2-3 mods | Legendary: 4 mods (1 legendary + 1 rare + 2 common)
// ============================================================

const MOD_DEFS = {
  // --- Common mods (grey) - basic stat upgrades ---
  flat_damage:     { rarity: 'common',    label: '+Damage',       color: '#aabbcc', format: v => `+${v} Damage` },
  attack_speed:    { rarity: 'common',    label: '+Attack Speed', color: '#aabbcc', format: v => `+${(v * 1000) | 0}ms Attack Speed` },
  max_hp:          { rarity: 'common',    label: '+Max HP',       color: '#aabbcc', format: v => `+${v} Max HP` },
  move_speed:      { rarity: 'common',    label: '+Move Speed',   color: '#aabbcc', format: v => `+${Math.round(v * 100)}% Speed` },
  lifesteal:       { rarity: 'common',    label: '+Lifesteal',    color: '#aabbcc', format: v => `+${Math.round(v * 100)}% Lifesteal` },
  crit_chance:     { rarity: 'common',    label: '+Crit Chance',  color: '#aabbcc', format: v => `+${Math.round(v * 100)}% Crit` },
  armor:           { rarity: 'common',    label: '+Armor',        color: '#aabbcc', format: v => `+${v} Armor` },
  hp_regen:        { rarity: 'common',    label: '+HP Regen',     color: '#aabbcc', format: v => `+${v} HP/s` },
  proj_size:       { rarity: 'common',    label: '+Proj Size',    color: '#aabbcc', format: v => `+${Math.round(v * 100)}% Proj Size` },
  attract:         { rarity: 'common',    label: '+Pickup Range', color: '#aabbcc', format: v => `+${v}px Pickup Range` },

  // --- Rare mods (gold) - advanced upgrades ---
  extra_projectile: { rarity: 'rare',     label: '+Projectiles',  color: '#ffd700', format: v => `+${v} Projectile` },
  pierce:           { rarity: 'rare',     label: '+Pierce',       color: '#ffd700', format: v => `+${v} Pierce` },
  bounce:           { rarity: 'rare',     label: '+Bounce',       color: '#ffd700', format: v => `+${v} Bounce` },
  chain:            { rarity: 'rare',     label: '+Chain',        color: '#ffd700', format: v => `+${v} Chain` },
  cooldown_reduce:  { rarity: 'rare',     label: '+Attack Speed', color: '#ffd700', format: v => `+${Math.round(v * 100)}% Attack Speed` },
  damage_percent:   { rarity: 'rare',     label: '+Damage%',      color: '#ffd700', format: v => `+${Math.round(v * 100)}% Damage` },
  multicast:        { rarity: 'rare',     label: 'Multicast',     color: '#ffd700', format: v => `${Math.round(v * 100)}% chance to fire twice` },
  thorns:           { rarity: 'rare',     label: '+Thorns',       color: '#ffd700', format: v => `Reflect ${v} damage on hit` },
  bleed:            { rarity: 'rare',     label: 'Bleed',         color: '#ffd700', format: () => `Hits cause 5 dmg/s bleed for 3s` },
  magnetism:        { rarity: 'rare',     label: '++Pickup Range',color: '#ffd700', format: v => `+${v}px Pickup Range` },
  poison_chance:    { rarity: 'rare',     label: 'Poison',        color: '#80ff40', format: v => `${Math.round(v * 100)}% chance to stack 2% HP/s poison` },

  // --- Legendary mods (orange) - unique game-changing effects ---
  spiral:           { rarity: 'legendary', label: 'Spiral',           color: '#ff8c00', format: () => 'Projectiles spiral outward (+100% damage, +4 pierce)' },
  explosive:        { rarity: 'legendary', label: 'Explosive',        color: '#ff8c00', format: () => 'Projectiles explode on contact' },
  virulent_poison:  { rarity: 'legendary', label: 'Virulent Poison',  color: '#ff8c00', format: () => 'Poison spreads on enemy death' },
  thunder_aegis:    { rarity: 'legendary', label: 'Thunder Aegis',    color: '#ff8c00', format: () => 'AOE lightning when you take damage' },
  chain_lightning:  { rarity: 'legendary', label: 'Chain Lightning',  color: '#ff8c00', format: () => 'On hit, arc to 3 nearby enemies (60% dmg)' },
  meteor:           { rarity: 'legendary', label: 'Meteor',           color: '#ff8c00', format: () => 'Every 9s drop 3 meteors on enemies' },
  reaper:           { rarity: 'legendary', label: 'Reaper',           color: '#ff8c00', format: () => 'Execute enemies below 20% HP' },
  // ---- New legendary mods ----
  life_leech:       { rarity: 'legendary', label: 'Life Leech',       color: '#ff8c00', format: () => 'Heal 12% of all damage dealt' },
  bounty:           { rarity: 'legendary', label: 'Bounty',           color: '#ff8c00', format: () => '+70% XP from all kills' },
  phase_shot:       { rarity: 'legendary', label: 'Phase Shot',       color: '#ff8c00', format: () => 'Projectiles pierce all enemies (+100% damage)' },
  double_tap:       { rarity: 'legendary', label: 'Double Tap',       color: '#ff8c00', format: () => 'Each shot fires a second bolt (−15% dmg)' },
  overload:         { rarity: 'legendary', label: 'Overload',         color: '#ff8c00', format: () => 'Critical hits explode in 55px AoE' },
  frost_nova:       { rarity: 'legendary', label: 'Frost Nova',       color: '#ff8c00', format: () => '20% hit chance: 60 AoE dmg + freeze nearby enemies 2s' },
  curse:            { rarity: 'legendary', label: 'Curse',            color: '#ff8c00', format: () => 'Cursed enemies take 25% more damage for 5s' },
  decay:            { rarity: 'legendary', label: 'Decay',            color: '#ff8c00', format: () => 'Enemies lose 20% max HP/s for 8s after hit' },
  soul_burst:       { rarity: 'legendary', label: 'Soul Burst',       color: '#ff8c00', format: () => 'On kill: fire 3 soul bolts at nearby foes' },
  shockwave:        { rarity: 'legendary', label: 'Shockwave',        color: '#ff8c00', format: () => 'On kill: push all enemies in 220px away' },
  combustion:       { rarity: 'legendary', label: 'Combustion',       color: '#ff8c00', format: () => 'Poisoned enemies explode on death (150% HP)' },
  blood_frenzy:     { rarity: 'legendary', label: 'Blood Frenzy',     color: '#ff8c00', format: () => 'Kills grant +10% dmg for 3s (max 5 stacks)' },
  storm_call:       { rarity: 'legendary', label: 'Storm Call',       color: '#ff8c00', format: () => 'Every 9s: lightning strikes 5 enemies (6× dmg)' },
  time_stop:        { rarity: 'legendary', label: 'Time Stop',        color: '#ff8c00', format: () => 'Every 15s: deal 80 dmg + freeze all enemies for 1.5s' },
  graviton:         { rarity: 'legendary', label: 'Graviton',         color: '#ff8c00', format: () => 'Every 16s: pull all enemies to you + deal 100 damage' },
  arcane_surge:     { rarity: 'legendary', label: 'Arcane Surge',     color: '#ff8c00', format: () => 'Every 10 kills: auto-fire 6 homing bolts' },
  unstable_core:    { rarity: 'legendary', label: 'Unstable Core',    color: '#ff8c00', format: () => '8% per shot: deal 8× damage' },
  mirror_shot:      { rarity: 'legendary', label: 'Mirror Shot',      color: '#ff8c00', format: () => '25% chance: fire 3 spread copies of your shot' },
  sigil:            { rarity: 'legendary', label: 'Sigil',            color: '#ff8c00', format: () => 'Every 18s: place sigil (25 dmg/s, 7s, 140px)' },
  warp_bolt:        { rarity: 'legendary', label: 'Warp Bolt',        color: '#ff8c00', format: () => 'Every 10s: fire a massive 5× damage bolt' },
  void_pull:        { rarity: 'legendary', label: 'Void Pull',        color: '#ff8c00', format: () => 'Massively increased pickup range' },
};

// Drop weight for each mod (higher = more likely to appear)
const MOD_WEIGHTS = {
  // Common
  flat_damage:      5,
  attack_speed:     4,
  max_hp:           5,
  move_speed:       3,
  lifesteal:        3,
  crit_chance:      3,
  armor:            4,
  hp_regen:         3,
  proj_size:        3,
  attract:          3,
  // Rare
  extra_projectile: 2,
  pierce:           3,
  bounce:           2,
  chain:            2,
  cooldown_reduce:  4,
  damage_percent:   4,
  multicast:        3,
  thorns:           2,
  bleed:            3,
  magnetism:        2,
  poison_chance:    3,
  // Legendary mods — equal chance within legendary tier
  spiral:           1,
  explosive:        1,
  virulent_poison:  1,
  thunder_aegis:    1,
  chain_lightning:  1,
  meteor:           1,
  reaper:           1,
  life_leech:       1,
  bounty:           1,
  phase_shot:       1,
  double_tap:       1,
  overload:         1,
  frost_nova:       1,
  curse:            1,
  decay:            1,
  soul_burst:       1,
  shockwave:        1,
  combustion:       1,
  blood_frenzy:     1,
  storm_call:       1,
  time_stop:        1,
  graviton:         1,
  arcane_surge:     1,
  unstable_core:    1,
  mirror_shot:      1,
  sigil:            1,
  warp_bolt:        1,
  void_pull:        1,
};

// Numeric value for each non-legendary mod
const MOD_VALUES = {
  flat_damage:       10,
  attack_speed:      0.12,
  max_hp:            25,
  move_speed:        0.12,
  lifesteal:         0.06,
  crit_chance:       0.08,
  armor:             6,
  hp_regen:          1.5,
  proj_size:         0.3,
  extra_projectile:  1,
  pierce:            1,
  bounce:            1,
  chain:             1,
  cooldown_reduce:   0.18,
  damage_percent:    0.25,
  multicast:         0.35,
  thorns:            8,
  bleed:             1,   // flag-like
  attract:           50,  // +50px pickup range
  magnetism:         130, // +130px pickup range
  poison_chance:     0.35, // 35% per hit to apply a poison stack
};

const GEM_COLORS = {
  common:           { bg: '#0d1a22', border: '#5577aa', glow: 'rgba(85,119,170,0.4)',  dot: '#6688bb' },
  rare:             { bg: '#0d0d22', border: '#4466cc', glow: 'rgba(68,102,204,0.5)',  dot: '#6699ff' },
  legendary:        { bg: '#22100a', border: '#cc7700', glow: 'rgba(204,119,0,0.6)',   dot: '#ffaa33' },
  superLegendary:   { bg: '#2a0800', border: '#ff6600', glow: 'rgba(255,100,0,0.9)',   dot: '#ff8800' },
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

  const commonKeys    = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'common');
  const rareKeys      = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'rare');
  const legendaryKeys = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'legendary');

  const mods = [];

  if (rarity === 'common') {
    // 20% chance for a common gem to roll a rare mod instead
    if (Math.random() < 0.20) {
      const [rareMod] = weightedPickUnique(rareKeys, 1);
      mods.push({ type: rareMod, value: MOD_VALUES[rareMod] });
    } else {
      for (const k of weightedPickUnique(commonKeys, 1)) {
        mods.push({ type: k, value: MOD_VALUES[k] });
      }
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
    superLegendary: false,
    mods,
  };
}

// Upgrade an existing legendary gem to Super Legendary:
// adds a second legendary mod and marks it superLegendary.
function upgradeSuperLegendary(gem) {
  const legendaryKeys = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'legendary');
  const existingLegMods = gem.mods.filter(m => MOD_DEFS[m.type]?.rarity === 'legendary').map(m => m.type);
  const missing = legendaryKeys.filter(k => !existingLegMods.includes(k));
  const legKey = missing.length ? pick(missing) : pick(legendaryKeys);
  // Insert second legendary mod right after the first legendary mod
  const firstLegIdx = gem.mods.findIndex(m => MOD_DEFS[m.type]?.rarity === 'legendary');
  gem.mods.splice(firstLegIdx + 1, 0, { type: legKey, value: null });
  if (gem.mods.length > 5) gem.mods.length = 5;
  gem.superLegendary = true;
  gem.rarity = 'legendary';
  return gem;
}

// Create a brand-new Super Legendary gem from scratch (2 legendary mods).
function generateSuperLegendaryGem(forcedLegKeys) {
  const legendaryKeys = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'legendary');
  const rareKeys      = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'rare');
  const commonKeys    = Object.keys(MOD_DEFS).filter(k => MOD_DEFS[k].rarity === 'common');

  let [legA, legB] = forcedLegKeys || weightedPickUnique(legendaryKeys, 2);
  const [rareMod]  = weightedPickUnique(rareKeys, 1);
  const comMods    = weightedPickUnique(commonKeys, 2);

  const mods = [
    { type: legA, value: null },
    { type: legB, value: null },
    { type: rareMod, value: MOD_VALUES[rareMod] },
    ...comMods.map(k => ({ type: k, value: MOD_VALUES[k] })),
  ];

  return {
    id: `gem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    rarity: 'legendary',
    superLegendary: true,
    mods,
  };
}
