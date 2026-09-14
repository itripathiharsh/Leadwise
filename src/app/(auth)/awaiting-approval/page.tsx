'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Clock,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AwaitingApprovalPage() {
  const [checking, setChecking] = React.useState(false)

  const handleRefresh = () => {
    setChecking(true)
    setTimeout(() => {
      setChecking(false)
      window.location.reload()
    }, 800)
  }

  return (
    <main id="main-content" className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 bg-canvas text-foreground">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link href="/login" className="inline-block">
            <Image
              src="/logo-white-text.png"
              alt="Leadwise"
              width={140}
              height={36}
              priority
              className="h-10 w-auto object-contain hidden dark:block"
            />
            <Image
              src="/logo-dark-text.png"
              alt="Leadwise"
              width={140}
              height={36}
              priority
              className="h-10 w-auto object-contain block dark:hidden"
            />
          </Link>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Controlled Access Gateway
          </span>
        </div>

        {/* Main Solid Card */}
        <div className="rounded-lg border border-amber-500/30 bg-surface-panel p-6 sm:p-8 space-y-6">
          <div className="flex size-12 mx-auto items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock className="size-6" />
          </div>

          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-medium uppercase">
              <span>Awaiting Leadership Authorization</span>
            </div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-foreground tracking-tight">
              Account Under Review
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your registration has been received and queued for review. CRM pipeline data remains restricted until verified.
            </p>
          </div>

          {/* Verification Steps */}
          <div className="rounded border border-border bg-surface-elevated p-4 space-y-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="size-5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="size-3" />
              </div>
              <div>
                <span className="font-medium text-foreground">Registration Submitted</span>
                <p className="text-[11px] text-muted-foreground">Credentials recorded in the CRM roster.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="size-3" />
              </div>
              <div>
                <span className="font-medium text-amber-400">Leadership Verification in Progress</span>
                <p className="text-[11px] text-muted-foreground">Team Lead or Owner will review and assign your territory role.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-5 rounded bg-surface border border-border text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="size-3" />
              </div>
              <div>
                <span className="font-medium text-muted-foreground">CRM Access Granted</span>
                <p className="text-[11px] text-muted-foreground">Once approved, sign in with your corporate email to access your accounts.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <Button
              variant="outline"
              size="lg"
              className="w-full text-xs font-medium gap-2 border-border hover:bg-surface-elevated"
              onClick={handleRefresh}
              loading={checking}
              loadingText="Checking status..."
              icon={<RefreshCw className="size-3.5" />}
            >
              Check Approval Status
            </Button>

            <Link href="/login" className="block w-full">
              <Button
                variant="primary"
                size="lg"
                className="w-full text-xs font-medium"
                icon={<ArrowLeft className="size-4" />}
              >
                Return to Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <ShieldCheck className="size-3.5 text-primary" />
          <span>Leadwise Security Architecture</span>
        </div>
      </div>
    </main>
  )
}
