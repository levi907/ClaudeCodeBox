// ============================================================
//  SPELL SURVIVORS - Relics System
//  16 powerful game-changing relics (no levels, full strength on pickup)
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
    desc: 'Fire 3 extra projectiles in all directions each shot.',
    apply(player) { player._omniShot += 3; },
  },

  giants_wand: {
    id: 'giants_wand',
    name: "Giant's Wand",
    icon: '🔮',
    desc: 'Your projectiles are 8× larger and knock enemies back.',
    apply(player) { player._projSizeMult = Math.max(player._projSizeMult, 8); player._giantsKnockback = 350; },
  },

  cataclysm_clock: {
    id: 'cataclysm_clock',
    name: 'Cataclysm Clock',
    icon: '💥',
    desc: 'Massive explosion every 18s devastates all nearby enemies.',
    apply(player) { player._nukeInterval = 18; player._nukeRadius = 340; },
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
    desc: 'Enemies explode on death, dealing 60% damage in 100px area.',
    apply(player) { player._chainDeathPct = 0.6; player._chainDeathRadius = 100; },
  },

  soul_vampire: {
    id: 'soul_vampire',
    name: 'Soul Vampire',
    icon: '🧛',
    desc: 'Each kill restores 8% of your max HP.',
    apply(player) { player._killHealPct = 0.08; },
  },

  time_warp: {
    id: 'time_warp',
    name: 'Time Warp',
    icon: '⏰',
    desc: '-60% all weapon cooldowns.',
    apply(player) { player.cooldownReduction = Math.max(player.cooldownReduction, 0.60); },
  },

  iron_fortress: {
    id: 'iron_fortress',
    name: 'Iron Fortress',
    icon: '🛡️',
    desc: '+40 Armor. Become invincible for 3s when below 25% HP.',
    apply(player) { player.armor += 40; player._fortressShieldDur = 3; },
  },

  void_prism: {
    id: 'void_prism',
    name: 'Void Prism',
    icon: '💎',
    desc: 'Every shot also fires at a second enemy.',
    apply(player) { player._voidPrismChance = 1.0; },
  },

  // ---- NEW RELICS ----

  blood_pact: {
    id: 'blood_pact',
    name: 'Blood Pact',
    icon: '🩸',
    desc: '+80 Max HP and +4 HP/s regeneration.',
    apply(player) { player.maxHp += 80; player.hp = Math.min(player.hp + 80, player.maxHp); player._hpRegen += 4; },
  },

  phantom_strike: {
    id: 'phantom_strike',
    name: 'Phantom Strike',
    icon: '👻',
    desc: '30% chance any shot fires a phantom bolt dealing 3× damage.',
    apply(player) { player._phantomStrikeChance = 0.30; },
  },

  echo_chamber: {
    id: 'echo_chamber',
    name: 'Echo Chamber',
    icon: '🔔',
    desc: 'Every 6th shot fires 4 bonus projectiles in all directions.',
    apply(player) { player._echoInterval = 6; },
  },

  arcane_ward: {
    id: 'arcane_ward',
    name: 'Arcane Ward',
    icon: '🔵',
    desc: 'A magical barrier blocks 1 hit every 8 seconds.',
    apply(player) { player._wardDuration = 8; },
  },

  reapers_scythe: {
    id: 'reapers_scythe',
    name: "Reaper's Scythe",
    icon: '💀',
    desc: 'Projectiles instantly execute enemies below 20% HP.',
    apply(player) { player._reaperThreshold = 0.20; },
  },

  cursed_mirror: {
    id: 'cursed_mirror',
    name: 'Cursed Mirror',
    icon: '🪞',
    desc: 'When you take damage, reflect it to all enemies within 300px.',
    apply(player) { player._cursedMirror = true; },
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
