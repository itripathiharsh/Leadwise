'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
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
  Building2,
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

  const steps = [
    {
      step: '01',
      title: 'Submit Account Request',
      description: 'Create authenticated credentials with your corporate email address.',
      icon: User,
    },
    {
      step: '02',
      title: 'Leadership Authorization',
      description: 'Account status enters pending review for Team Lead approval and role assignment.',
      icon: Clock,
    },
    {
      step: '03',
      title: 'Territory Scoping',
      description: 'Access authorized target accounts, communication cadences, and pipeline stages.',
      icon: ShieldCheck,
    },
  ]

  return (
    <main id="main-content" className="flex min-h-screen w-full bg-canvas text-foreground">
      {/* LEFT SIDE: Institutional Information */}
      <div className="relative hidden lg:flex lg:w-[48%] xl:w-[45%] flex-col justify-between p-12 xl:p-16 border-r border-border bg-surface-panel">
        <div className="relative z-10">
          <Link href="/login" className="inline-block">
            <Image
              src="/logo-white-text.png"
              alt="Leadwise"
              width={150}
              height={40}
              priority
              className="h-10 w-auto object-contain hidden dark:block"
            />
            <Image
              src="/logo-dark-text.png"
              alt="Leadwise"
              width={150}
              height={40}
              priority
              className="h-10 w-auto object-contain block dark:hidden"
            />
          </Link>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            Onboarding & Territory Governance
          </p>
        </div>

        <div className="relative z-10 my-auto py-10 space-y-8 max-w-lg">
          <div className="space-y-3">
            <h1 className="font-display text-3xl xl:text-4xl font-bold tracking-tight text-foreground text-balance">
              Request Platform Access
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Access to the Leadwise CRM environment requires verification by Team Leadership before accounts are granted access to institutional accounts and outreach data.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {steps.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className="flex items-start gap-3.5 rounded-lg border border-border bg-surface-card p-3.5"
                >
                  <div className="flex size-8 items-center justify-center rounded bg-primary/10 border border-primary/20 text-primary shrink-0 mt-0.5">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                        {item.step}
                      </span>
                      <h2 className="text-xs font-semibold text-foreground">{item.title}</h2>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-border pt-5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary shrink-0" aria-hidden="true" />
            <span>Role-Based Access Governance</span>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">Sentio Group CRM</span>
        </div>
      </div>

      {/* RIGHT SIDE: Signup Form or Pending Confirmation */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-sm space-y-6">
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

          {submitted ? (
            /* SUBMITTED CONFIRMATION STATE */
            <div className="rounded-lg border border-amber-500/30 bg-surface-panel p-6 sm:p-8 space-y-5">
              <div className="flex size-12 mx-auto items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Clock className="size-6" />
              </div>

              <div className="text-center space-y-1.5">
                <span className="inline-block text-[11px] font-mono uppercase px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  Status: Pending Review
                </span>
                <h2 className="font-display font-bold text-xl text-foreground">
                  Registration Submitted
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your account request for <span className="font-semibold text-foreground font-mono">{registeredEmail}</span> has been queued.
                </p>
              </div>

              <div className="rounded border border-border bg-surface-elevated p-3.5 space-y-1.5 text-xs">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-primary" />
                  <span>Next Steps for Activation</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your account will be verified and assigned an operational CRM role by Team Leadership. You will then be able to sign in.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <Link href="/login" className="block w-full">
                  <Button variant="primary" size="lg" className="w-full text-sm font-medium">
                    Return to Sign In
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground border-border"
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
            <div className="rounded-lg border border-border bg-surface-panel p-6 sm:p-8 space-y-5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-xl tracking-tight text-foreground">
                    Request Account
                  </h2>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                    Requires TL Review
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your information to request CRM access.
                </p>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                {error && (
                  <div className="rounded border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 font-medium flex items-start gap-2">
                    <span className="leading-tight">{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="name" required className="text-xs font-medium text-foreground">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Maya Lin"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    leading={<User className="size-4 text-muted-foreground" aria-hidden="true" />}
                    className="bg-surface-elevated border-border text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" required className="text-xs font-medium text-foreground">
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
                    leading={<Mail className="size-4 text-muted-foreground" aria-hidden="true" />}
                    className="bg-surface-elevated border-border text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" required className="text-xs font-medium text-foreground">
                      Password (min. 8 chars)
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
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leading={<Lock className="size-4 text-muted-foreground" aria-hidden="true" />}
                    className="bg-surface-elevated border-border text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-medium text-foreground">
                    Phone Number <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    leading={<Phone className="size-4 text-muted-foreground" aria-hidden="true" />}
                    className="bg-surface-elevated border-border text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2 font-medium text-sm"
                  loading={loading}
                  loadingText="Submitting..."
                  icon={<ArrowRight className="size-4" />}
                >
                  Submit Request
                </Button>

                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    Already have an approved account?{' '}
                    <Link
                      href="/login"
                      className="font-medium text-primary hover:underline transition-colors"
                    >
                      Sign In
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground">
            <span>Leadwise CRM · Institutional Platform</span>
          </div>
        </div>
      </div>
    </main>
  )
}
