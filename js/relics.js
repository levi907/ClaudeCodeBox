// ============================================================
//  SPELL SURVIVORS - Relics System
//  10 powerful game-changing relics (no levels, full strength on pickup)
// ============================================================

const RELIC_DEFS = {

  forbidden_codex: {
    id: 'forbidden_codex',
    name: 'Forbidden Codex',
    icon: '📖',
    desc: 'Choose from 6 gems every level-up.',
    apply(player) { player._extraChoices += 3; },
  },

  arcane_cyclone: {
    id: 'arcane_cyclone',
    name: 'Arcane Cyclone',
    icon: '🌀',
    desc: 'Fire 6 extra projectiles in all directions each shot.',
    apply(player) { player._omniShot += 6; },
  },

  giants_wand: {
    id: 'giants_wand',
    name: "Giant's Wand",
    icon: '🔮',
    desc: 'Your projectiles are 10× larger.',
    apply(player) { player._projSizeMult = 10; },
  },

  cataclysm_clock: {
    id: 'cataclysm_clock',
    name: 'Cataclysm Clock',
    icon: '💥',
    desc: 'Massive explosion every 20s kills all nearby enemies.',
    apply(player) { player._nukeInterval = 20; player._nukeRadius = 450; },
  },

  berserker_rage: {
    id: 'berserker_rage',
    name: 'Berserker Rage',
    icon: '😈',
    desc: 'Deal up to 4× more damage the lower your HP.',
    apply(player) { player._berserkerMaxMult = 3.0; },
  },

  chain_death: {
    id: 'chain_death',
    name: 'Chain Death',
    icon: '⛓',
    desc: 'Enemies explode on death, dealing 150% damage in a large area.',
    apply(player) { player._chainDeathPct = 1.5; player._chainDeathRadius = 180; },
  },

  soul_vampire: {
    id: 'soul_vampire',
    name: 'Soul Vampire',
    icon: '🧛',
    desc: 'Each kill restores 15% of your max HP.',
    apply(player) { player._killHealPct = 0.15; },
  },

  time_warp: {
    id: 'time_warp',
    name: 'Time Warp',
    icon: '⏰',
    desc: '-70% all weapon cooldowns.',
    apply(player) { player.cooldownReduction = Math.max(player.cooldownReduction, 0.70); },
  },

  iron_fortress: {
    id: 'iron_fortress',
    name: 'Iron Fortress',
    icon: '🛡️',
    desc: '+35 Armor. Become invincible for 4s when below 30% HP.',
    apply(player) { player.armor += 35; player._fortressShieldDur = 4; },
  },

  void_prism: {
    id: 'void_prism',
    name: 'Void Prism',
    icon: '💎',
    desc: 'Every shot also fires at a second enemy.',
    apply(player) { player._voidPrismChance = 1.0; },
  },
};

// ---- Active Relic Instance ----
class RelicInstance {
  constructor(id) {
    this.id = id;
    this.def = RELIC_DEFS[id];
  }

  apply(player) {
    this.def.apply(player);
  }
}
