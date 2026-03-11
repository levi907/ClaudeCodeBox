import { useState } from 'react'
import { parseCompareUrl, fetchCube, computeDiff, enrichCards } from './lib/api.js'
import { buildArchetypeImpact } from './lib/archetypes.js'
import ArchetypeChart from './components/ArchetypeChart.jsx'
import DiffSummary from './components/DiffSummary.jsx'

const EXAMPLE_URL = 'https://cubecobra.com/cube/compare/v540-202406/to/v540-202405'

function LoadingStep({ label, done }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${done ? 'text-gray-500' : 'text-gray-200'}`}>
      {done ? (
        <span className="text-green-400">✓</span>
      ) : (
        <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      )}
      {label}
    </div>
  )
}

export default function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState([])
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  function addStep(label) {
    setSteps((s) => [...s, { label, done: false }])
  }
  function completeStep() {
    setSteps((s) => s.map((st, i) => (i === s.length - 1 ? { ...st, done: true } : st)))
  }

  async function analyze(inputUrl) {
    setLoading(true)
    setError(null)
    setResult(null)
    setSteps([])

    try {
      // 1. Parse URL
      const { newId, oldId } = parseCompareUrl(inputUrl.trim())

      // 2. Fetch both cubes
      addStep(`Fetching cube "${newId}"…`)
      const [newCube, oldCube] = await Promise.all([fetchCube(newId), fetchCube(oldId)])
      completeStep()

      addStep(`Fetching cube "${oldId}"…`)
      completeStep()

      // 3. Compute diff
      addStep('Computing diff…')
      const { added, removed } = computeDiff(newCube, oldCube)
      completeStep()

      // 4. Enrich cards with Scryfall data if needed
      addStep('Enriching card data…')
      const [enrichedAdded, enrichedRemoved] = await Promise.all([
        enrichCards(added),
        enrichCards(removed),
      ])
      completeStep()

      // 5. Classify archetypes
      addStep('Classifying archetypes…')
      const impact = buildArchetypeImpact(enrichedAdded, enrichedRemoved)
      completeStep()

      setResult({ newId, oldId, added: enrichedAdded, removed: enrichedRemoved, impact })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (url.trim()) analyze(url)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Cube Archetype Balance Visualizer</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Paste a CubeCobra diff URL to see how the changes shift archetype balance.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={EXAMPLE_URL}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Analyze
        </button>
      </form>

      {/* Example link */}
      {!result && !loading && (
        <button
          onClick={() => {
            setUrl(EXAMPLE_URL)
            analyze(EXAMPLE_URL)
          }}
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Try example: MTGO Vintage Cube 2024-06 vs 2024-05
        </button>
      )}

      {/* Loading progress */}
      {loading && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-2">
          {steps.map((s, i) => (
            <LoadingStep key={i} label={s.label} done={s.done} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
          <span className="font-semibold">Error: </span>
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <DiffSummary
            added={result.added}
            removed={result.removed}
            newId={result.newId}
            oldId={result.oldId}
          />

          {Object.keys(result.impact).length > 0 ? (
            <ArchetypeChart impact={result.impact} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              No archetype changes detected — the diff may contain only lands or unclassified cards.
            </div>
          )}

          {/* Unclassified cards */}
          {(() => {
            const allAdded = result.added.map((c) => c.name)
            const allRemoved = result.removed.map((c) => c.name)
            const classifiedAdded = new Set(
              Object.values(result.impact).flatMap((e) => e.added.map((c) => c.name))
            )
            const classifiedRemoved = new Set(
              Object.values(result.impact).flatMap((e) => e.removed.map((c) => c.name))
            )
            const unclassifiedAdded = allAdded.filter((n) => !classifiedAdded.has(n))
            const unclassifiedRemoved = allRemoved.filter((n) => !classifiedRemoved.has(n))
            if (unclassifiedAdded.length === 0 && unclassifiedRemoved.length === 0) return null
            return (
              <div className="border border-gray-700 rounded-xl p-4 text-sm text-gray-500">
                <p className="font-medium text-gray-400 mb-2">Unclassified cards</p>
                <p className="text-xs mb-1">
                  These cards weren't matched to an archetype (may be lands, colorless, or unusual effects):
                </p>
                {unclassifiedAdded.length > 0 && (
                  <p className="text-green-700">
                    Added: {unclassifiedAdded.join(', ')}
                  </p>
                )}
                {unclassifiedRemoved.length > 0 && (
                  <p className="text-red-800">
                    Removed: {unclassifiedRemoved.join(', ')}
                  </p>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
