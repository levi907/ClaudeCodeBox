import { useState } from 'react'
import CardList from './CardList.jsx'

function NetBadge({ net }) {
  if (net === 0) return <span className="text-gray-500 text-sm font-mono w-10 text-right">±0</span>
  return (
    <span
      className={`text-sm font-mono font-semibold w-10 text-right ${
        net > 0 ? 'text-green-400' : 'text-red-400'
      }`}
    >
      {net > 0 ? '+' : ''}
      {net}
    </span>
  )
}

function Bar({ addedCount, removedCount, maxTotal }) {
  const BAR_MAX_PX = 240
  const total = addedCount + removedCount
  const addedWidth = maxTotal > 0 ? (addedCount / maxTotal) * BAR_MAX_PX : 0
  const removedWidth = maxTotal > 0 ? (removedCount / maxTotal) * BAR_MAX_PX : 0

  return (
    <div className="flex items-center gap-1" style={{ minWidth: `${BAR_MAX_PX}px` }}>
      {/* Removed bar grows leftward */}
      <div className="flex justify-end" style={{ width: `${BAR_MAX_PX / 2}px` }}>
        {removedCount > 0 && (
          <div
            className="h-6 bg-red-600 rounded-l flex items-center justify-end pr-1.5 transition-all"
            style={{ width: `${removedWidth}px` }}
            title={`${removedCount} removed`}
          >
            {removedCount > 0 && removedWidth > 20 && (
              <span className="text-xs text-red-100 font-semibold">{removedCount}</span>
            )}
          </div>
        )}
      </div>
      {/* Center divider */}
      <div className="w-px h-6 bg-gray-600" />
      {/* Added bar grows rightward */}
      <div className="flex justify-start" style={{ width: `${BAR_MAX_PX / 2}px` }}>
        {addedCount > 0 && (
          <div
            className="h-6 bg-green-600 rounded-r flex items-center justify-start pl-1.5 transition-all"
            style={{ width: `${addedWidth}px` }}
            title={`${addedCount} added`}
          >
            {addedCount > 0 && addedWidth > 20 && (
              <span className="text-xs text-green-100 font-semibold">{addedCount}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ArchetypeRow({ entry, maxTotal, rank }) {
  const [expanded, setExpanded] = useState(false)
  const { archetype, added, removed } = entry
  const net = added.length - removed.length
  const total = added.length + removed.length

  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left"
      >
        {/* Rank */}
        <span className="text-gray-600 text-xs w-5 text-right shrink-0">#{rank}</span>

        {/* Archetype name */}
        <span className="font-medium text-gray-100 w-44 shrink-0 truncate">{archetype.name}</span>

        {/* Bar chart */}
        <div className="flex-1 hidden sm:flex justify-center">
          <Bar addedCount={added.length} removedCount={removed.length} maxTotal={maxTotal} />
        </div>

        {/* Mobile counts */}
        <div className="flex sm:hidden gap-3 text-sm ml-auto">
          {removed.length > 0 && <span className="text-red-400">−{removed.length}</span>}
          {added.length > 0 && <span className="text-green-400">+{added.length}</span>}
        </div>

        {/* Net badge */}
        <div className="ml-auto sm:ml-2 shrink-0">
          <NetBadge net={net} />
        </div>

        {/* Total count */}
        <span className="text-gray-600 text-xs w-14 text-right shrink-0">
          {total} card{total !== 1 ? 's' : ''}
        </span>

        {/* Expand chevron */}
        <span
          className={`text-gray-500 text-xs shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 bg-gray-900">
          <CardList added={added} removed={removed} />
        </div>
      )}
    </div>
  )
}

export default function ArchetypeChart({ impact }) {
  const entries = Object.values(impact)

  // Sort by total cards impacted (most first), then by absolute net change
  entries.sort((a, b) => {
    const totalA = a.added.length + a.removed.length
    const totalB = b.added.length + b.removed.length
    if (totalB !== totalA) return totalB - totalA
    return Math.abs(b.added.length - b.removed.length) - Math.abs(a.added.length - a.removed.length)
  })

  const maxTotal = Math.max(...entries.map((e) => e.added.length + e.removed.length), 1)

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No archetype changes detected in this diff.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 px-4 pb-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-red-600 rounded-sm inline-block" /> Removed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-green-600 rounded-sm inline-block" /> Added
        </span>
        <span className="text-gray-600">Click a row to see card details</span>
      </div>

      {entries.map((entry, i) => (
        <ArchetypeRow
          key={entry.archetype.id}
          entry={entry}
          maxTotal={maxTotal}
          rank={i + 1}
        />
      ))}
    </div>
  )
}
