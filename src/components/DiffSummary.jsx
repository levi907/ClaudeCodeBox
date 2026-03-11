export default function DiffSummary({ added, removed, newId, oldId }) {
  return (
    <div className="flex flex-wrap gap-4 items-center py-3 px-4 bg-gray-900 rounded-xl border border-gray-700 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Comparing</span>
        <span className="font-mono text-white bg-gray-800 px-2 py-0.5 rounded">{newId}</span>
        <span className="text-gray-400">←</span>
        <span className="font-mono text-white bg-gray-800 px-2 py-0.5 rounded">{oldId}</span>
      </div>
      <div className="flex gap-4 ml-auto">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          <span className="text-green-400 font-semibold">{added.length} added</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          <span className="text-red-400 font-semibold">{removed.length} removed</span>
        </span>
        <span className="text-gray-500">
          Net{' '}
          <span className={added.length - removed.length >= 0 ? 'text-green-400' : 'text-red-400'}>
            {added.length - removed.length >= 0 ? '+' : ''}
            {added.length - removed.length}
          </span>
        </span>
      </div>
    </div>
  )
}
