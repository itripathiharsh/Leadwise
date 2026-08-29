'use client'

import * as React from 'react'
import {
  Sparkles,
  Award,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Target,
  User,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { OrganisationIntelligence } from '@/server/services/ai/intelligence'

interface AiLeadIntelligenceCardProps {
  orgId: string
  initialData?: OrganisationIntelligence | null
}

export function AiLeadIntelligenceCard({
  orgId,
  initialData,
}: AiLeadIntelligenceCardProps) {
  const [data, setData] = React.useState<OrganisationIntelligence | null>(initialData || null)
  const [loading, setLoading] = React.useState(!initialData)

  const fetchScore = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ai/intelligence?orgId=${orgId}`)
      if (res.ok) {
        const d = await res.json()
        setData(d.intelligence)
      } else {
        toast.error('Failed to compute lead intelligence.')
      }
    } catch {
      toast.error('Network error loading intelligence.')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  React.useEffect(() => {
    if (!initialData) {
      fetchScore()
    }
  }, [initialData, fetchScore])

  if (loading && !data) {
    return (
      <Card className="border-border bg-surface shadow-xs p-6 text-center text-xs text-muted-foreground animate-pulse">
        <Sparkles className="size-5 mx-auto mb-2 text-primary animate-spin" />
        Analyzing outreach signals &amp; computing partnership score...
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card className="border-primary/30 bg-primary-soft/15 shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-primary/20 bg-surface/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Sparkles className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                AI Partnership Intelligence
                <Badge tone="violet" size="sm">
                  {data.score}/100 Score
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Explainable qualification score &amp; recommended next steps.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              tone={
                data.aiPriority === 'HIGH'
                  ? 'rose'
                  : data.aiPriority === 'MEDIUM'
                    ? 'amber'
                    : 'slate'
              }
              size="sm"
            >
              AI: {data.aiPriority}
            </Badge>

            <Button
              variant="ghost"
              size="xs"
              onClick={fetchScore}
              icon={<RefreshCw className={cn('size-3', loading && 'animate-spin')} />}
            >
              Re-score
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Top Summary & Likelihood */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 rounded-xl bg-surface p-3.5 border border-border space-y-1">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Executive Summary
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">{data.summary}</p>
          </div>

          <div className="rounded-xl bg-surface p-3.5 border border-border flex flex-col justify-between">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Partnership Likelihood
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-2xl font-extrabold text-primary">
                ~{data.partnershipLikelihood}%
              </span>
              <span className="text-[10px] text-muted-foreground">estimated</span>
            </div>
            <div className="text-[10px] text-muted-foreground italic pt-1 border-t border-border/50">
              Derived from response history &amp; stakeholder mapping
            </div>
          </div>
        </div>

        {/* Explainable Factor Breakdown */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Award className="size-3.5 text-amber-500" />
            <span>Score Factors &amp; Contributing Signals:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.factors.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border text-xs"
              >
                <div className="space-y-0.5 pr-2">
                  <div className="font-semibold text-foreground">{f.label}</div>
                  <div className="text-[10px] text-muted-foreground">{f.description}</div>
                </div>
                <Badge tone="emerald" size="sm">
                  +{f.points}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Contact & Recommended Action */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-primary/20">
          {data.recommendedContact && (
            <div className="rounded-xl bg-surface p-3 border border-border space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <User className="size-3 text-primary" /> Recommended Contact to Engage:
              </div>
              <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                {data.recommendedContact.name}
                {data.recommendedContact.isDecisionMaker && (
                  <Badge tone="amber" size="sm">
                    DM
                  </Badge>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {data.recommendedContact.designation || 'Key Stakeholder'} · {data.recommendedContact.reason}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-surface p-3 border border-border space-y-1">
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Target className="size-3 text-primary" /> Recommended Next Action:
            </div>
            <div className="font-bold text-xs text-primary">{data.recommendedNextAction}</div>
            <div className="text-[10px] text-muted-foreground">
              Based on stage maturity and time elapsed since last contact
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
