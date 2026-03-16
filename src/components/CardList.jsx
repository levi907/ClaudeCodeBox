const COLOR_PIP = {
  W: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-900', label: 'W' },
  U: { bg: 'bg-blue-500', border: 'border-blue-300', text: 'text-white', label: 'U' },
  B: { bg: 'bg-gray-800', border: 'border-gray-500', text: 'text-gray-100', label: 'B' },
  R: { bg: 'bg-red-500', border: 'border-red-300', text: 'text-white', label: 'R' },
  G: { bg: 'bg-green-600', border: 'border-green-300', text: 'text-white', label: 'G' },
}

function ColorPips({ card }) {
  const ci = card.color_identity || card.colors || []
  if (ci.length === 0) return <span className="text-gray-500 text-xs">◆</span>
  return (
    <span className="flex gap-0.5">
      {ci.map((c) => {
        const pip = COLOR_PIP[c]
        if (!pip) return null
        return (
          <span
            key={c}
            className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold border ${pip.bg} ${pip.border} ${pip.text}`}
          >
            {pip.label}
          </span>
        )
      })}
    </span>
  )
}

function CardRow({ card, variant }) {
  const isAdded = variant === 'added'
  const scryfallUrl = `https://scryfall.com/search?q=%21%22${encodeURIComponent(card.name || '')}%22`
  return (
    <a
      href={scryfallUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm hover:bg-gray-700 transition-colors group ${
        isAdded ? 'text-green-300' : 'text-red-300 line-through'
      }`}
    >
      <span className={`text-xs ${isAdded ? 'text-green-500' : 'text-red-500'}`}>
        {isAdded ? '+' : '−'}
      </span>
      <ColorPips card={card} />
      <span className="flex-1 group-hover:underline">{card.name || 'Unknown'}</span>
      {card.type_line && (
        <span className="text-gray-500 text-xs hidden sm:inline truncate max-w-32">
          {card.type_line.replace(/—.*/, '').trim()}
        </span>
      )}
      {(card.cmc != null || card.mana_value != null) && (
        <span className="text-gray-600 text-xs tabular-nums w-4 text-right">
          {card.cmc ?? card.mana_value}
        </span>
      )}
    </a>
  )
}

export default function CardList({ added, removed }) {
  return (
    <div className="mt-2 border-t border-gray-700 pt-2 grid sm:grid-cols-2 gap-x-4">
      {added.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 px-3 mb-1">Added</p>
          {added
            .slice()
            .sort((a, b) => (a.cmc ?? a.mana_value ?? 0) - (b.cmc ?? b.mana_value ?? 0))
            .map((c) => (
              <CardRow key={c.name} card={c} variant="added" />
            ))}
        </div>
      )}
      {removed.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 px-3 mb-1">Removed</p>
          {removed
            .slice()
            .sort((a, b) => (a.cmc ?? a.mana_value ?? 0) - (b.cmc ?? b.mana_value ?? 0))
            .map((c) => (
              <CardRow key={c.name} card={c} variant="removed" />
            ))}
        </div>
      )}
    </div>
  )
}
