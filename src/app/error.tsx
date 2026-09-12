'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled App Router Error:', error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-inner">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        An unexpected error occurred while rendering this page. Our team has been notified.
      </p>
      {error?.message && (
        <div className="mt-4 max-w-lg rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-xs text-rose-800 font-mono overflow-x-auto">
          {error.message}
        </div>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
        >
          <Home className="h-4 w-4 text-slate-500" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
