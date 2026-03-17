// ============================================================
//  SPELL SURVIVORS - Relics System
//  16 powerful game-changing relics (no levels, full strength on pickup)
// ============================================================

const RELIC_DEFS = {

  forbidden_codex: {
    id: 'forbidden_codex',
    name: 'Forbidden Codex',
    icon: '📖',
    desc: 'Choose from 6 gems every level-up. Superior selections grant +100% bonus damage.',
    apply(player) { player._extraChoices += 3; player.damageMultiplier += 1.0; player._relicPierceBonus += 3; },
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
    desc: 'Your projectiles are 8× larger, knock enemies back, and pierce 2 additional targets.',
    apply(player) { player._projSizeMult = Math.max(player._projSizeMult, 8); player._giantsKnockback = 350; player._omniShot += 2; },
  },

  cataclysm_clock: {
    id: 'cataclysm_clock',
    name: 'Cataclysm Clock',
    icon: '💥',
    desc: 'Massive explosion every 12s devastates all enemies within 400px.',
    apply(player) { player._nukeInterval = 12; player._nukeRadius = 400; },
  },

  berserker_rage: {
    id: 'berserker_rage',
    name: 'Berserker Rage',
    icon: '😈',
    desc: 'Always deal 2× damage, scaling to 8× when critically injured.',
    apply(player) { player._berserkerMaxMult = 3.0; player.damageMultiplier *= 2.0; player._relicPierceBonus += 3; },
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
    desc: 'Each kill restores 8% max HP. Drain 12 life/s from all nearby enemies.',
    apply(player) { player._killHealPct = 0.08; player._soulDrain = 80; },
  },

  time_warp: {
    id: 'time_warp',
    name: 'Time Warp',
    icon: '⏰',
    desc: '-60% all weapon cooldowns.',
    apply(player) { player.cooldownReduction = Math.max(player.cooldownReduction, 0.60); player._relicPierceBonus += 3; },
  },

  iron_fortress: {
    id: 'iron_fortress',
    name: 'Iron Fortress',
    icon: '🛡️',
    desc: '+40 Armor, +20 Thorns. Become invincible for 3s when below 25% HP.',
    apply(player) { player.armor += 40; player._fortressShieldDur = 3; player._thorns += 20; },
  },

  void_prism: {
    id: 'void_prism',
    name: 'Void Prism',
    icon: '💎',
    desc: 'Every shot also fires at a second enemy.',
    apply(player) { player._voidPrismChance = 1.0; player._relicPierceBonus += 3; },
  },

  // ---- NEW RELICS ----

  blood_pact: {
    id: 'blood_pact',
    name: 'Blood Pact',
    icon: '🩸',
    desc: '+80 Max HP, +4 HP/s regen. Your shots inflict bleed and deal +80% bonus damage.',
    apply(player) { player.maxHp += 80; player.hp = Math.min(player.hp + 80, player.maxHp); player._hpRegen += 4; player._bloodPactBleed = true; player.damageMultiplier += 0.8; player._relicPierceBonus += 3; },
  },

  phantom_strike: {
    id: 'phantom_strike',
    name: 'Phantom Strike',
    icon: '👻',
    desc: '30% chance any shot fires a phantom bolt dealing 3× damage.',
    apply(player) { player._phantomStrikeChance = 0.30; player._relicPierceBonus += 4; },
  },

  echo_chamber: {
    id: 'echo_chamber',
    name: 'Echo Chamber',
    icon: '🔔',
    desc: 'Every 4th shot fires 6 bonus projectiles in all directions.',
    apply(player) { player._echoInterval = 4; },
  },

  arcane_ward: {
    id: 'arcane_ward',
    name: 'Arcane Ward',
    icon: '🔵',
    desc: 'A magical barrier blocks 1 hit every 8s. When recharged, discharges lightning at 4 nearby enemies.',
    apply(player) { player._wardDuration = 8; player._wardZap = true; },
  },

  reapers_scythe: {
    id: 'reapers_scythe',
    name: "Reaper's Scythe",
    icon: '💀',
    desc: 'Execute enemies below 25% HP. Death energy charges all shots for +60% bonus damage.',
    apply(player) { player._reaperThreshold = 0.25; player.damageMultiplier += 0.6; player._relicPierceBonus += 3; },
  },

  cursed_mirror: {
    id: 'cursed_mirror',
    name: 'Cursed Mirror',
    icon: '🪞',
    desc: 'Reflect damage to all enemies within 300px. Also pulses arcane energy every 6s.',
    apply(player) { player._cursedMirror = true; player._mirrorPulse = true; },
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
