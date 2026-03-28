export default function ListDetailLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="h-6 w-16 rounded bg-surface animate-pulse" />
          <div className="flex gap-2">
            <div className="w-9 h-9 rounded-full bg-surface animate-pulse" />
            <div className="w-9 h-9 rounded-full bg-surface animate-pulse" />
            <div className="w-9 h-9 rounded-full bg-surface animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-surface animate-pulse shrink-0" />
          <div>
            <div className="h-7 w-40 rounded bg-surface animate-pulse mb-2" />
            <div className="h-4 w-28 rounded bg-surface animate-pulse" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="h-11 rounded-xl bg-surface animate-pulse mb-6" />

      {/* Vote banner */}
      <div className="h-10 rounded-xl bg-surface animate-pulse mb-4" />

      {/* Items */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-4"
          >
            <div className="w-8 text-center">
              <div className="h-4 w-6 rounded bg-surface-2 animate-pulse mx-auto" />
            </div>
            <div className="flex-1">
              <div className="h-4 w-40 rounded bg-surface-2 animate-pulse mb-2" />
              <div className="h-3 w-24 rounded bg-surface-2 animate-pulse" />
            </div>
            <div className="w-10 h-14 rounded-xl bg-surface-2 animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
