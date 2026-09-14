'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  CalendarCheck,
  Activity,
  PhoneCall,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Flame,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
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
  const [activeTab, setActiveTab] = React.useState<'cadence' | 'pipeline' | 'governance'>('cadence')

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


  const liveCadenceEvents = [
    {
      org: 'Apollo Hospitals Group',
      contact: 'Dr. Rajesh Rao',
      role: 'Chief Medical Director',
      action: 'Partnership MoU in Legal Review',
      channel: 'Executive Meeting',
      time: '11:00 AM Today',
      badgeTone: 'emerald' as const,
      badgeText: 'Stage 5: Finalized',
    },
    {
      org: 'Fortis Healthcare Network',
      contact: 'Priyah Sharma',
      role: 'VP Clinical Partnerships',
      action: 'Clinical Demo Proposal Delivered',
      channel: 'Direct Phone & Deck',
      time: '1 hr ago',
      badgeTone: 'blue' as const,
      badgeText: 'Stage 4: Evaluation',
    },
    {
      org: 'Max Healthcare Institute',
      contact: 'Dr. Anand Mehta',
      role: 'Director of Surgery',
      action: 'Follow-up Cadence Confirmed',
      channel: 'Priority Outreach',
      time: '3 hrs ago',
      badgeTone: 'amber' as const,
      badgeText: 'Stage 3: Outreach',
    },
  ]

  const pipelineStages = [
    { name: 'Target Identified', count: 42, pct: '100%', color: 'bg-primary' },
    { name: 'Contact Verified', count: 38, pct: '90%', color: 'bg-indigo-500' },
    { name: 'Outreach Active', count: 31, pct: '74%', color: 'bg-teal-500' },
    { name: 'Meeting Scheduled', count: 19, pct: '45%', color: 'bg-amber-500' },
    { name: 'Mutual Partnership', count: 18, pct: '43%', color: 'bg-emerald-500' },
  ]

  return (
    <main id="main-content" className="flex min-h-screen w-full bg-canvas text-foreground overflow-hidden">
      {/* LEFT SIDE: Animated Institutional Partnership Console */}
      <div className="relative hidden lg:flex lg:w-[50%] xl:w-[52%] flex-col justify-between p-10 xl:p-14 border-r border-border bg-surface-panel overflow-hidden">
        {/* Animated Technical Grid Background */}
        <div className="absolute inset-0 bg-grid-subtle opacity-25 pointer-events-none" />
        
        {/* Vertical Scanline Light Beam */}
        <div className="absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent via-primary/10 to-transparent pointer-events-none animate-scanline" />

        {/* Ambient Top Subtle Radial Glow */}
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Image
              src="/logo-white-text.png"
              alt="Leadwise"
              width={160}
              height={44}
              priority
              className="h-11 w-auto object-contain hidden dark:block"
            />
            <Image
              src="/logo-dark-text.png"
              alt="Leadwise"
              width={160}
              height={44}
              priority
              className="h-11 w-auto object-contain block dark:hidden"
            />
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-surface-elevated text-primary border border-primary/20 font-medium">
              Enterprise v1.2
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded border border-border bg-surface-card text-xs font-mono text-muted-foreground shadow-xs">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-foreground font-medium">Operational</span>
          </div>
        </div>

        {/* Center Live Interactive Showcase */}
        <div className="relative z-10 my-auto py-8 space-y-6 max-w-xl">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              <Zap className="size-3.5" />
              <span>Institutional Territory Velocity</span>
            </div>
            <h1 className="font-display text-3xl xl:text-4xl font-bold tracking-tight text-foreground text-balance">
              Strategic Healthcare Outreach & Partnership Console
            </h1>
            <p className="text-xs xl:text-sm text-muted-foreground leading-relaxed">
              Target verified hospital executives, orchestrate synchronized communication cadences, and convert enterprise relationships with mathematical precision.
            </p>
          </div>

          {/* Interactive Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface-elevated border border-border">
            <button
              type="button"
              onClick={() => setActiveTab('cadence')}
              className={cn(
                'flex-1 py-1.5 px-3 text-xs font-medium rounded transition-[background-color,color] duration-150 flex items-center justify-center gap-1.5',
                activeTab === 'cadence'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Activity className="size-3.5" />
              <span>Live Cadence</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pipeline')}
              className={cn(
                'flex-1 py-1.5 px-3 text-xs font-medium rounded transition-[background-color,color] duration-150 flex items-center justify-center gap-1.5',
                activeTab === 'pipeline'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Building2 className="size-3.5" />
              <span>Pipeline Funnel</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('governance')}
              className={cn(
                'flex-1 py-1.5 px-3 text-xs font-medium rounded transition-[background-color,color] duration-150 flex items-center justify-center gap-1.5',
                activeTab === 'governance'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ShieldCheck className="size-3.5" />
              <span>Security State</span>
            </button>
          </div>

          {/* Dynamic Interactive Preview Card */}
          <div className="rounded-lg border border-border bg-surface-card p-5 space-y-3.5 shadow-sm">
            {activeTab === 'cadence' && (
              <div className="space-y-2.5 animate-slide-up">
                <div className="flex items-center justify-between pb-2 border-b border-border text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <Activity className="size-3.5 text-primary" /> Real-time Touchpoint Ledger
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Active Cadence
                  </span>
                </div>

                <div className="space-y-2">
                  {liveCadenceEvents.map((evt, idx) => (
                    <div
                      key={evt.org}
                      className="group flex items-start justify-between gap-3 p-2.5 rounded-md border border-border/80 bg-surface-panel/80 hover:bg-surface-elevated/60 hover:border-primary/40 transition-[background-color,border-color] duration-150"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                            {evt.org}
                          </span>
                          <span className="text-muted-foreground/60 text-[10px]">•</span>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {evt.contact} ({evt.role})
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground/90 flex items-center gap-1.5">
                          <span>{evt.action}</span>
                          <span className="text-[10px] font-mono text-muted-foreground/60">({evt.channel})</span>
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge tone={evt.badgeTone} size="sm">
                          {evt.badgeText}
                        </Badge>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {evt.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'pipeline' && (
              <div className="space-y-3.5 animate-slide-up">
                <div className="flex items-center justify-between pb-2 border-b border-border text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="size-3.5 text-primary" /> Active Progression Trajectory
                  </span>
                  <span className="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    148 Hospital Accounts
                  </span>
                </div>

                <div className="space-y-2.5">
                  {pipelineStages.map((stg) => (
                    <div key={stg.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-medium text-[11px]">{stg.name}</span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-muted-foreground">{stg.pct}</span>
                          <span className="font-semibold text-foreground tabular-nums">{stg.count} orgs</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-surface-elevated overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', stg.color)}
                          style={{ width: stg.pct }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'governance' && (
              <div className="space-y-3 animate-slide-up">
                <div className="flex items-center justify-between pb-2 border-b border-border text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="size-3.5 text-primary" /> Role-Based Access Architecture
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Strict Enforced
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded border border-border bg-surface-elevated/50 p-3 space-y-1">
                    <div className="font-semibold text-foreground text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-primary" />
                      <span>Territory Scoping</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Intern reps strictly restricted to their assigned accounts. Zero cross-territory data leakage.
                    </p>
                  </div>

                  <div className="rounded border border-border bg-surface-elevated/50 p-3 space-y-1">
                    <div className="font-semibold text-foreground text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-primary" />
                      <span>Immutable Audit Trail</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Every phone call, status move, and contact addition is cryptographically logged with timestamps.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Live Metrics Strip */}
            <div className="flex items-center justify-between pt-2 border-t border-border text-xs font-mono">
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="tabular-nums font-semibold text-foreground">148</span> Targets
                <span>•</span>
                <span className="tabular-nums font-semibold text-foreground">84.2%</span> Verified
                <span>•</span>
                <span className="tabular-nums font-semibold text-foreground">12</span> Scheduled
              </div>
              <span className="text-[10px] text-muted-foreground">Leadwise Intelligence Network</span>
            </div>
          </div>
        </div>

        {/* Bottom Compliance Strip */}
        <div className="relative z-10 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary shrink-0" />
            <span>Multi-Tier Role Governance</span>
          </div>
          <span className="font-mono text-[11px]">Leadwise Enterprise CRM</span>
        </div>
      </div>

      {/* RIGHT SIDE: Elevated Authentication Gateway */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10 lg:p-14 bg-canvas relative">
        {/* Subtle Ambient Radial Highlight */}
        <div className="absolute top-1/4 right-0 size-80 rounded-full bg-primary/5 blur-[90px] pointer-events-none" />

        <div className="w-full max-w-sm space-y-5 relative z-10">
          {/* Mobile Brand Header */}
          <div className="flex flex-col items-center text-center space-y-2 lg:hidden">
            <Image
              src="/logo-white-text.png"
              alt="Leadwise"
              width={140}
              height={36}
              priority
              className="h-10 w-auto object-contain mb-1 hidden dark:block"
            />
            <Image
              src="/logo-dark-text.png"
              alt="Leadwise"
              width={140}
              height={36}
              priority
              className="h-10 w-auto object-contain mb-1 block dark:hidden"
            />
            <p className="text-xs text-muted-foreground">
              Partnership Intelligence Platform
            </p>
          </div>

          {/* Elevated Login Card with Top Shimmer Beam */}
          <div className="relative rounded-xl border border-border bg-surface-panel p-6 sm:p-8 space-y-5 shadow-lg overflow-hidden">
            {/* Top Border Shimmer Beam Animation */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer-beam pointer-events-none opacity-80" />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl tracking-tight text-foreground">
                  Sign in to Leadwise
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                  Command Center
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your authorized credentials to access your territory pipeline.
              </p>
            </div>

            {/* Enterprise Single Sign-On (SSO / SAML 2.0) */}
            <button
              type="button"
              onClick={() =>
                toast.info(
                  'Enterprise SSO (Okta / Azure AD / SAML 2.0) is configured per hospital tenant. Sign in with your authorized corporate email below or contact IT administration.',
                )
              }
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated/50 hover:bg-surface-elevated hover:border-primary/40 text-xs font-medium text-foreground py-2.5 px-3 transition-[border-color,background-color] duration-150 shadow-xs"
            >
              <ShieldCheck className="size-4 text-primary" />
              <span>Single Sign-On (SAML 2.0 / Okta)</span>
            </button>

            <div className="relative flex items-center justify-center my-1">
              <div className="w-full border-t border-border" />
              <span className="absolute bg-surface-panel px-2.5 text-[10px] uppercase font-mono text-muted-foreground tracking-wider">
                or corporate email
              </span>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div
                  className={cn(
                    'rounded-lg border p-3 text-xs font-medium animate-slide-up flex items-start gap-2.5',
                    errorStatus === 'PENDING'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-300',
                  )}
                >
                  <div className="flex-1">
                    <span className="leading-tight">{error}</span>
                    {errorStatus === 'PENDING' && (
                      <div className="mt-2 pt-2 border-t border-amber-500/20">
                        <Link
                          href="/awaiting-approval"
                          className="inline-flex items-center gap-1 font-semibold text-amber-300 hover:underline"
                        >
                          View Approval Status →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" required className="text-xs font-medium text-foreground">
                  Corporate Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@leadwise.io"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leading={<Mail className="size-4 text-muted-foreground" aria-hidden="true" />}
                  className="bg-surface-elevated border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary/40 transition-[border-color,box-shadow]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" required className="text-xs font-medium text-foreground">
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="size-3" aria-hidden="true" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="size-3" aria-hidden="true" />
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
                  leading={<Lock className="size-4 text-muted-foreground" aria-hidden="true" />}
                  className="bg-surface-elevated border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary/40 transition-[border-color,box-shadow]"
                />
              </div>

              <div className="flex items-center justify-between pt-0.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary/40 size-3.5 bg-surface-elevated"
                  />
                  <span className="text-xs">Remember this device</span>
                </label>
                <span className="text-[11px] text-muted-foreground/80 font-mono">
                  AES-256 Auth
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="group w-full mt-1.5 font-medium text-sm transition-[transform,background-color] duration-150"
                loading={loading}
                loadingText="Authenticating command..."
                icon={<ArrowRight className="size-4 group-hover:translate-x-1 transition-transform duration-150" />}
              >
                Sign In to Command Center
              </Button>

              <div className="text-center pt-1">
                <p className="text-xs text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/signup"
                    className="font-medium text-primary hover:underline transition-colors"
                  >
                    Request territory access
                  </Link>
                </p>
              </div>

              {/* Institutional Procurement Assurance */}
              <div className="pt-3 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>SOC-2 Type II</span>
                <span>•</span>
                <span>256-Bit TLS</span>
                <span>•</span>
                <span>HIPAA Aligned</span>
              </div>
            </form>
          </div>

          <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Leadwise CRM · Institutional Platform</span>
          </div>
        </div>
      </div>
    </main>
  )
}
