export default function HomeLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-9 w-20 rounded-lg bg-surface animate-pulse mb-2" />
          <div className="h-4 w-16 rounded bg-surface animate-pulse" />
        </div>
        <div className="w-10 h-10 rounded-full bg-surface animate-pulse" />
      </div>

      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-surface border border-border rounded-2xl p-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface-2 animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-36 rounded bg-surface-2 animate-pulse mb-2" />
                <div className="h-3 w-24 rounded bg-surface-2 animate-pulse" />
              </div>
              <div className="w-4 h-4 rounded bg-surface-2 animate-pulse shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
