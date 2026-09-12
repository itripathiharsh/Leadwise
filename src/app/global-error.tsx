'use client'

import { useEffect } from 'react'
import { AlertOctagon, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Root Layout Critical Error:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center font-sans antialiased text-slate-900">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <AlertOctagon className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Application Error</h2>
          <p className="mt-2 text-sm text-slate-600">
            A critical system error occurred. Please refresh or try reloading the application.
          </p>
          <div className="mt-6">
            <button
              onClick={() => reset()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
