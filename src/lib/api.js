/**
 * Fetch a cube's card list from the backend proxy.
 * Returns an array of card objects with Scryfall fields.
 */
export async function fetchCube(cubeId) {
  const res = await fetch(`/api/cube/${encodeURIComponent(cubeId)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Failed to fetch cube "${cubeId}" (HTTP ${res.status})`)
  }
  const data = await res.json()

  // CubeCobra JSON structure varies — handle known formats:
  // 1. { cards: [...] }  — standard JSON download
  // 2. { raw: "card\ncard\n..." } — plain text fallback (name only, no Scryfall data)
  if (Array.isArray(data.cards)) {
    return data.cards
  }
  if (Array.isArray(data)) {
    return data
  }
  if (data.raw) {
    // Plain text: one card name per line — need Scryfall lookup
    const names = data.raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    return names.map((name) => ({ name }))
  }
  throw new Error(`Unexpected CubeCobra response format for cube "${cubeId}"`)
}

/**
 * Batch-fetch Scryfall card data for cards that are missing classification fields.
 * Returns a map of name (lowercase) → Scryfall card object.
 */
export async function fetchScryfallBatch(cardNames) {
  if (cardNames.length === 0) return {}

  const identifiers = cardNames.map((name) => ({ name }))
  const res = await fetch('/api/scryfall/collection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifiers }),
  })
  if (!res.ok) throw new Error('Scryfall collection fetch failed')
  const data = await res.json()

  const map = {}
  for (const card of data.data || []) {
    map[card.name.toLowerCase()] = card
  }
  return map
}

/**
 * Parse a CubeCobra compare URL and return { newId, oldId }.
 * Supports:
 *   https://cubecobra.com/cube/compare/{newId}/to/{oldId}
 */
export function parseCompareUrl(url) {
  try {
    const u = new URL(url)
    const match = u.pathname.match(/\/cube\/compare\/([^/]+)\/to\/([^/]+)/)
    if (!match) throw new Error('not a compare URL')
    return { newId: match[1], oldId: match[2] }
  } catch {
    throw new Error(
      'Invalid URL. Expected format: https://cubecobra.com/cube/compare/{newId}/to/{oldId}'
    )
  }
}

/**
 * Compute the diff between two card lists.
 * Cards are matched by name (case-insensitive).
 * Returns { added: Card[], removed: Card[] }
 */
export function computeDiff(newCards, oldCards) {
  const oldNames = new Set(oldCards.map((c) => (c.name || '').toLowerCase()))
  const newNames = new Set(newCards.map((c) => (c.name || '').toLowerCase()))

  const added = newCards.filter((c) => !oldNames.has((c.name || '').toLowerCase()))
  const removed = oldCards.filter((c) => !newNames.has((c.name || '').toLowerCase()))

  return { added, removed }
}

/**
 * Enrich cards that lack Scryfall classification fields (colors, type_line, etc.)
 * by fetching them from Scryfall.
 */
export async function enrichCards(cards) {
  const needsEnrichment = cards.filter(
    (c) => !c.color_identity && !c.colors && !c.type_line
  )
  if (needsEnrichment.length === 0) return cards

  const names = [...new Set(needsEnrichment.map((c) => c.name).filter(Boolean))]
  const scryfallMap = await fetchScryfallBatch(names)

  return cards.map((card) => {
    if (card.color_identity || card.colors || card.type_line) return card
    const enriched = scryfallMap[(card.name || '').toLowerCase()]
    return enriched ? { ...enriched, ...card, ...enriched } : card
  })
}
