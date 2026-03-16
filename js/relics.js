// ============================================================
//  SPELL SURVIVORS - Relics System
//  10 relics that synergize with weapons and boost the player
// ============================================================

const RELIC_DEFS = {

  spellbook: {
    id: 'spellbook',
    name: 'Ancient Spellbook',
    icon: '📖',
    type: 'relic',
    desc: '+1 projectile to all weapons. Spells seek targets better.',
    synergy: ['magic_wand', 'fireball', 'frost_lance'],
    levels: [
      { desc: '+1 projectile to all spells', projectileBonus: 1 },
      { desc: '+2 projectiles, better seeking', projectileBonus: 2 },
      { desc: '+3 projectiles, auto-aim', projectileBonus: 3 },
    ],
    apply(player, level) {
      player.projectileCountBonus = this.levels[level - 1].projectileBonus;
    },
  },

  hollow_heart: {
    id: 'hollow_heart',
    name: 'Hollow Heart',
    icon: '💜',
    type: 'relic',
    desc: 'Increases max HP and restores some health.',
    levels: [
      { desc: '+25% Max HP', hpMult: 1.25 },
      { desc: '+50% Max HP, +20 HP on pickup', hpMult: 1.50 },
      { desc: '+80% Max HP, regenerate 1 HP/sec', hpMult: 1.80, regen: 1 },
    ],
    apply(player, level) {
      const def = this.levels[level - 1];
      const prevMax = player.maxHp;
      player.maxHp = Math.floor(player.baseHp * def.hpMult);
      player.hp = Math.min(player.maxHp, player.hp + (player.maxHp - prevMax));
      player._hpRegen = def.regen || 0;
    },
  },

  spinach: {
    id: 'spinach',
    name: 'Power Spinach',
    icon: '🌿',
    type: 'relic',
    desc: 'Permanently increases all damage dealt.',
    levels: [
      { desc: '+15% damage', damageMult: 1.15 },
      { desc: '+30% damage', damageMult: 1.30 },
      { desc: '+50% damage', damageMult: 1.50 },
    ],
    apply(player, level) {
      player.damageMultiplier = this.levels[level - 1].damageMult;
    },
  },

  wings: {
    id: 'wings',
    name: 'Spectral Wings',
    icon: '🦋',
    type: 'relic',
    desc: 'Move faster. Higher speed also improves dodge chance.',
    levels: [
      { desc: '+20% move speed', speedMult: 1.20 },
      { desc: '+35% move speed', speedMult: 1.35 },
      { desc: '+55% move speed, ghostly dash', speedMult: 1.55 },
    ],
    apply(player, level) {
      player.speedMultiplier = this.levels[level - 1].speedMult;
    },
  },

  magnet: {
    id: 'magnet',
    name: 'Soul Magnet',
    icon: '🧲',
    type: 'relic',
    desc: 'Attracts XP orbs from much greater distance.',
    levels: [
      { desc: '+80px XP range', xpBonus: 80 },
      { desc: '+160px XP range, +20% XP', xpBonus: 160, xpMult: 1.2 },
      { desc: '+250px XP range, +50% XP', xpBonus: 250, xpMult: 1.5 },
    ],
    apply(player, level) {
      const def = this.levels[level - 1];
      player.xpRangeBonus = def.xpBonus;
      player._xpMultiplier = def.xpMult || 1.0;
    },
  },

  clover: {
    id: 'clover',
    name: 'Lucky Clover',
    icon: '🍀',
    type: 'relic',
    desc: 'Improves critical hit chance. Crits deal double damage.',
    levels: [
      { desc: '+10% crit chance', critChance: 0.10 },
      { desc: '+20% crit chance', critChance: 0.20 },
      { desc: '+35% crit chance, crits stun', critChance: 0.35, critStun: 0.3 },
    ],
    apply(player, level) {
      const def = this.levels[level - 1];
      player.critChance = def.critChance;
      player._critStun = def.critStun || 0;
    },
  },

  empty_tome: {
    id: 'empty_tome',
    name: 'Empty Tome',
    icon: '📜',
    type: 'relic',
    desc: 'Reduces all weapon cooldowns significantly.',
    synergy: ['magic_wand', 'lightning', 'fireball'],
    levels: [
      { desc: '-15% cooldowns', cdr: 0.15 },
      { desc: '-25% cooldowns', cdr: 0.25 },
      { desc: '-40% cooldowns', cdr: 0.40 },
    ],
    apply(player, level) {
      player.cooldownReduction = this.levels[level - 1].cdr;
    },
  },

  armor_plate: {
    id: 'armor_plate',
    name: 'Iron Rune Plate',
    icon: '🛡️',
    type: 'relic',
    desc: 'Reduces damage taken from all sources.',
    levels: [
      { desc: '+2 Armor (reduces dmg)', armor: 2 },
      { desc: '+4 Armor', armor: 4 },
      { desc: '+7 Armor, thorns on hit', armor: 7, thorns: 5 },
    ],
    apply(player, level) {
      const def = this.levels[level - 1];
      player.armor = def.armor;
      player._thorns = def.thorns || 0;
    },
  },

  vampire_fang: {
    id: 'vampire_fang',
    name: 'Vampire Fang',
    icon: '🦷',
    type: 'relic',
    desc: 'Restore HP when dealing damage. Higher damage = more healing.',
    synergy: ['garlic', 'death_spiral', 'void_orbs'],
    levels: [
      { desc: '+10% lifesteal', lifesteal: 0.10 },
      { desc: '+20% lifesteal', lifesteal: 0.20 },
      { desc: '+35% lifesteal', lifesteal: 0.35 },
    ],
    apply(player, level) {
      player.lifesteal = this.levels[level - 1].lifesteal;
    },
  },

  duplicator: {
    id: 'duplicator',
    name: 'Void Duplicator',
    icon: '👁️',
    type: 'relic',
    desc: 'Weapons fire in an additional direction.',
    synergy: ['void_orbs', 'death_spiral'],
    levels: [
      { desc: 'Mirror shot: weapons fire backward too', mirror: true },
      { desc: 'Also fires sideways (4 directions)', four_way: true },
      { desc: 'Fires in 6 directions total', six_way: true },
    ],
    _mirrorDir: 0,
    apply(player, level) {
      player._duplicatorLevel = level;
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
