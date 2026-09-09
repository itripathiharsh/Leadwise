'use client'

import * as React from 'react'
import Link from 'next/link'
import { FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DashboardClientActions({ isLeader }: { isLeader: boolean }) {
  if (!isLeader) return null

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link href="/eod">
        <Button
          variant="outline"
          size="sm"
          icon={<FileSpreadsheet className="size-4 text-emerald-600" />}
        >
          Review & Send EOD
        </Button>
      </Link>
    </div>
  )
}
