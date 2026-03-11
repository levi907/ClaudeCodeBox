/**
 * Archetype classification engine for MTG cube cards.
 *
 * Each archetype has a `detect(card)` function that returns true if the card
 * meaningfully supports that archetype. A card can match multiple archetypes.
 *
 * Card fields used (from Scryfall / CubeCobra JSON):
 *   color_identity: string[]  e.g. ["W", "U"]
 *   colors: string[]
 *   type_line: string         e.g. "Creature — Human Wizard"
 *   oracle_text: string
 *   keywords: string[]
 *   cmc / mana_value: number
 *   power / toughness: string
 *   name: string
 */

function colors(card) {
  return card.color_identity || card.colors || []
}

function oracle(card) {
  // Handle double-faced cards
  if (card.card_faces) {
    return card.card_faces.map((f) => f.oracle_text || '').join('\n').toLowerCase()
  }
  return (card.oracle_text || '').toLowerCase()
}

function types(card) {
  return (card.type_line || '').toLowerCase()
}

function kws(card) {
  return (card.keywords || []).map((k) => k.toLowerCase())
}

function cmc(card) {
  return card.cmc ?? card.mana_value ?? 0
}

function hasColor(card, ...colorList) {
  const ci = colors(card)
  return colorList.some((c) => ci.includes(c))
}

function onlyColors(card, ...colorList) {
  const ci = colors(card)
  return ci.every((c) => colorList.includes(c)) && ci.length > 0
}

// ─── Archetype Definitions ────────────────────────────────────────────────────

