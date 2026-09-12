'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  Building2,
  Users,
  Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function SignupPage() {
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [submitted, setSubmitted] = React.useState(false)
  const [registeredEmail, setRegisteredEmail] = React.useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Signup request failed.')
        setLoading(false)
        return
      }

      setRegisteredEmail(email.trim())
      setSubmitted(true)
      toast.success('Registration request submitted!')
    } catch {
      setError('Network error during registration. Please check connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const pipelineHighlights = [
    {
      step: '01',
      title: 'Submit Registration',
      desc: 'Create your authenticated credentials and profile details.',
      icon: User,
      accent: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
    {
      step: '02',
      title: 'Status: PENDING',
      desc: 'Account is queued securely awaiting team verification.',
      icon: Clock,
      accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      step: '03',
      title: 'Team Lead Review',
      desc: 'Harsh / Admin reviews and assigns operational CRM role.',
      icon: ShieldCheck,
      accent: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    },
    {
      step: '04',
      title: 'Active Outreach',
      desc: 'Access authorized partnership accounts and pipelines.',
      icon: Award,
      accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
  ]

  return (
    <main id="main-content" className="relative flex min-h-screen w-full bg-background overflow-x-hidden">
      {/* LEFT SIDE: Brand Intelligence Hero Panel */}
      <div className="relative hidden w-1/2 flex-col justify-between p-12 lg:flex border-r border-border/80 overflow-hidden bg-surface-muted/30">
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-0 size-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <Link href="/login" className="inline-block transition-transform hover:scale-102">
            <Image
              src="/logo-white-text.png"
              alt="Leadwise"
              width={160}
              height={44}
              priority
              className="h-14 w-auto object-contain drop-shadow-[0_0_20px_rgba(99,102,241,0.35)] hidden dark:block"
            />
            <Image
              src="/logo-dark-text.png"
              alt="Leadwise"
              width={160}
              height={44}
              priority
              className="h-14 w-auto object-contain block dark:hidden"
            />
          </Link>
          <p className="mt-2 text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Partnership Intelligence & Onboarding Portal
          </p>
        </div>

        <div className="relative z-10 space-y-6 my-auto max-w-lg">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              <span>Controlled Enterprise Access</span>
            </div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Join the Leadwise Outreach Command Center
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every newly registered team member is reviewed by Team Leadership before CRM pipeline and data access is granted.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {pipelineHighlights.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className="flex items-center gap-3.5 rounded-xl border border-border/70 bg-surface/70 backdrop-blur-md p-3 transition-colors hover:border-primary/40"
                >
                  <div
                    className={cn(
                      'flex size-9 items-center justify-center rounded-lg border font-mono text-xs font-bold shrink-0',
                      item.accent,
                    )}
                  >
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                        {item.step}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {item.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
            <span>Strict Role-Based Compartmentalization</span>
          </div>
          <div className="font-mono text-[11px]">
            <span>Sentio Group CRM</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Signup Form or Confirmation Card */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 sm:p-12 lg:p-16 bg-surface/30">
        <div className="absolute -top-24 right-0 size-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md space-y-6 relative z-10">
          {/* Mobile Header */}
          <div className="flex flex-col items-center text-center space-y-2 lg:hidden">
            <Image
              src="/logo-white-text.png"
              alt="Leadwise"
              width={140}
              height={36}
              priority
              className="h-12 w-auto object-contain hidden dark:block"
            />
            <Image
              src="/logo-dark-text.png"
              alt="Leadwise"
              width={140}
              height={36}
              priority
              className="h-12 w-auto object-contain block dark:hidden"
            />
            <p className="text-xs text-muted-foreground font-medium">
              Partnership Outreach Command Center
            </p>
          </div>

          {submitted ? (
            /* SUBMITTED SUCCESS / PENDING STATE */
            <div className="bento-box rounded-2xl border border-border/90 bg-surface/85 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl space-y-6 rim-highlight animate-in fade-in zoom-in-95">
              <div className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                <Clock className="size-7 animate-pulse" />
              </div>

              <div className="text-center space-y-2">
                <span className="inline-block text-[11px] font-mono uppercase px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold">
                  Status: PENDING REVIEW
                </span>
                <h1 className="font-display font-extrabold text-xl sm:text-2xl text-foreground">
                  Registration Request Submitted
                </h1>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  Your account for <span className="font-bold text-foreground">{registeredEmail}</span> has been created.
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-surface-elevated/60 p-4 space-y-2.5 text-xs">
                <div className="font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <span>Next Steps for Activation:</span>
                </div>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                  Your request has been routed to Team Leadership (<span className="text-foreground font-semibold">Harsh@sentio.in</span> / <span className="text-foreground font-semibold">admin@sentio.in</span>) for verification. Once approved, you can immediately sign in.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <Link href="/login" className="block w-full">
                  <Button variant="primary" size="lg" className="w-full font-bold shadow-lg shadow-primary/20">
                    Return to Sign In
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSubmitted(false)
                    setName('')
                    setEmail('')
                    setPassword('')
                    setPhone('')
                  }}
                >
                  Register Another Account
                </Button>
              </div>
            </div>
          ) : (
            /* REGISTRATION FORM */
            <div className="bento-box rounded-2xl border border-border/90 bg-surface/85 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl space-y-6 rim-highlight">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-border/50">
                  <h1 className="font-display font-bold text-xl tracking-tight text-foreground">
                    Request Account Access
                  </h1>
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">
                    Requires TL Approval
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Register with your corporate email. Your account will enter a <span className="font-semibold text-foreground">PENDING</span> state until approved by Team Leadership.
                </p>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive font-medium animate-in-fast flex items-start gap-2.5">
                    <div className="size-2 rounded-full bg-destructive mt-1 shrink-0 animate-ping" />
                    <span className="leading-tight">{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="name" required className="text-xs font-semibold text-foreground/90">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Rohit Sharma"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    leading={<User className="size-4 text-muted-foreground" />}
                    className="bg-surface-elevated/60 border-border focus:bg-surface focus:border-primary text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" required className="text-xs font-semibold text-foreground/90">
                    Corporate Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@sentio.in"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leading={<Mail className="size-4 text-muted-foreground" />}
                    className="bg-surface-elevated/60 border-border focus:bg-surface focus:border-primary text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" required className="text-xs font-semibold text-foreground/90">
                      Password (min 8 characters)
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
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leading={<Lock className="size-4 text-muted-foreground" />}
                    className="bg-surface-elevated/60 border-border focus:bg-surface focus:border-primary text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold text-foreground/90">
                    Phone Number <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    leading={<Phone className="size-4 text-muted-foreground" />}
                    className="bg-surface-elevated/60 border-border focus:bg-surface focus:border-primary text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-3 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30"
                  loading={loading}
                  loadingText="Submitting registration request..."
                  icon={<ArrowRight className="size-4" />}
                >
                  Submit Registration Request
                </Button>

                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    Already have an approved account?{' '}
                    <Link
                      href="/login"
                      className="font-bold text-primary hover:underline transition-colors"
                    >
                      Sign In here
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-surface/50 p-3 text-center text-xs text-muted-foreground backdrop-blur-md">
            <span>Production Partnership Portal · Sentiomind Group</span>
          </div>
        </div>
      </div>
    </main>
  )
}
