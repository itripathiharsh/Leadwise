export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      {/* Top bar skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-72 rounded bg-slate-100 dark:bg-slate-800/60" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-32 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="mt-4 h-8 w-24 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="mt-2 h-3 w-32 rounded bg-slate-100 dark:bg-slate-800/60" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-5 w-36 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-8 w-48 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-slate-100 p-4 dark:border-slate-800/60"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-1.5">
                  <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-28 rounded bg-slate-100 dark:bg-slate-800/60" />
                </div>
              </div>
              <div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