export const ARCHETYPES = [
  // ── Mono-color ──────────────────────────────────────────────────────────────
  {
    id: 'white-aggro',
    name: 'White Aggro',
    displayColor: '#f5e642',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-900',
    detect(card) {
      if (!hasColor(card, 'W')) return false
      const o = oracle(card)
      const t = types(card)
      const k = kws(card)
      const isSmallCreature = t.includes('creature') && cmc(card) <= 3
      const aggroKws = k.some((kw) =>
        ['haste', 'first strike', 'double strike', 'prowess', 'exalted'].includes(kw)
      )
      const makesTokens = o.includes('create') && o.includes('token') && cmc(card) <= 3
      const pumpsTeam = o.includes('creatures you control get +')
      const isWeenie =
        t.includes('creature') &&
        cmc(card) <= 2 &&
        onlyColors(card, 'W', 'R', 'G') // mono or weenie-friendly pairs
      return isSmallCreature || aggroKws || makesTokens || pumpsTeam || isWeenie
    },
  },

  {
    id: 'blue-tempo',
    name: 'Blue Tempo',
    displayColor: '#4a90d9',
    bgClass: 'bg-blue-200',
    textClass: 'text-blue-900',
    detect(card) {
      if (!hasColor(card, 'U')) return false
      const o = oracle(card)
      const t = types(card)
      const k = kws(card)
      const isCantrip = o.includes('draw a card') && (t.includes('instant') || t.includes('sorcery')) && cmc(card) <= 2
      const isFlash = k.includes('flash') && t.includes('creature')
      const bounces = o.includes('return target') && (o.includes('to its owner') || o.includes("to their owner"))
      const isEfficientThreat = t.includes('creature') && cmc(card) <= 3 && hasColor(card, 'U')
      const isPhasing = k.includes('phasing') || o.includes('phase out')
      return isCantrip || isFlash || bounces || isEfficientThreat || isPhasing
    },
  },

  {
    id: 'blue-combo',
    name: 'Blue Combo',
    displayColor: '#1a5fa8',
    bgClass: 'bg-blue-800',
    textClass: 'text-blue-100',
    detect(card) {
      if (!hasColor(card, 'U')) return false
      const o = oracle(card)
      const t = types(card)
      const name = (card.name || '').toLowerCase()
      const winCondition = o.includes('you win the game') || o.includes('wins the game')
      const stormPiece =
        o.includes('storm') ||
        o.includes('untap all') ||
        o.includes('copy of that spell') ||
        o.includes('copies of that spell')
      const drawEngine =
        o.includes('draw') && o.includes('card') && (o.includes('whenever') || o.includes('each upkeep'))
      const infinitePiece =
        name.includes("thassa's oracle") ||
        name.includes('laboratory maniac') ||
        name.includes('labman') ||
        name.includes('jace, wielder of mysteries') ||
        name.includes('gush') ||
        name.includes('frantic search') ||
        name.includes('high tide') ||
        name.includes('candelabra') ||
        name.includes('palinchron') ||
        name.includes('time spiral') ||
        name.includes('windfall') ||
        name.includes('timetwister')
      const tutorsLibrary =
        (o.includes('search your library') && !o.includes('land')) && t.includes('instant') ||
        o.includes('transmute')
      return winCondition || stormPiece || infinitePiece || tutorsLibrary || drawEngine
    },
  },

  {
    id: 'black-midrange',
    name: 'Black Midrange',
    displayColor: '#8b5cf6',
    bgClass: 'bg-purple-900',
    textClass: 'text-purple-100',
    detect(card) {
      if (!hasColor(card, 'B')) return false
      const o = oracle(card)
      const t = types(card)
      const isValueCreature = t.includes('creature') && cmc(card) >= 2 && cmc(card) <= 5
      const isRemoval =
        (o.includes('destroy target') || o.includes('exile target')) &&
        (o.includes('creature') || o.includes('permanent'))
      const isDiscard = o.includes('discard') && (o.includes('target player') || o.includes('each opponent'))
      const isEdict = o.includes('sacrifice a creature')
      return isValueCreature || isRemoval || isDiscard || isEdict
    },
  },

  {
    id: 'black-reanimator',
    name: 'Black Reanimator',
    displayColor: '#4c1d95',
    bgClass: 'bg-purple-950',
    textClass: 'text-purple-200',
    detect(card) {
      if (!hasColor(card, 'B')) return false
      const o = oracle(card)
      const t = types(card)
      const isReanimationSpell =
        o.includes('return target creature card') ||
        o.includes('return target permanent card') ||
        (o.includes('from') && o.includes('graveyard') && o.includes('to the battlefield'))
      const isGraveyardEnabler =
        (o.includes('discard') && t.includes('instant')) ||
        (o.includes('discard') && t.includes('sorcery')) ||
        o.includes('dredge') ||
        o.includes('entomb') ||
        o.includes('reanimate') ||
        (card.name || '').toLowerCase().includes('entomb') ||
        (card.name || '').toLowerCase().includes('reanimate') ||
        (card.name || '').toLowerCase().includes('buried alive') ||
        (card.name || '').toLowerCase().includes('animate dead') ||
        (card.name || '').toLowerCase().includes('necromancy') ||
        (card.name || '').toLowerCase().includes('exhume')
      const isFatty =
        t.includes('creature') &&
        cmc(card) >= 6 &&
        !o.includes('flying') === false // big creatures are reanimation targets
      return isReanimationSpell || isGraveyardEnabler
    },
  },

  {
    id: 'red-aggro',
    name: 'Red Aggro',
    displayColor: '#ef4444',
    bgClass: 'bg-red-900',
    textClass: 'text-red-100',
    detect(card) {
      if (!hasColor(card, 'R')) return false
      const o = oracle(card)
      const t = types(card)
      const k = kws(card)
      const isBurn = (t.includes('instant') || t.includes('sorcery')) &&
        (o.includes('deals') && o.includes('damage'))
      const isHasteCreature = t.includes('creature') && k.includes('haste')
      const isSmallRed = t.includes('creature') && cmc(card) <= 2 && onlyColors(card, 'R', 'W', 'G')
      const isLooting = o.includes('draw') && o.includes('discard') && cmc(card) <= 2
      return isBurn || isHasteCreature || isSmallRed || isLooting
    },
  },

  {
    id: 'red-storm',
    name: 'Red Storm',
    displayColor: '#dc2626',
    bgClass: 'bg-red-950',
    textClass: 'text-red-200',
    detect(card) {
      if (!hasColor(card, 'R')) return false
      const o = oracle(card)
      const t = types(card)
      const name = (card.name || '').toLowerCase()
      const isRitual = (t.includes('instant') || t.includes('sorcery')) &&
        o.includes('add') && o.includes('{r')
      const isStorm = o.includes('storm') || kws(card).includes('storm')
      const isStormpayoff =
        name.includes('grapeshot') ||
        name.includes('empty the warrens') ||
        name.includes('brain freeze') ||
        name.includes('tendrils of agony') ||
        name.includes('mind\'s desire')
      const isDraw =
        (o.includes('draw') && o.includes('card') && cmc(card) <= 2 && t.includes('instant'))
      const isFreeSpell =
        o.includes('you may cast') && (o.includes('without paying') || o.includes('for free'))
      return isRitual || isStorm || isStormpayoff || isDraw || isFreeSpell
    },
  },

  {
    id: 'green-ramp',
    name: 'Green Ramp',
    displayColor: '#22c55e',
    bgClass: 'bg-green-900',
    textClass: 'text-green-100',
    detect(card) {
      if (!hasColor(card, 'G')) return false
      const o = oracle(card)
      const t = types(card)
      const k = kws(card)
      const fetchesLand =
        o.includes('search your library') && o.includes('land') && t.includes('sorcery')
      const manaCreature = t.includes('creature') && o.includes('add {') && cmc(card) <= 3
      const manaArtifact = t.includes('artifact') && o.includes('add {') && cmc(card) <= 3
      const manaEnchantment = t.includes('enchantment') && o.includes('add {')
      return fetchesLand || manaCreature || manaArtifact || manaEnchantment
    },
  },

  {
    id: 'green-stompy',
    name: 'Green Stompy',
    displayColor: '#16a34a',
    bgClass: 'bg-green-800',
    textClass: 'text-green-100',
    detect(card) {
      if (!hasColor(card, 'G')) return false
      const o = oracle(card)
      const t = types(card)
      const k = kws(card)
      const isBigCreature = t.includes('creature') && cmc(card) >= 4
      const hasTramplingPower =
        k.includes('trample') && t.includes('creature') && cmc(card) >= 3
      const isPowerMatters = o.includes('power') && t.includes('creature')
      const isCountersMatter = o.includes('+1/+1 counter') && t.includes('creature')
      return isBigCreature || hasTramplingPower || isPowerMatters || isCountersMatter
    },
  },

  // ── Color Pairs ─────────────────────────────────────────────────────────────
  {
    id: 'azorius-blink',
    name: 'Azorius Blink (WU)',
    displayColor: '#93c5fd',
    bgClass: 'bg-sky-200',
    textClass: 'text-sky-900',
    detect(card) {
      if (!hasColor(card, 'W') && !hasColor(card, 'U')) return false
      const o = oracle(card)
      const t = types(card)
      const isFlicker =
        o.includes('exile') && o.includes('return') && (o.includes('end of turn') || o.includes('beginning'))
      const isCounterspell = o.includes('counter target') && o.includes('spell')
      const isProphecy = t.includes('creature') && (hasColor(card, 'W') || hasColor(card, 'U')) &&
        (o.includes('when') && o.includes('enters'))
      return isFlicker || (isCounterspell && hasColor(card, 'U')) || isProphecy
    },
  },

  {
    id: 'dimir-control',
    name: 'Dimir Control (UB)',
    displayColor: '#6366f1',
    bgClass: 'bg-indigo-900',
    textClass: 'text-indigo-100',
    detect(card) {
      if (!hasColor(card, 'U') && !hasColor(card, 'B')) return false
      if (hasColor(card, 'W') || hasColor(card, 'R') || hasColor(card, 'G')) return false
      const o = oracle(card)
      const t = types(card)
      const isCounterspell = o.includes('counter target') && o.includes('spell')
      const isRemoval = o.includes('destroy target') || o.includes('exile target')
      const isCardDraw = o.includes('draw') && o.includes('card') && cmc(card) >= 3
      const isDiscard = o.includes('discard')
      return isCounterspell || isRemoval || isCardDraw || isDiscard
    },
  },

  {
    id: 'izzet-spells',
    name: 'Izzet Spells (UR)',
    displayColor: '#f97316',
    bgClass: 'bg-orange-900',
    textClass: 'text-orange-100',
    detect(card) {
      if (!hasColor(card, 'U') && !hasColor(card, 'R')) return false
      if (hasColor(card, 'W') || hasColor(card, 'B') || hasColor(card, 'G')) return false
      const o = oracle(card)
      const t = types(card)
      const k = kws(card)
      const isProwess = k.includes('prowess')
      const isSpellsMatter =
        o.includes('whenever you cast') && (o.includes('instant') || o.includes('sorcery'))
      const isCopySpell =
        o.includes('copy') && (o.includes('instant') || o.includes('sorcery'))
      const isInstantSorcery = t.includes('instant') || t.includes('sorcery')
      return isProwess || isSpellsMatter || isCopySpell || isInstantSorcery
    },
  },

  {
    id: 'rakdos-sac',
    name: 'Rakdos Sacrifice (BR)',
    displayColor: '#b91c1c',
    bgClass: 'bg-red-900',
    textClass: 'text-rose-100',
    detect(card) {
      if (!hasColor(card, 'B') && !hasColor(card, 'R')) return false
      if (hasColor(card, 'W') || hasColor(card, 'U') || hasColor(card, 'G')) return false
      const o = oracle(card)
      const t = types(card)
      const isSacOutlet = o.includes('sacrifice') && (o.includes('as a cost') || o.includes('pay') || o.includes(', sacrifice'))
      const isDrain = o.includes('lose') && o.includes('life') && o.includes('gain') && o.includes('life')
      const isAristocrat =
        o.includes('whenever') && o.includes('creature') && (o.includes('dies') || o.includes('sacrifice'))
      return isSacOutlet || isDrain || isAristocrat
    },
  },

  {
    id: 'gruul-midrange',
    name: 'Gruul Midrange (RG)',
    displayColor: '#84cc16',
    bgClass: 'bg-lime-900',
    textClass: 'text-lime-100',
    detect(card) {
      if (!hasColor(card, 'R') && !hasColor(card, 'G')) return false
      if (hasColor(card, 'W') || hasColor(card, 'U') || hasColor(card, 'B')) return false
      const o = oracle(card)
      const t = types(card)
      const k = kws(card)
      const isBigHasteCreature = t.includes('creature') && k.includes('haste') && cmc(card) >= 3
      const isLandFetch = o.includes('search your library') && o.includes('land')
      const isLandfall = o.includes('landfall')
      const isBigCreature = t.includes('creature') && cmc(card) >= 4
      return isBigHasteCreature || isLandFetch || isLandfall || isBigCreature
    },
  },

  {
    id: 'orzhov-drain',
    name: 'Orzhov Drain (WB)',
    displayColor: '#a78bfa',
    bgClass: 'bg-violet-900',
    textClass: 'text-violet-100',
    detect(card) {
      if (!hasColor(card, 'W') && !hasColor(card, 'B')) return false
      if (hasColor(card, 'U') || hasColor(card, 'R') || hasColor(card, 'G')) return false
      const o = oracle(card)
      const k = kws(card)
      const isDrain = o.includes('lose') && o.includes('life')
      const isLifegain = k.includes('lifelink') || (o.includes('gain') && o.includes('life'))
      const isLifegainPayoff =
        o.includes('whenever you gain life') || o.includes('each time you gain life')
      return isDrain || isLifegain || isLifegainPayoff
    },
  },

  {
    id: 'selesnya-tokens',
    name: 'Selesnya Tokens (WG)',
    displayColor: '#bbf7d0',
    bgClass: 'bg-emerald-800',
    textClass: 'text-emerald-100',
    detect(card) {
      if (!hasColor(card, 'W') && !hasColor(card, 'G')) return false
      if (hasColor(card, 'U') || hasColor(card, 'R') || hasColor(card, 'B')) return false
      const o = oracle(card)
      const makesTokens = o.includes('create') && o.includes('token')
      const pumpsTokens =
        o.includes('creatures you control') && (o.includes('get +') || o.includes('have '))
      const isCounters = o.includes('+1/+1 counter')
      return makesTokens || pumpsTokens || isCounters
    },
  },

  {
    id: 'boros-aggro',
    name: 'Boros Aggro (WR)',
    displayColor: '#fbbf24',
    bgClass: 'bg-amber-800',
    textClass: 'text-amber-100',
    detect(card) {
      if (!hasColor(card, 'W') && !hasColor(card, 'R')) return false
      if (hasColor(card, 'U') || hasColor(card, 'B') || hasColor(card, 'G')) return false
      const o = oracle(card)
      const t = types(card)
      const k = kws(card)
      const isAggressive = t.includes('creature') && cmc(card) <= 3
      const hasCombatKeywords = k.some((kw) =>
        ['double strike', 'first strike', 'haste', 'vigilance', 'exalted'].includes(kw)
      )
      const isEquipment = t.includes('equipment')
      return isAggressive || hasCombatKeywords || isEquipment
    },
  },

  {
    id: 'simic-combo',
    name: 'Simic Combo (UG)',
    displayColor: '#34d399',
    bgClass: 'bg-teal-800',
    textClass: 'text-teal-100',
    detect(card) {
      if (!hasColor(card, 'U') && !hasColor(card, 'G')) return false
      if (hasColor(card, 'W') || hasColor(card, 'R') || hasColor(card, 'B')) return false
      const o = oracle(card)
      const t = types(card)
      const isRampCombo = o.includes('untap') && (t.includes('creature') || t.includes('land'))
      const isCardEngine =
        o.includes('draw') && o.includes('card') && (o.includes('whenever') || t.includes('creature'))
      const isInfiniteSetup =
        o.includes('untap all') ||
        (o.includes('add') && o.includes('{') && t.includes('creature'))
      return isRampCombo || isCardEngine || isInfiniteSetup
    },
  },

  {
    id: 'golgari-grave',
    name: 'Golgari Graveyard (BG)',
    displayColor: '#4ade80',
    bgClass: 'bg-green-950',
    textClass: 'text-green-200',
    detect(card) {
      if (!hasColor(card, 'B') && !hasColor(card, 'G')) return false
      if (hasColor(card, 'W') || hasColor(card, 'U') || hasColor(card, 'R')) return false
      const o = oracle(card)
      const k = kws(card)
      const isDredge = k.includes('dredge') || o.includes('dredge')
      const isGraveReturn =
        o.includes('return') && o.includes('graveyard') && (o.includes('to your hand') || o.includes('to the battlefield'))
      const isSelfMill = o.includes('mill') || (o.includes('put the top') && o.includes('into your graveyard'))
      const isMorbid = o.includes('morbid') || o.includes('delirium') || o.includes('threshold')
      return isDredge || isGraveReturn || isSelfMill || isMorbid
    },
  },
]

/**
 * Classify a card and return the list of matching archetype IDs.
 */
export function classifyCard(card) {
  return ARCHETYPES.filter((a) => {
    try {
      return a.detect(card)
    } catch {
      return false
    }
  }).map((a) => a.id)
}

/**
 * Given added and removed card arrays (each with Scryfall fields),
 * returns a map: archetypeId → { archetype, added: Card[], removed: Card[] }
 * Only includes archetypes with at least one card.
 */
export function buildArchetypeImpact(addedCards, removedCards) {
  const impact = {}

  for (const archetype of ARCHETYPES) {
    const added = addedCards.filter((c) => {
      try { return archetype.detect(c) } catch { return false }
    })
    const removed = removedCards.filter((c) => {
      try { return archetype.detect(c) } catch { return false }
    })
    if (added.length > 0 || removed.length > 0) {
      impact[archetype.id] = { archetype, added, removed }
    }
  }

  return impact
}
