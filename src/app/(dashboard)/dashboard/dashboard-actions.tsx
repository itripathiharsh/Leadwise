'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, FileSpreadsheet, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogActivityModal } from '@/components/domain/log-activity-modal'
import { CreateOrganisationModal } from '@/components/domain/create-organisation-modal'
import { useRouter } from 'next/navigation'

export function DashboardClientActions({ isLeader }: { isLeader: boolean }) {
  const router = useRouter()
  const [logModalOpen, setLogModalOpen] = React.useState(false)
  const [createOrgOpen, setCreateOrgOpen] = React.useState(false)

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {isLeader && (
        <Link href="/eod">
          <Button
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet className="size-4 text-emerald-600" />}
          >
            Review & Send EOD
          </Button>
        </Link>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateOrgOpen(true)}
        icon={<Building2 className="size-4 text-primary" />}
      >
        + Organisation
      </Button>

      <Button
        variant="primary"
        size="sm"
        onClick={() => setLogModalOpen(true)}
        icon={<Plus className="size-4" />}
      >
        Log Activity
      </Button>

      <LogActivityModal
        open={logModalOpen}
        onOpenChange={setLogModalOpen}
        onSuccess={handleRefresh}
      />

      <CreateOrganisationModal
        open={createOrgOpen}
        onOpenChange={setCreateOrgOpen}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
