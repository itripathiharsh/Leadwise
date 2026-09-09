'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowRight, Lock, Mail } from 'lucide-react'
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
        setError(data.error || 'Sign in failed. Check credentials.')
        setLoading(false)
        return
      }

      toast.success(`Welcome back, ${data.user.name}!`)
      window.location.href = '/dashboard'
    } catch {
      setError('Network error while signing in. Please try again.')
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


        </div>

        <p className="text-center text-xs text-muted-foreground">
          Protected by Leadwise RBAC & Secure Session Tokens
        </p>
      </div>
    </div>
  )
}
