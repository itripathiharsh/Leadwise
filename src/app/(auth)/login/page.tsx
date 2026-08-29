'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowRight, Lock, Mail, Shield, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Failed to sign in.')
        setLoading(false)
        return
      }

      toast.success(`Welcome back, ${data.user.name}!`)
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error while signing in. Please try again.')
      setLoading(false)
    }
  }

  const handleDemoLogin = async (demoEmail: string, demoRole: string) => {
    setEmail(demoEmail)
    setPassword('Sentio@123')
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: 'Sentio@123' }),
      })

      const data = await res.json()
      if (res.ok && data.user) {
        toast.success(`Signed in as ${data.user.name} (${demoRole})`)
        router.push('/dashboard')
        router.refresh()
      } else {
        setError(data.error || 'Demo account not found. Make sure database is seeded.')
        setLoading(false)
      }
    } catch {
      setError('Failed to sign in with demo account.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-surface-muted/60">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md mb-2">
            <Sparkles className="size-6" />
          </div>
          <h1 className="font-bold text-2xl tracking-tight text-foreground">
            Leadwise Outreach
          </h1>
          <p className="text-xs text-muted-foreground">
            Single Source of Truth for Partnership Outreach & Activities
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive-soft p-3 text-xs text-destructive font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" required>Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@leadwise.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leading={<Mail className="size-4 text-muted-foreground" />}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" required>Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leading={<Lock className="size-4 text-muted-foreground" />}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              loading={loading}
              icon={<ArrowRight className="size-4" />}
            >
              Sign In to CRM
            </Button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="border-t border-border/80 pt-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Quick Demo Access (P0)
              </span>
              <span className="text-[11px]">Pass: Sentio@123</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('harsh@sentiomind.com', 'Owner')}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted/50 p-2.5 text-left text-xs transition-colors hover:bg-muted hover:border-primary/40 focus:outline-none"
              >
                <div className="flex size-7 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 font-bold">
                  H
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">Harsh</div>
                  <div className="text-[10px] text-muted-foreground">Owner (Full)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('priya@sentiomind.com', 'Team Lead')}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted/50 p-2.5 text-left text-xs transition-colors hover:bg-muted hover:border-primary/40 focus:outline-none"
              >
                <div className="flex size-7 items-center justify-center rounded-md bg-teal-500/10 text-teal-600 font-bold">
                  P
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">Priya</div>
                  <div className="text-[10px] text-muted-foreground">Team Lead</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('rahul@sentiomind.com', 'Intern 1')}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted/50 p-2.5 text-left text-xs transition-colors hover:bg-muted hover:border-primary/40 focus:outline-none"
              >
                <div className="flex size-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 font-bold">
                  R
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">Rahul</div>
                  <div className="text-[10px] text-muted-foreground">Intern 1</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('ananya@sentiomind.com', 'Intern 2')}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted/50 p-2.5 text-left text-xs transition-colors hover:bg-muted hover:border-primary/40 focus:outline-none"
              >
                <div className="flex size-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 font-bold">
                  A
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">Ananya</div>
                  <div className="text-[10px] text-muted-foreground">Intern 2</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Protected by Leadwise RBAC & Secure Session Tokens
        </p>
      </div>
    </div>
  )
}
