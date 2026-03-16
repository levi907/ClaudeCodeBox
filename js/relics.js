// ============================================================
//  SPELL SURVIVORS - Relics System
//  10 powerful game-changing relics
// ============================================================

const RELIC_DEFS = {

  forbidden_codex: {
    id: 'forbidden_codex',
    name: 'Forbidden Codex',
    icon: '📖',
    type: 'relic',
    desc: 'See more gem choices every level-up.',
    levels: [
      { desc: 'Choose from 4 gems per level-up', extraChoices: 1 },
      { desc: 'Choose from 5 gems per level-up', extraChoices: 2 },
      { desc: 'Choose from 6 gems per level-up', extraChoices: 3 },
    ],
    apply(player, level) {
      player._extraChoices = (player._extraChoices || 0) + this.levels[level - 1].extraChoices;
    },
  },

  arcane_cyclone: {
    id: 'arcane_cyclone',
    name: 'Arcane Cyclone',
    icon: '🌀',
    type: 'relic',
    desc: 'Fire extra projectiles in all directions each shot.',
    levels: [
      { desc: '+2 omnidirectional projectiles per shot', omniShot: 2 },
      { desc: '+4 omnidirectional projectiles per shot', omniShot: 4 },
      { desc: '+6 omnidirectional projectiles per shot', omniShot: 6 },
    ],
    apply(player, level) {
      player._omniShot = (player._omniShot || 0) + this.levels[level - 1].omniShot;
    },
  },

  giants_wand: {
    id: 'giants_wand',
    name: "Giant's Wand",
    icon: '🔮',
    type: 'relic',
    desc: 'Your projectiles grow to enormous size.',
    levels: [
      { desc: '3× projectile size', sizeMult: 3 },
      { desc: '6× projectile size', sizeMult: 6 },
      { desc: '10× projectile size', sizeMult: 10 },
    ],
    apply(player, level) {
      player._projSizeMult = this.levels[level - 1].sizeMult;
    },
  },

  cataclysm_clock: {
    id: 'cataclysm_clock',
    name: 'Cataclysm Clock',
    icon: '💥',
    type: 'relic',
    desc: 'Periodically detonates a massive explosion around you.',
    levels: [
      { desc: 'Nuke every 30s — 250px kill radius', nukeInterval: 30, nukeRadius: 250 },
      { desc: 'Nuke every 25s — 350px kill radius', nukeInterval: 25, nukeRadius: 350 },
      { desc: 'Nuke every 20s — 450px kill radius', nukeInterval: 20, nukeRadius: 450 },
    ],
    apply(player, level) {
      const def = this.levels[level - 1];
      player._nukeInterval = def.nukeInterval;
      player._nukeRadius   = def.nukeRadius;
    },
  },

  berserker_rage: {
    id: 'berserker_rage',
    name: 'Berserker Rage',
    icon: '😈',
    type: 'relic',
    desc: 'Deal more damage the lower your HP.',
    levels: [
      { desc: 'Up to +100% damage at 1 HP', maxMult: 1.0 },
      { desc: 'Up to +200% damage at 1 HP', maxMult: 2.0 },
      { desc: 'Up to +400% damage at 1 HP', maxMult: 4.0 },
    ],
    apply(player, level) {
      player._berserkerMaxMult = this.levels[level - 1].maxMult;
    },
  },

  chain_death: {
    id: 'chain_death',
    name: 'Chain Death',
    icon: '⛓',
    type: 'relic',
    desc: 'Enemies explode on death, damaging nearby foes.',
    levels: [
      { desc: 'Deaths deal 60% dmg in 80px', pct: 0.60, radius: 80 },
      { desc: 'Deaths deal 100% dmg in 120px', pct: 1.00, radius: 120 },
      { desc: 'Deaths deal 150% dmg in 180px', pct: 1.50, radius: 180 },
    ],
    apply(player, level) {
      const def = this.levels[level - 1];
      player._chainDeathPct    = def.pct;
      player._chainDeathRadius = def.radius;
    },
  },

  soul_vampire: {
    id: 'soul_vampire',
    name: 'Soul Vampire',
    icon: '🧛',
    type: 'relic',
    desc: 'Each kill restores a portion of your max HP.',
    levels: [
      { desc: 'Heal 3% max HP per kill', healPct: 0.03 },
      { desc: 'Heal 7% max HP per kill', healPct: 0.07 },
      { desc: 'Heal 15% max HP per kill', healPct: 0.15 },
    ],
    apply(player, level) {
      player._killHealPct = this.levels[level - 1].healPct;
    },
  },

  time_warp: {
    id: 'time_warp',
    name: 'Time Warp',
    icon: '⏰',
    type: 'relic',
    desc: 'Massively reduce all weapon cooldowns.',
    levels: [
      { desc: '-40% all cooldowns', cdr: 0.40 },
      { desc: '-55% all cooldowns', cdr: 0.55 },
      { desc: '-70% all cooldowns', cdr: 0.70 },
    ],
    apply(player, level) {
      player.cooldownReduction = Math.max(player.cooldownReduction, this.levels[level - 1].cdr);
    },
  },

  iron_fortress: {
    id: 'iron_fortress',
    name: 'Iron Fortress',
    icon: '🛡️',
    type: 'relic',
    desc: 'Gain massive armor. Become briefly invincible when near death.',
    levels: [
      { desc: '+10 Armor', armor: 10 },
      { desc: '+20 Armor, invincible for 2s when below 20% HP', armor: 20, lowHpShield: 2 },
      { desc: '+35 Armor, invincible for 4s when below 30% HP', armor: 35, lowHpShield: 4 },
    ],
    apply(player, level) {
      const def = this.levels[level - 1];
      player.armor += def.armor;
      if (def.lowHpShield) player._fortressShieldDur = def.lowHpShield;
    },
  },

  void_prism: {
    id: 'void_prism',
    name: 'Void Prism',
    icon: '💎',
    type: 'relic',
    desc: 'Each shot has a chance to fire at an additional target.',
    levels: [
      { desc: '40% chance to fire at a second enemy', chance: 0.40 },
      { desc: '70% chance to fire at a second enemy', chance: 0.70 },
      { desc: 'Always fire at a second enemy (+50% more)', chance: 1.0 },
    ],
    apply(player, level) {
      player._voidPrismChance = this.levels[level - 1].chance;
    },
  },
};

// ---- Active Relic Instance ----
class RelicInstance {
  constructor(id) {
    this.id = id;
    this.def = RELIC_DEFS[id];
    this.level = 1;
  }

  get maxLevel() { return this.def.levels.length; }
  get currentLevel() { return this.def.levels[this.level - 1]; }

  apply(player) {
    this.def.apply(player, this.level);
  }

  levelUp() {
    if (this.level < this.maxLevel) this.level++;
  }
}
