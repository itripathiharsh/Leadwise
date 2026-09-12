import Link from 'next/link'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
        <FileQuestion className="h-8 w-8" />
      </div>
      <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase">404 Error</span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        The page or resource you are looking for does not exist, has been archived, or you may not have permission to view it.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 cursor-pointer"
        >
          <Home className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          href="/organisations"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-slate-500" />
          Organisations
        </Link>
      </div>
    </div>
  )
}
