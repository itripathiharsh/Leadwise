'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Clock,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  Mail,
  CheckCircle2,
  Lock,
  ExternalLink,
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
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 bg-background selection:bg-primary/20 selection:text-primary">
      {/* Background ambient aurora glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 size-[500px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 size-[400px] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link href="/login" className="inline-block transition-transform hover:scale-102">
            <img
              src="/logo-white-text.png"
              alt="Leadwise"
              className="h-12 w-auto object-contain drop-shadow-[0_0_15px_rgba(99,102,241,0.3)] hidden dark:block"
            />
            <img
              src="/logo-dark-text.png"
              alt="Leadwise"
              className="h-12 w-auto object-contain block dark:hidden"
            />
          </Link>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold">
            Controlled Access Gateway
          </span>
        </div>

        {/* Main Glass Card */}
        <div className="bento-box rounded-2xl border border-amber-500/30 bg-surface/85 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl space-y-6 rim-highlight">
          <div className="flex size-16 mx-auto items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
            <Clock className="size-8 animate-pulse" />
          </div>

          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-mono font-bold uppercase">
              <span className="size-2 rounded-full bg-amber-500 animate-ping" />
              <span>Awaiting Leadership Approval</span>
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-foreground tracking-tight">
              Account Under Review
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
              Your registration has been recorded and submitted to Team Leadership for authorization. CRM pipeline and customer intelligence data remain locked until verified.
            </p>
          </div>

          {/* Verification Steps */}
          <div className="rounded-xl border border-border/80 bg-surface-elevated/60 p-4 space-y-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="size-6 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="size-3.5" />
              </div>
              <div>
                <span className="font-semibold text-foreground">Registration Submitted</span>
                <p className="text-[11px] text-muted-foreground">Credentials securely hashed and stored in database.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-6 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="size-3.5" />
              </div>
              <div>
                <span className="font-semibold text-amber-600 dark:text-amber-300">Leadership Verification in Progress</span>
                <p className="text-[11px] text-muted-foreground">Team Lead (<span className="text-foreground font-medium">Harsh@sentio.in</span>) or Owner will approve and assign your role.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-6 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="size-3.5" />
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Full CRM Access Granted</span>
                <p className="text-[11px] text-muted-foreground">Once approved, sign in with your corporate email and password to access your pipeline.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              className="w-full text-xs font-semibold gap-2 border-border hover:bg-surface-elevated"
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
                className="w-full font-bold shadow-lg shadow-primary/20"
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
          <span>Leadwise Enterprise Security Architecture</span>
        </div>
      </div>
    </div>
  )
}
