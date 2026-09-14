export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      {/* Top bar skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-surface-elevated" />
          <div className="h-4 w-72 rounded bg-surface-elevated/60" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 rounded bg-surface-elevated" />
          <div className="h-9 w-32 rounded bg-surface-elevated" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface-panel p-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 rounded bg-surface-elevated" />
              <div className="size-7 rounded bg-surface-elevated" />
            </div>
            <div className="mt-3 h-7 w-24 rounded bg-surface-elevated" />
            <div className="mt-2 h-3 w-32 rounded bg-surface-elevated/60" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="rounded-lg border border-border bg-surface-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-5 w-36 rounded bg-surface-elevated" />
          <div className="h-8 w-48 rounded bg-surface-elevated" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-surface-card p-3"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-surface-elevated" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-40 rounded bg-surface-elevated" />
                  <div className="h-3 w-28 rounded bg-surface-elevated/60" />
                </div>
              </div>
              <div className="h-5 w-20 rounded bg-surface-elevated" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
