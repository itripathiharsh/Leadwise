'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Building2,
  Users,
  PhoneCall,
  CalendarCheck,
  Award,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Activity,
  ChevronRight,
  Sparkle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [rememberMe, setRememberMe] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [errorStatus, setErrorStatus] = React.useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setErrorStatus(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Sign in failed. Please verify your email and password.')
        if (data.status) setErrorStatus(data.status)
        setLoading(false)
        return
      }

      toast.success(`Welcome back, ${data.user.name}!`)
      window.location.href = '/dashboard'
    } catch {
      setError('Network error while signing in. Please check connection and try again.')
      setLoading(false)
    }
  }

  const pipelineStages = [
    {
      step: '01',
      stage: 'Organization',
      name: 'National Wellness Institute',
      category: 'Healthcare & Wellness',
      status: 'Target Identified',
      icon: Building2,
      accent: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
    {
      step: '02',
      stage: 'Key Contact',
      name: 'Dr. Evelyn Vance (Chief Medical Officer)',
      category: 'Verified Decision Maker',
      status: 'Direct Channel Ready',
      icon: Users,
      accent: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      step: '03',
      stage: 'Outreach & Cadence',
      name: 'Tailored Clinical Proposal Sent',
      category: 'Priority Phone & Direct Email',
      status: 'Response Received (Warm)',
      icon: PhoneCall,
      accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      step: '04',
      stage: 'Partnership Meeting',
      name: 'Strategic Integration & Demo',
      category: 'Scheduled for Tomorrow, 11:00 AM',
      status: 'Agenda Confirmed',
      icon: CalendarCheck,
      accent: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      step: '05',
      stage: 'Mutual Partnership',
      name: 'Leadwise Clinical MoU Finalized',
      category: 'Active Co-Branded Launch',
      status: 'Signed & Ongoing',
      icon: Award,
      accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
  ]

  return (
    <main id="main-content" className="flex min-h-screen w-full bg-canvas text-foreground overflow-hidden">
      {/* LEFT SIDE: Brand Showcase & Animated Interactive Command Center */}
      <div className="relative hidden lg:flex lg:w-[54%] flex-col justify-between p-12 xl:p-16 border-r border-border bg-gradient-to-br from-surface to-canvas overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute -top-32 -left-32 size-[500px] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 -right-32 size-[450px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none" />
        <div className="absolute -bottom-32 left-1/4 size-[400px] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-[0.18] pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative flex items-center">
              <Image
                src="/logo-white-text.png"
                alt="Leadwise"
                width={180}
                height={48}
                priority
                className="h-12 xl:h-14 w-auto object-contain drop-shadow-[0_0_25px_rgba(99,102,241,0.4)] hidden dark:block"
              />
              <Image
                src="/logo-dark-text.png"
                alt="Leadwise"
                width={180}
                height={48}
                priority
                className="h-12 xl:h-14 w-auto object-contain block dark:hidden"
              />
            </div>
            <div className="h-8 w-px bg-border/60" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                  Command Center
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Partnership Intelligence & Outreach Platform
              </p>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-surface/60 backdrop-blur-md text-xs font-mono text-muted-foreground">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>INSTITUTIONAL SYNC ACTIVE</span>
          </div>
        </div>

        {/* Hero Narrative & Animated CRM Pipeline */}
        <div className="relative z-10 my-auto py-8 space-y-8 max-w-2xl">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
              <Sparkle className="size-3.5" />
              <span>Turn high-friction outreach into verified partnerships</span>
            </div>
            <h2 className="font-display text-4xl xl:text-5xl font-black tracking-tight text-foreground leading-[1.15]">
              The Partnership Intelligence Command Center.
            </h2>
            <p className="text-sm xl:text-base text-muted-foreground leading-relaxed">
              Orchestrate executive-tier clinical outreach, map authenticated institutional decision-makers, and convert strategic relationships into verified partnerships with zero friction.
            </p>
          </div>

          {/* Interactive Miniature Pipeline Simulation */}
          <div className="relative rounded-2xl border border-border/80 bg-surface/70 backdrop-blur-xl p-6 shadow-2xl space-y-4 rim-highlight">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  The Leadwise Deal Progression Engine
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                100% Traceability
              </span>
            </div>

            <div className="relative space-y-2.5">
              {pipelineStages.map((item, idx) => {
                const Icon = item.icon
                const isLast = idx === pipelineStages.length - 1

                return (
                  <div
                    key={item.step}
                    className={cn(
                      'group relative flex items-center gap-3.5 rounded-xl border p-2.5 transition-all duration-300',
                      isLast
                        ? 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 shadow-sm'
                        : 'border-border/60 bg-surface/40 hover:bg-surface-elevated/70 hover:border-border'
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-9 items-center justify-center rounded-lg border font-mono text-xs font-bold shrink-0 transition-transform group-hover:scale-105',
                        item.accent
                      )}
                    >
                      <Icon className="size-4.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                            {item.step}
                          </span>
                          <span className="text-xs font-bold text-foreground truncate">
                            {item.stage}
                          </span>
                          <ChevronRight className="size-3 text-muted-foreground/60" />
                          <span className="text-xs font-medium text-foreground/90 truncate">
                            {item.name}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-md font-mono shrink-0 font-medium',
                            isLast
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-surface text-muted-foreground border border-border/80'
                          )}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{item.category}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Security & Reliability Footer */}
        <div className="relative z-10 flex items-center justify-between border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
            <span>Multi-tier Enterprise RBAC with zero data leaks</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <TrendingUp className="size-3.5 text-primary" />
            <span>Velocity Engine 3.2</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: High-Density Executive Login Card */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 sm:p-12 lg:p-16 bg-surface/30">
        {/* Subtle Ambient Radial Light */}
        <div className="absolute -top-24 right-0 size-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md space-y-6 relative z-10">
          {/* Mobile Brand Header */}
          <div className="flex flex-col items-center text-center space-y-2.5 lg:hidden">
            <Image
              src="/logo-white-text.png"
              alt="Leadwise"
              width={160}
              height={44}
              priority
              className="h-14 w-auto object-contain drop-shadow-[0_0_25px_rgba(99,102,241,0.4)] mb-1 hidden dark:block"
            />
            <Image
              src="/logo-dark-text.png"
              alt="Leadwise"
              width={160}
              height={44}
              priority
              className="h-14 w-auto object-contain mb-1 block dark:hidden"
            />
            <p className="text-xs text-muted-foreground max-w-xs font-medium">
              Partnership Intelligence Command Center
            </p>
          </div>

          {/* Form Container */}
          <div className="bento-box rounded-2xl border border-border/90 bg-surface/85 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl space-y-6 rim-highlight">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <div>
                  <Image
                    src="/logo-white-text.png"
                    alt="Leadwise"
                    width={140}
                    height={36}
                    className="h-9 sm:h-10 w-auto object-contain drop-shadow-[0_0_18px_rgba(99,102,241,0.35)] hidden dark:block"
                  />
                  <Image
                    src="/logo-dark-text.png"
                    alt="Leadwise"
                    width={140}
                    height={36}
                    className="h-9 sm:h-10 w-auto object-contain block dark:hidden"
                  />
                </div>
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">
                  Secure Access
                </span>
              </div>
              <div>
                <h1 className="font-display font-bold text-xl tracking-tight text-foreground">
                  Sign in to Command Center
                </h1>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Enter your authorized credentials to access your partnership pipeline, team accounts, and outreach cadences.
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div
                  className={cn(
                    'rounded-xl border p-3.5 text-xs font-medium animate-in-fast flex items-start gap-2.5',
                    errorStatus === 'PENDING'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                      : 'border-destructive/40 bg-destructive/10 text-destructive',
                  )}
                >
                  {errorStatus === 'PENDING' ? (
                    <div className="size-2 rounded-full bg-amber-500 mt-1 shrink-0 animate-pulse" />
                  ) : (
                    <div className="size-2 rounded-full bg-destructive mt-1 shrink-0 animate-ping" />
                  )}
                  <div className="flex-1">
                    <span className="leading-tight">{error}</span>
                    {errorStatus === 'PENDING' && (
                      <div className="mt-2 pt-2 border-t border-amber-500/20">
                        <Link
                          href="/awaiting-approval"
                          className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300 hover:underline"
                        >
                          View Awaiting Approval Status →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" required className="text-xs font-semibold text-foreground/90">
                  Corporate Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@sentio.in"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leading={<Mail className="size-4 text-muted-foreground" />}
                  className="bg-surface-elevated/60 border-border focus:bg-surface focus:border-primary transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" required className="text-xs font-semibold text-foreground/90">
                    Secure Password
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-[11px] font-medium text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="size-3" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="size-3" />
                        <span>Show</span>
                      </>
                    )}
                  </button>
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leading={<Lock className="size-4 text-muted-foreground" />}
                  className="bg-surface-elevated/60 border-border focus:bg-surface focus:border-primary transition-all text-sm"
                />
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary/40 size-3.5 bg-surface-elevated"
                  />
                  <span className="text-xs">Remember this device</span>
                </label>
                <span className="text-[11px] text-muted-foreground/70 font-mono">
                  AES-256 Auth
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-200"
                loading={loading}
                loadingText="Authenticating command..."
                icon={<ArrowRight className="size-4" />}
              >
                Launch Command Center
              </Button>

              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">
                  Don&apos;t have an account yet?{' '}
                  <Link
                    href="/signup"
                    className="font-bold text-primary hover:underline transition-colors"
                  >
                    Request access / Sign up
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Quick Access Helper */}
          <div className="rounded-xl border border-border/60 bg-surface/50 p-3.5 text-center text-xs text-muted-foreground backdrop-blur-md">
            <span>Production Partnership Portal · Sentiomind Group</span>
          </div>
        </div>
      </div>
    </main>
  )
}
