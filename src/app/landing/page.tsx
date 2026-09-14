'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Command,
  Compass,
  Copy,
  Database,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Flame,
  Globe,
  HelpCircle,
  Key,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  Network,
  Phone,
  PhoneCall,
  Play,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Terminal,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react'

// ── Scrollytelling Phases Definition ────────────────────────────────────────

interface ScrollyPhase {
  id: string
  step: string
  title: string
  subtitle: string
  description: string
  metricLabel: string
  metricValue: string
  badgeText: string
  tags: string[]
}

const SCROLLY_PHASES: ScrollyPhase[] = [
  {
    id: 'mapping',
    step: 'Phase 01',
    title: 'Intelligent Account Mapping & Decision-Maker Discovery',
    subtitle: 'Map enterprise hierarchies and verify C-suite influence paths.',
    description:
      'Instantly profile corporate accounts with verified decision-maker dossiers. Our real-time deduplication engine cross-checks domains, emails, and direct phone lines to prevent conflicting multi-rep outreach.',
    metricLabel: 'Deduplication Precision',
    metricValue: '99.8%',
    badgeText: 'Cross-Org Conflict Shield',
    tags: ['E.164 Phone Normalization', 'C-Suite Mapping', 'Domain Verification'],
  },
  {
    id: 'cadence',
    step: 'Phase 02',
    title: 'Synchronized Multi-Touch Cadence Engine',
    subtitle: 'Zero deal decay with outcome-driven next follow-up scheduling.',
    description:
      'Never lose high-value deals to dormancy. Every phone call, executive meeting, and outreach automatically computes and locks the next follow-up date. Connected calls enforce a 3-day touchpoint; unreachables queue 24-hr retries.',
    metricLabel: 'Prevented Deal Slippage',
    metricValue: 'Zero-Decay',
    badgeText: 'Algorithmic 14-Day Loop',
    tags: ['Automated Next Dates', 'Omnichannel Cadence', 'Overdue Escalations'],
  },
  {
    id: 'pipeline',
    step: 'Phase 03',
    title: 'Real-Time Stage Velocity Kanban',
    subtitle: 'Track multi-million deal pipelines across synchronized stages.',
    description:
      'Gain unmatched visibility into high-ticket pipeline velocity. Move accounts from Assigned to Partnership with granular audit tracking, stage movement logs, and probability-weighted deal totals.',
    metricLabel: 'MoU Execution Velocity',
    metricValue: '4.2x Faster',
    badgeText: '8-Stage Linear Governance',
    tags: ['Weighted Forecasting', 'Stage Integrity Rules', 'Live Deal Sizing'],
  },
  {
    id: 'synthesis',
    step: 'Phase 04',
    title: 'Automated EOD Synthesis & Instant Executive Briefs',
    subtitle: 'Zero-admin reporting. Instant WhatsApp & Slack group delivery.',
    description:
      'Eliminate manual end-of-day spreadsheets entirely. Leadwise aggregates every completed call, stage movement, and upcoming task into an executive-ready brief formatted for instant copy-paste into leadership WhatsApp chats.',
    metricLabel: 'Admin Hours Saved',
    metricValue: '3.5 hrs/rep/wk',
    badgeText: '1-Click WhatsApp Format',
    tags: ['Instant Daily Digest', '7-Day Velocity Matrix', 'Team Roster Rankings'],
  },
]

export default function LandingPage() {
  // Scrollytelling active phase state
  const [activePhaseIndex, setActivePhaseIndex] = React.useState<number>(0)
  const currentPhase = SCROLLY_PHASES[activePhaseIndex]
  const [isAutoCycling, setIsAutoCycling] = React.useState<boolean>(true)
  const [phaseProgress, setPhaseProgress] = React.useState<number>(0)

  // Interactive ROI parameters
  const [teamSize, setTeamSize] = React.useState<number>(10)
  const [avgDealValue, setAvgDealValue] = React.useState<number>(50) // in Lakhs

  // Industry vertical selector for dynamic examples
  const [selectedIndustry, setSelectedIndustry] = React.useState<
    'enterprise' | 'fintech' | 'healthcare' | 'tech'
  >('enterprise')

  // Live telemetry mock simulation
  const [telemetryEventIndex, setTelemetryEventIndex] = React.useState<number>(0)
  const telemetryEvents = React.useMemo(
    () => [
      { text: 'Acme Corp progressed to Executive Meeting (₹3.4 Cr)', time: 'Just now', tag: 'STAGE MOVE' },
      { text: 'Decision Maker verified: Priya Nair (VP Strategy)', time: '1m ago', tag: 'DEDUP PASS' },
      { text: 'Follow-up scheduled: CloudScale Systems (Due Thursday)', time: '3m ago', tag: 'AUTO CADENCE' },
      { text: 'Automated EOD digest compiled for Enterprise Territory', time: '5m ago', tag: 'EOD SYNTHESIS' },
      { text: 'Strategic MoU executed: FinEdge Global (₹5.2 Cr Annual)', time: '8m ago', tag: 'CLOSED' },
    ],
    []
  )

  // Interactive Hero Demo State
  const [heroSearchTerm, setHeroSearchTerm] = React.useState('')
  const [heroFilter, setHeroFilter] = React.useState<'all' | 'priority' | 'urgent'>('all')
  const [selectedHeroAccount, setSelectedHeroAccount] = React.useState<number>(0)

  // Phase 02 Interactive Cadence simulator state
  const [simulatedOutcome, setSimulatedOutcome] = React.useState<
    'connected' | 'gatekeeper' | 'unreachable'
  >('connected')

  // Phase 03 Interactive Kanban deal stage state
  const [simulatedDealStage, setSimulatedDealStage] = React.useState<number>(2) // 0: Assigned, 1: Pitch, 2: MoU Review, 3: Executed

  // Phase 04 WhatsApp copy toast state
  const [hasCopiedWhatsApp, setHasCopiedWhatsApp] = React.useState(false)

  // Telemetry loop
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTelemetryEventIndex((prev) => (prev + 1) % telemetryEvents.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [telemetryEvents.length])

  // Scrollytelling auto-advance timer with progress bar
  React.useEffect(() => {
    if (!isAutoCycling) return

    const interval = 50 // ms
    const step = (interval / 6000) * 100 // 6 second cycle

    const timer = setInterval(() => {
      setPhaseProgress((prev) => {
        if (prev >= 100) {
          setActivePhaseIndex((idx) => (idx + 1) % SCROLLY_PHASES.length)
          return 0
        }
        return prev + step
      })
    }, interval)

    return () => clearInterval(timer)
  }, [isAutoCycling])

  // Calculated ROI values
  const hoursSavedWeekly = teamSize * 3.5
  const hoursSavedAnnual = Math.round(hoursSavedWeekly * 50)
  const savedSlippageCr = (((teamSize * avgDealValue * 1.8) * 0.14) / 100).toFixed(2)

  // Hero sample accounts depending on industry
  const heroAccounts = React.useMemo(() => {
    switch (selectedIndustry) {
      case 'fintech':
        return [
          {
            name: 'PayFlow Global Settlements',
            stakeholder: 'Rohan Deshmukh',
            role: 'Head of Enterprise Treasury',
            value: '₹4.80 Cr',
            stage: 'MoU Legal Review',
            stageNum: 6,
            cadence: 'Due Thursday 11 AM',
            priority: true,
            status: 'On Track',
          },
          {
            name: 'FinEdge Capital Partners',
            stakeholder: 'Sneha Kapoor',
            role: 'VP Capital Markets',
            value: '₹3.20 Cr',
            stage: 'Executive Demo',
            stageNum: 5,
            cadence: 'Connected · 3-Day Cycle',
            priority: false,
            status: 'On Track',
          },
          {
            name: 'Apex Institutional Clearing',
            stakeholder: 'Mandar Kulkarni',
            role: 'Chief Risk Officer',
            value: '₹7.50 Cr',
            stage: 'Commercial Review',
            stageNum: 7,
            cadence: 'Overdue · Immediate Touch',
            priority: true,
            status: 'Urgent',
          },
        ]
      case 'healthcare':
        return [
          {
            name: 'Max Healthcare Network',
            stakeholder: 'Dr. Sandeep Budhiraja',
            role: 'Group Medical Director',
            value: '₹3.60 Cr',
            stage: 'MoU Legal Review',
            stageNum: 6,
            cadence: 'Due Friday 2 PM',
            priority: true,
            status: 'On Track',
          },
          {
            name: 'Fortis Healthcare Alliances',
            stakeholder: 'Dr. Bishnu Panigrahi',
            role: 'Chief Medical Officer',
            value: '₹2.80 Cr',
            stage: 'Executive Demo',
            stageNum: 5,
            cadence: 'Connected · 3-Day Cycle',
            priority: false,
            status: 'On Track',
          },
          {
            name: 'Apollo Hospital Enterprises',
            stakeholder: 'Dr. Sangita Reddy',
            role: 'Joint Managing Director',
            value: '₹8.10 Cr',
            stage: 'Commercial Review',
            stageNum: 7,
            cadence: 'Due Today 5 PM',
            priority: true,
            status: 'Urgent',
          },
        ]
      case 'tech':
        return [
          {
            name: 'Nexus Cloud Infrastructure',
            stakeholder: 'Kartik Varma',
            role: 'VP Strategic Alliances',
            value: '₹5.50 Cr',
            stage: 'MoU Legal Review',
            stageNum: 6,
            cadence: 'Due Wednesday 10 AM',
            priority: true,
            status: 'On Track',
          },
          {
            name: 'DataScale Systems Global',
            stakeholder: 'Devika Menon',
            role: 'Head of Global Partnerships',
            value: '₹3.90 Cr',
            stage: 'Executive Demo',
            stageNum: 5,
            cadence: 'Connected · 3-Day Cycle',
            priority: false,
            status: 'On Track',
          },
          {
            name: 'Quantum AI Enterprise Labs',
            stakeholder: 'Dr. Arvind Swaminathan',
            role: 'Chief Technology Officer',
            value: '₹6.20 Cr',
            stage: 'Commercial Review',
            stageNum: 7,
            cadence: 'Action Required',
            priority: true,
            status: 'Urgent',
          },
        ]
      default:
        return [
          {
            name: 'Apex Global Logistics Corp',
            stakeholder: 'Vikramaditya Sengupta',
            role: 'Chief Commercial Officer',
            value: '₹4.20 Cr',
            stage: 'MoU Legal Review',
            stageNum: 6,
            cadence: 'Due Tomorrow 11 AM',
            priority: true,
            status: 'On Track',
          },
          {
            name: 'CloudScale Enterprise Systems',
            stakeholder: 'Priya Nair',
            role: 'VP Strategy & Operations',
            value: '₹2.40 Cr',
            stage: 'Executive Pitch',
            stageNum: 5,
            cadence: 'Connected · 3-Day Cycle',
            priority: false,
            status: 'On Track',
          },
          {
            name: 'Horizon Infrastructure Network',
            stakeholder: 'Rahul Mehta',
            role: 'Managing Director',
            value: '₹5.80 Cr',
            stage: 'Commercial Review',
            stageNum: 7,
            cadence: 'Due Today 4 PM',
            priority: true,
            status: 'Urgent',
          },
        ]
    }
  }, [selectedIndustry])

  const filteredHeroAccounts = heroAccounts.filter((acc) => {
    if (heroSearchTerm && !acc.name.toLowerCase().includes(heroSearchTerm.toLowerCase())) {
      return false
    }
    if (heroFilter === 'priority') return acc.priority
    if (heroFilter === 'urgent') return acc.status === 'Urgent'
    return true
  })

  const copyWhatsAppBrief = () => {
    const briefText = `📊 *LEADWISE EXECUTIVE PARTNERSHIP DISPATCH*
Date: ${new Date().toISOString().split('T')[0]} | Pipeline: Pan-India High Ticket B2B
───────────────────────
• Verified Touches Completed: 28 Calls · 4 Executive Demos
• Critical Stage Moves: 3 Accounts Advanced to MoU Legal Review
• Active Pipeline Volume: ₹24.85 Cr Monitored
• Overdue Cadences: 0 Accounts (100% Cadence SLA Compliance)
───────────────────────
_Generated via Leadwise Institutional Outreach Console_`

    if (navigator.clipboard) {
      navigator.clipboard.writeText(briefText)
      setHasCopiedWhatsApp(true)
      setTimeout(() => setHasCopiedWhatsApp(false), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-foreground selection:bg-primary/20 selection:text-primary font-sans antialiased overflow-x-hidden">
      {/* ── Top Live Telemetry Ticker ────────────────────────────────────────── */}
      <div className="bg-surface-panel/95 border-b border-border/70 py-1.5 px-4 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold tracking-wider uppercase shrink-0 border border-primary/20">
              <Radio className="size-3 animate-pulse" aria-hidden="true" />
              Live Telemetry
            </span>
            <div className="text-muted-foreground truncate text-[11px] flex items-center gap-2">
              <span className="text-foreground font-medium">
                {telemetryEvents[telemetryEventIndex].text}
              </span>
              <span className="text-border">•</span>
              <span className="text-muted-foreground/70 text-[10px]">
                {telemetryEvents[telemetryEventIndex].time}
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-[11px] text-muted-foreground shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse"></span>
              99.98% System Uptime
            </span>
            <span className="text-border">|</span>
            <span className="text-foreground font-medium">SOC-2 Type II Verified</span>
          </div>
        </div>
      </div>

      {/* ── Sticky Top Navigation Bar ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-surface-panel/85 backdrop-blur-md transition-[background-color,border-color] duration-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/landing" className="flex items-center gap-3.5 group">
              <Image
                src="/logo-white-text.png"
                alt="Leadwise"
                width={160}
                height={44}
                className="h-9 sm:h-10 w-auto object-contain hidden dark:block"
                priority
              />
              <Image
                src="/logo-dark-text.png"
                alt="Leadwise"
                width={160}
                height={44}
                className="h-9 sm:h-10 w-auto object-contain block dark:hidden"
                priority
              />
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-surface-elevated text-primary border border-primary/20 font-medium">
                Enterprise v1.2
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <a
                href="#interactive-sandbox"
                className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-surface-elevated/60 transition-[background-color,color] duration-150"
              >
                Live Sandbox
              </a>
              <a
                href="#scrollytelling"
                className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-surface-elevated/60 transition-[background-color,color] duration-150"
              >
                Workflow Engine
              </a>
              <a
                href="#bento"
                className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-surface-elevated/60 transition-[background-color,color] duration-150"
              >
                Capabilities
              </a>
              <a
                href="#comparison"
                className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-surface-elevated/60 transition-[background-color,color] duration-150"
              >
                Why Leadwise
              </a>
              <a
                href="#calculator"
                className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-surface-elevated/60 transition-[background-color,color] duration-150"
              >
                Yield Calculator
              </a>
              <a
                href="#specifications"
                className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-surface-elevated/60 transition-[background-color,color] duration-150"
              >
                Security &amp; Specs
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md transition-colors duration-150"
            >
              Sign In
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary-hover px-3.5 py-1.5 rounded-md shadow-xs transition-[background-color,transform] duration-150 active:scale-[0.98]"
            >
              <span>Launch Console</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── High-Velocity Modern Hero Section ──────────────────────────────── */}
      <section className="relative pt-16 pb-20 sm:pt-20 sm:pb-28 border-b border-border/60 overflow-hidden">
        {/* Anti-slop clean geometric grid backdrop */}
        <div className="absolute inset-0 bg-grid-subtle opacity-20 pointer-events-none"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-primary/[0.06] via-primary/[0.01] to-transparent pointer-events-none"></div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Eyebrow badge with live pulse */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-border text-xs font-mono text-muted-foreground shadow-xs">
            <span className="size-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-foreground font-medium">B2B Sales &amp; Strategic Outreach</span>
            <span className="text-border">•</span>
            <span className="text-primary font-semibold">Zero-Slippage Architecture</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance max-w-4xl mx-auto leading-[1.12]">
            The high-velocity outreach intelligence platform for strategic B2B partnerships.
          </h1>

          {/* Sub-headline */}
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed text-pretty">
            Orchestrate complex multi-stakeholder deals, map executive decision-makers, and enforce
            mathematical cadence discipline across high-ticket sales pipelines. Replace bloated legacy
            CRMs and fragmented spreadsheets with a surgical execution engine.
          </p>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary-hover px-6 py-3.5 rounded-lg shadow-sm transition-[background-color,transform] duration-150 active:scale-[0.98] group"
            >
              <span>Launch Command Center</span>
              <ArrowRight
                className="size-4 group-hover:translate-x-0.5 transition-transform duration-150"
                aria-hidden="true"
              />
            </Link>

            <a
              href="#interactive-sandbox"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-surface-card hover:bg-surface-elevated border border-border px-5 py-3.5 rounded-lg shadow-xs transition-[background-color,border-color] duration-150"
            >
              <Layers className="size-4 text-primary" aria-hidden="true" />
              <span>Explore Live Sandbox</span>
            </a>
          </div>

          {/* Interactive Industry Switcher Pills */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
            <span className="text-muted-foreground mr-1 text-[11px]">Engineered For:</span>
            {[
              { key: 'enterprise', label: 'Enterprise Tech & SaaS' },
              { key: 'fintech', label: 'FinTech & Capital Markets' },
              { key: 'healthcare', label: 'Healthcare & Life Sciences' },
              { key: 'tech', label: 'Strategic B2B Alliances' },
            ].map((ind) => (
              <button
                key={ind.key}
                type="button"
                onClick={() => setSelectedIndustry(ind.key as any)}
                className={`px-3 py-1 rounded-full border transition-[background-color,border-color,color] duration-150 cursor-pointer ${
                  selectedIndustry === ind.key
                    ? 'bg-primary/10 border-primary text-primary font-semibold'
                    : 'bg-surface-panel border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {ind.label}
              </button>
            ))}
          </div>

          {/* ── Interactive Hero Product Console Sandbox ─────────────────────── */}
          <div id="interactive-sandbox" className="pt-8 text-left">
            <div className="rounded-xl border border-border bg-surface-panel shadow-2xl overflow-hidden">
              {/* Window Titlebar */}
              <div className="px-4 py-3 bg-surface-card border-b border-border flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-rose-500/80"></div>
                  <div className="size-3 rounded-full bg-amber-500/80"></div>
                  <div className="size-3 rounded-full bg-emerald-500/80"></div>
                  <span className="text-xs font-mono text-muted-foreground ml-2 border-l border-border pl-3 hidden sm:inline">
                    leadwise.console / production-cluster
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-panel border border-border text-muted-foreground text-[11px]">
                    <Command className="size-3 text-primary" />
                    <span>K to Command</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
                    ● SLA Active
                  </span>
                </div>
              </div>

              {/* Console Toolbar */}
              <div className="p-4 border-b border-border bg-surface-panel/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                <div className="relative flex-1 max-w-sm">
                  <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search active enterprise accounts..."
                    value={heroSearchTerm}
                    onChange={(e) => setHeroSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-md bg-surface-elevated border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 font-mono"
                  />
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => setHeroFilter('all')}
                    className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                      heroFilter === 'all'
                        ? 'bg-primary/10 border-primary text-primary font-medium'
                        : 'bg-surface-elevated border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All ({heroAccounts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroFilter('priority')}
                    className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                      heroFilter === 'priority'
                        ? 'bg-primary/10 border-primary text-primary font-medium'
                        : 'bg-surface-elevated border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    High Priority
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroFilter('urgent')}
                    className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                      heroFilter === 'urgent'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-medium'
                        : 'bg-surface-elevated border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Needs Action
                  </button>
                </div>
              </div>

              {/* Interactive Accounts List & Inspection Drawer */}
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
                {/* Account Rows (8 cols) */}
                <div className="lg:col-span-8 p-3 sm:p-4 space-y-2 max-h-[380px] overflow-y-auto">
                  {filteredHeroAccounts.map((acc, index) => {
                    const isSelected = selectedHeroAccount === index
                    return (
                      <div
                        key={acc.name}
                        onClick={() => setSelectedHeroAccount(index)}
                        className={`p-3.5 rounded-lg border transition-[background-color,border-color,box-shadow] duration-150 cursor-pointer ${
                          isSelected
                            ? 'bg-surface-card border-primary/50 shadow-xs'
                            : 'bg-surface-panel/60 border-border/80 hover:bg-surface-card hover:border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">
                                {acc.name}
                              </span>
                              {acc.status === 'Urgent' ? (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                                  Action Required
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Cadence In-SLA
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                              <span>
                                {acc.stakeholder} ({acc.role})
                              </span>
                            </div>
                          </div>

                          <div className="text-right space-y-1 shrink-0 font-mono">
                            <span className="text-sm font-bold text-foreground block">
                              {acc.value}
                            </span>
                            <span className="text-[10px] text-primary block">
                              {acc.stage}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 text-muted-foreground" />
                            <span>{acc.cadence}</span>
                          </span>
                          <span className="text-primary hover:underline flex items-center gap-1">
                            <span>Inspect Intelligence Dossier</span>
                            <ChevronRight className="size-3" />
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Account Inspection Panel (4 cols) */}
                <div className="lg:col-span-4 p-4 sm:p-5 bg-surface-card flex flex-col justify-between space-y-4">
                  {heroAccounts[selectedHeroAccount] && (
                    <div className="space-y-4 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-primary uppercase font-semibold tracking-wider block">
                          Selected Dossier
                        </span>
                        <h4 className="text-base font-bold text-foreground mt-0.5">
                          {heroAccounts[selectedHeroAccount].name}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          Annual Contract Value: {heroAccounts[selectedHeroAccount].value}
                        </span>
                      </div>

                      <div className="p-3 rounded bg-surface-panel border border-border space-y-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase block">
                          Verified Decision Maker
                        </span>
                        <span className="text-foreground font-semibold block">
                          {heroAccounts[selectedHeroAccount].stakeholder}
                        </span>
                        <span className="text-muted-foreground block text-[11px]">
                          {heroAccounts[selectedHeroAccount].role}
                        </span>
                        <div className="pt-1 flex items-center gap-1 text-[11px] text-emerald-400">
                          <Check className="size-3" />
                          <span>Direct Phone Verified (E.164 Clean)</span>
                        </div>
                      </div>

                      <div className="p-3 rounded bg-surface-panel border border-border space-y-2">
                        <span className="text-[10px] text-muted-foreground uppercase block">
                          Enforced Cadence Rule
                        </span>
                        <div className="text-[11px] text-foreground">
                          {heroAccounts[selectedHeroAccount].cadence}
                        </div>
                        <div className="w-full bg-surface-elevated h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              heroAccounts[selectedHeroAccount].status === 'Urgent'
                                ? 'bg-rose-500 w-[92%]'
                                : 'bg-primary w-[65%]'
                            }`}
                          ></div>
                        </div>
                      </div>

                      <Link
                        href="/login"
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold shadow-xs transition-colors"
                      >
                        <Zap className="size-3.5" />
                        <span>Open Account In Live Console</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Floating Key Metrics Grid */}
          <div className="pt-8 border-t border-border/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-xl border border-border bg-surface-panel/80 hover:border-primary/40 transition-[border-color] duration-150 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp className="size-8 text-primary" />
              </div>
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
                Active Volume
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums block mt-1">
                ₹24.8 Cr+
              </span>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
                <Check className="size-3" aria-hidden="true" />
                <span>Live stage tracking</span>
              </span>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface-panel/80 hover:border-primary/40 transition-[border-color] duration-150 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <UserCheck className="size-8 text-primary" />
              </div>
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
                Reach Velocity
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums block mt-1">
                86.4%
              </span>
              <span className="text-[11px] text-primary font-medium flex items-center gap-1 mt-1">
                <Sparkles className="size-3" aria-hidden="true" />
                <span>Direct C-suite access</span>
              </span>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface-panel/80 hover:border-primary/40 transition-[border-color] duration-150 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock className="size-8 text-primary" />
              </div>
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
                Cadence SLA
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums block mt-1">
                Zero Decay
              </span>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
                <Check className="size-3" aria-hidden="true" />
                <span>Automated next follow-ups</span>
              </span>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface-panel/80 hover:border-primary/40 transition-[border-color] duration-150 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShieldCheck className="size-8 text-primary" />
              </div>
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
                Governance
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums block mt-1">
                SOC-2 &amp; RBAC
              </span>
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-1">
                <Lock className="size-3" aria-hidden="true" />
                <span>Immutable audit trail</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Scrollytelling Interactive Journey Section ──────────────────────── */}
      <section
        id="scrollytelling"
        className="py-24 border-b border-border/60 bg-surface-panel/20 relative"
        onMouseEnter={() => setIsAutoCycling(false)}
        onMouseLeave={() => setIsAutoCycling(true)}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              <Compass className="size-3.5" aria-hidden="true" />
              <span>Interactive Scrollytelling Storyline</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
              The 4 phases of disciplined B2B pipeline execution.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-pretty">
              Step through how Leadwise systematically transforms fragmented prospect leads into
              synchronized, closed-won enterprise partnerships. Click or watch the progression.
            </p>
          </div>

          {/* Scrollytelling Layout: Interactive Step Selector + Sticky Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Interactive Story Steps */}
            <div className="lg:col-span-5 space-y-4">
              {SCROLLY_PHASES.map((phase, idx) => {
                const isActive = activePhaseIndex === idx
                return (
                  <div
                    key={phase.id}
                    onClick={() => {
                      setActivePhaseIndex(idx)
                      setPhaseProgress(0)
                      setIsAutoCycling(false)
                    }}
                    className={`p-5 rounded-xl border transition-[background-color,border-color,box-shadow,transform] duration-200 cursor-pointer text-left space-y-2.5 relative overflow-hidden ${
                      isActive
                        ? 'bg-surface-panel border-primary shadow-md translate-x-1'
                        : 'bg-surface-panel/40 border-border/80 hover:bg-surface-panel hover:border-border'
                    }`}
                  >
                    {/* Active phase progress bar */}
                    {isActive && (
                      <div
                        className="absolute top-0 left-0 h-1 bg-primary transition-all duration-75"
                        style={{ width: `${phaseProgress}%` }}
                      ></div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-elevated text-primary border border-primary/20">
                        {phase.step}
                      </span>
                      <span
                        className={`text-xs font-mono font-medium ${
                          isActive ? 'text-emerald-400' : 'text-muted-foreground'
                        }`}
                      >
                        {phase.badgeText}
                      </span>
                    </div>

                    <h3 className="font-display text-base font-bold text-foreground">
                      {phase.title}
                    </h3>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {phase.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {phase.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-card border border-border text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right Column: Sticky Live Interactive Console Preview */}
            <div className="lg:col-span-7 sticky top-24 rounded-xl border border-border bg-surface-panel shadow-2xl overflow-hidden">
              {/* Window Bar */}
              <div className="flex items-center justify-between p-3.5 sm:px-5 border-b border-border bg-surface-card">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-rose-500/80"></div>
                  <div className="size-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="size-2.5 rounded-full bg-emerald-500/80"></div>
                  <span className="text-xs font-mono text-muted-foreground border-l border-border pl-3">
                    leadwise.runtime/{currentPhase.id}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    KPI Target: <strong className="text-emerald-400">{currentPhase.metricValue}</strong>
                  </span>
                </div>
              </div>

              {/* Dynamic Console Viewport */}
              <div className="p-6 sm:p-8 bg-canvas min-h-[460px] flex flex-col justify-between">
                {/* Phase 01: Mapping Console */}
                {activePhaseIndex === 0 && (
                  <div className="space-y-5 animate-slide-up">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div>
                        <span className="text-xs font-mono text-primary font-semibold block">
                          Verified Entity Profile
                        </span>
                        <h4 className="text-base font-bold text-foreground">
                          Apex Global Logistics &amp; Enterprise Systems
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Deduplication Verified
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-lg bg-surface-panel border border-border space-y-1">
                        <span className="text-muted-foreground text-[10px] block">
                          Primary Executive Contact
                        </span>
                        <span className="text-foreground font-semibold block">
                          Vikramaditya Sengupta
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Chief Commercial Officer
                        </span>
                        <span className="text-[10px] text-primary block">
                          vikram@apex-logistics.corp
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-surface-panel border border-border space-y-1">
                        <span className="text-muted-foreground text-[10px] block">
                          Direct Contact Matrix
                        </span>
                        <span className="text-foreground font-semibold block">+91 22 6150 9000</span>
                        <span className="text-[11px] text-emerald-400">
                          ✓ E.164 Clean · Zero Conflict
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Assigned Rep: Senior BD Lead
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-surface-card border border-border space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Network className="size-3.5 text-primary" />
                          Multi-Stakeholder Authority Map
                        </span>
                        <span className="text-muted-foreground">3 Decision Makers Tracked</span>
                      </div>
                      <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground">
                        <div className="flex items-center justify-between p-2 rounded bg-surface-panel">
                          <span>1. Chief Commercial Officer (Economic Buyer)</span>
                          <span className="text-emerald-400">Direct Line Active</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-surface-panel">
                          <span>2. VP Procurement (Commercial Signoff)</span>
                          <span className="text-primary">Evaluation In Progress</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-surface-panel">
                          <span>3. Group Legal Counsel (Contracting)</span>
                          <span className="text-muted-foreground">MoU Stage Pending</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Phase 02: Cadence Console with Interactive Simulator */}
                {activePhaseIndex === 1 && (
                  <div className="space-y-5 animate-slide-up">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div>
                        <span className="text-xs font-mono text-amber-400 font-semibold block">
                          Interactive Cadence Algorithm Tester
                        </span>
                        <h4 className="text-base font-bold text-foreground">
                          Outcome-Driven Next Follow-up Engine
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        14-Day Loop Locked
                      </span>
                    </div>

                    {/* Interactive Outcome Selection */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono text-muted-foreground block">
                        Select Simulated Rep Call Outcome:
                      </span>
                      <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => setSimulatedOutcome('connected')}
                          className={`p-2.5 rounded border text-center transition-colors cursor-pointer ${
                            simulatedOutcome === 'connected'
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold'
                              : 'bg-surface-panel border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Connected
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimulatedOutcome('gatekeeper')}
                          className={`p-2.5 rounded border text-center transition-colors cursor-pointer ${
                            simulatedOutcome === 'gatekeeper'
                              ? 'bg-primary/10 border-primary text-primary font-semibold'
                              : 'bg-surface-panel border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Gatekeeper
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimulatedOutcome('unreachable')}
                          className={`p-2.5 rounded border text-center transition-colors cursor-pointer ${
                            simulatedOutcome === 'unreachable'
                              ? 'bg-rose-500/10 border-rose-500 text-rose-400 font-semibold'
                              : 'bg-surface-panel border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          No Answer
                        </button>
                      </div>
                    </div>

                    {/* Dynamic Simulated Outcome Calculation */}
                    <div className="p-4 rounded-lg bg-surface-panel border border-border space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          {simulatedOutcome === 'connected'
                            ? 'Executive Call Connected · Decision Maker Engaged'
                            : simulatedOutcome === 'gatekeeper'
                            ? 'Executive Assistant / Gatekeeper · Requested Information'
                            : 'Call Unreachable / Voicemail · Automated Retry Triggered'}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Logged 10:30 AM
                        </span>
                      </div>

                      <p className="text-muted-foreground">
                        {simulatedOutcome === 'connected'
                          ? 'Reviewed strategic partnership scope. CCO requested commercial pricing matrix before scheduling executive demo.'
                          : simulatedOutcome === 'gatekeeper'
                          ? 'Executive assistant instructed to send technical integration deck and confirmed follow-up window for Thursday.'
                          : 'Line rang without answer. System logged attempt and immediately queued automated 24-hour cadence touchpoint.'}
                      </p>

                      <div className="p-3 rounded bg-surface-card border border-border/80 flex items-center justify-between font-mono">
                        <span className="text-muted-foreground">Algorithmic Next Touch:</span>
                        <span className="text-emerald-400 font-semibold">
                          {simulatedOutcome === 'connected'
                            ? 'Thursday 11:00 AM (Strict 3-Day SLA)'
                            : simulatedOutcome === 'gatekeeper'
                            ? 'Wednesday 2:30 PM (2-Day Verification)'
                            : 'Tomorrow 10:30 AM (24-Hour Recovery SLA)'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Phase 03: Pipeline Velocity Console with Interactive Deal Mover */}
                {activePhaseIndex === 2 && (
                  <div className="space-y-5 animate-slide-up">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div>
                        <span className="text-xs font-mono text-emerald-400 font-semibold block">
                          Interactive Stage Governance
                        </span>
                        <h4 className="text-base font-bold text-foreground">
                          Multi-Stage Deal Acceleration
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ₹24.8 Cr Monitored
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg border border-border bg-surface-panel space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-semibold text-foreground">
                          Apex Global Logistics (₹4.20 Cr)
                        </span>
                        <span className="text-emerald-400 font-bold">
                          Stage {simulatedDealStage + 1} of 4
                        </span>
                      </div>

                      {/* Interactive Stage Stepper */}
                      <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px]">
                        {[
                          '1. Assigned',
                          '2. Exec Pitch',
                          '3. MoU Legal',
                          '4. Executed Won',
                        ].map((stg, i) => (
                          <button
                            key={stg}
                            type="button"
                            onClick={() => setSimulatedDealStage(i)}
                            className={`py-2 px-1 rounded text-center border transition-colors cursor-pointer ${
                              simulatedDealStage === i
                                ? 'bg-primary border-primary text-primary-foreground font-bold shadow-xs'
                                : i < simulatedDealStage
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
                                : 'bg-surface-card border-border text-muted-foreground'
                            }`}
                          >
                            {stg}
                          </button>
                        ))}
                      </div>

                      <div className="p-3 rounded bg-surface-card border border-border text-xs font-mono space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Weighted Probability:</span>
                          <span className="text-foreground font-semibold">
                            {simulatedDealStage === 0
                              ? '15% (₹0.63 Cr)'
                              : simulatedDealStage === 1
                              ? '45% (₹1.89 Cr)'
                              : simulatedDealStage === 2
                              ? '80% (₹3.36 Cr)'
                              : '100% (₹4.20 Cr Closed)'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Audit Trail Status:</span>
                          <span className="text-emerald-400">Cryptographically Signed</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Phase 04: Synthesis Console with Interactive Copy */}
                {activePhaseIndex === 3 && (
                  <div className="space-y-5 animate-slide-up font-mono">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div>
                        <span className="text-xs text-primary font-semibold block">
                          Instant EOD Intelligence
                        </span>
                        <h4 className="text-base font-bold text-foreground">
                          Executive WhatsApp Digest
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={copyWhatsAppBrief}
                        className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-primary hover:bg-primary-hover text-primary-foreground font-semibold cursor-pointer transition-colors shadow-xs"
                      >
                        <Copy className="size-3" />
                        <span>{hasCopiedWhatsApp ? 'Copied!' : 'Copy WhatsApp Brief'}</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-lg bg-surface-panel border border-border text-xs text-muted-foreground space-y-2 leading-relaxed">
                      <p className="text-foreground font-bold">
                        📊 *LEADWISE PARTNERSHIP DISPATCH — DAILY SYNTHESIS*
                      </p>
                      <p>
                        Date: {new Date().toISOString().split('T')[0]} | Territory: Pan-India Enterprise
                      </p>
                      <p className="text-foreground">
                        • Verified Touches Completed: <strong>28 Calls &amp; 4 Executive Demos</strong>
                        <br />
                        • Key Deals Progressed: <strong>3 Accounts Advanced to MoU Legal Review</strong>
                        <br />
                        • High-Value Pipeline Volume: <strong>₹24.85 Cr Active</strong>
                      </p>
                      <p className="text-[11px] text-emerald-400 border-t border-border pt-2 flex items-center justify-between">
                        <span>✓ Ready for 1-click paste into leadership WhatsApp group</span>
                        {hasCopiedWhatsApp && (
                          <span className="text-foreground font-bold">Copied to clipboard!</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Bottom interactive step controls */}
                <div className="pt-4 border-t border-border flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    {SCROLLY_PHASES.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setActivePhaseIndex(i)
                          setPhaseProgress(0)
                          setIsAutoCycling(false)
                        }}
                        className={`size-2.5 rounded-full transition-[background-color,transform] duration-150 cursor-pointer ${
                          activePhaseIndex === i ? 'bg-primary scale-125' : 'bg-surface-elevated'
                        }`}
                        aria-label={`Jump to step ${i + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActivePhaseIndex((prev) => (prev + 1) % SCROLLY_PHASES.length)
                      setPhaseProgress(0)
                      setIsAutoCycling(false)
                    }}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline cursor-pointer"
                  >
                    <span>Next Phase</span>
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Asymmetric Bento Architecture Grid ───────────────────────────────── */}
      <section id="bento" className="py-24 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              <Sparkles className="size-3.5" aria-hidden="true" />
              <span>Platform Capabilities</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
              Engineered for velocity, discipline, and high-stake precision.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-pretty">
              Every feature exists to eliminate administrative drag and accelerate high-value deal conversion.
            </p>
          </div>

          {/* Asymmetrical Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Bento Card 1: 8-Column Heroic Anchor */}
            <div className="md:col-span-8 rounded-xl border border-border bg-surface-panel p-6 sm:p-8 space-y-5 shadow-xs relative overflow-hidden group hover:border-border-strong transition-colors">
              <div className="flex items-center justify-between">
                <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Flame className="size-5" />
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Cadence Automation
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold text-foreground">
                  Outcome-Driven Automated Follow-up Scheduling
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  When reps log touchpoints, Leadwise inspects the outcome and automatically locks
                  the next follow-up date into the queue. No rep leaves an account without a scheduled
                  action. Overdue tasks visually escalate across the executive dashboard.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-surface-card border border-border grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase block">
                    Cycle Acceleration
                  </span>
                  <span className="text-lg font-bold text-foreground tabular-nums">4.2x Faster</span>
                  <span className="text-[11px] text-emerald-400 block">Deal Progression</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase block">
                    Cadence Discipline
                  </span>
                  <span className="text-lg font-bold text-foreground tabular-nums">100%</span>
                  <span className="text-[11px] text-primary block">Follow-Up Rate</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase block">
                    Lead Dormancy
                  </span>
                  <span className="text-lg font-bold text-foreground tabular-nums">-94%</span>
                  <span className="text-[11px] text-emerald-400 block">Slippage Prevented</span>
                </div>
              </div>
            </div>

            {/* Bento Card 2: 4-Column Conflict Shield */}
            <div className="md:col-span-4 rounded-xl border border-border bg-surface-panel p-6 sm:p-8 space-y-5 shadow-xs hover:border-border-strong transition-colors">
              <div className="size-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Filter className="size-5" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold text-foreground">
                  Cross-Org Conflict Shield
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cross-checks phone numbers, corporate domains, and decision-maker handles in real
                  time. Multiple team members can never pitch the same client uncoordinated.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-surface-card border border-border text-xs font-mono text-muted-foreground space-y-1">
                <span className="text-emerald-400 font-semibold block">✓ Normalized E.164 Phone</span>
                <span className="text-emerald-400 font-semibold block">✓ Fuzzy Corporate Domain Matching</span>
                <span className="text-emerald-400 font-semibold block">✓ Duplicate Review Override</span>
              </div>
            </div>

            {/* Bento Card 3: 4-Column Governance Box */}
            <div className="md:col-span-4 rounded-xl border border-border bg-surface-panel p-6 sm:p-8 space-y-5 shadow-xs hover:border-border-strong transition-colors">
              <div className="size-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <ShieldCheck className="size-5" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold text-foreground">
                  4-Tier RBAC Data Compartments
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Granular permission layers isolate accounts between Owners, Team Leads, Associates,
                  and Interns. Interns cannot see accounts outside their territory.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 text-[11px] font-mono text-muted-foreground">
                <span className="px-2 py-1 rounded bg-surface-card border border-border">OWNER</span>
                <span className="px-2 py-1 rounded bg-surface-card border border-border">TL</span>
                <span className="px-2 py-1 rounded bg-surface-card border border-border">ASSOC</span>
                <span className="px-2 py-1 rounded bg-surface-card border border-border">INTERN</span>
              </div>
            </div>

            {/* Bento Card 4: 8-Column Automated Reporting */}
            <div className="md:col-span-8 rounded-xl border border-border bg-surface-panel p-6 sm:p-8 space-y-5 shadow-xs hover:border-border-strong transition-colors">
              <div className="flex items-center justify-between">
                <div className="size-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FileCheck2 className="size-5" />
                </div>
                <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  Zero Spreadsheets
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold text-foreground">
                  Automated WhatsApp &amp; Slack Daily Dispatch
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Daily touchpoints, calls, and stage advancements are automatically summarized into
                  an executive brief ready for one-click sharing in leadership WhatsApp or Slack groups.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  No End-of-Day Spreadsheets
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  Instant WhatsApp Group Delivery
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  7-Day Velocity Tracking
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Modern Comparison Section (Leadwise vs Legacy CRMs vs Spreadsheets) ── */}
      <section id="comparison" className="py-24 border-b border-border/60 bg-surface-panel/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              <BarChart3 className="size-3.5" aria-hidden="true" />
              <span>Architectural Comparison</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
              Why high-performing B2B teams switch to Leadwise.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-pretty">
              Legacy CRMs require hundreds of form fields and complex consultants. Leadwise is
              engineered as a lean, surgical outreach instrument.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-panel overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface-card border-b border-border text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="py-4 px-6 font-semibold">Capability</th>
                    <th className="py-4 px-6 font-bold text-primary bg-primary/5 border-x border-primary/20">
                      Leadwise Outreach Platform
                    </th>
                    <th className="py-4 px-6 font-medium">Legacy Bloated CRMs</th>
                    <th className="py-4 px-6 font-medium">Google Sheets / Excel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-foreground">
                  <tr className="hover:bg-surface-elevated/40 transition-colors">
                    <td className="py-4 px-6 font-semibold">Follow-Up Cadence Enforcement</td>
                    <td className="py-4 px-6 text-emerald-400 font-bold bg-primary/5 border-x border-primary/20">
                      ✓ Algorithmic next dates auto-locked
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">Manual task creation</td>
                    <td className="py-4 px-6 text-rose-400">None (leads decay silently)</td>
                  </tr>

                  <tr className="hover:bg-surface-elevated/40 transition-colors">
                    <td className="py-4 px-6 font-semibold">Decision-Maker Mapping</td>
                    <td className="py-4 px-6 text-emerald-400 font-bold bg-primary/5 border-x border-primary/20">
                      ✓ First-class C-suite hierarchy &amp; phone deduplication
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">Buried in generic contact tables</td>
                    <td className="py-4 px-6 text-rose-400">Messy duplicate columns</td>
                  </tr>

                  <tr className="hover:bg-surface-elevated/40 transition-colors">
                    <td className="py-4 px-6 font-semibold">Daily EOD Reporting Time</td>
                    <td className="py-4 px-6 text-emerald-400 font-bold bg-primary/5 border-x border-primary/20">
                      ✓ 0 minutes (1-click WhatsApp digest)
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">45+ mins manual logging</td>
                    <td className="py-4 px-6 text-rose-400">Tedious manual typing</td>
                  </tr>

                  <tr className="hover:bg-surface-elevated/40 transition-colors">
                    <td className="py-4 px-6 font-semibold">Territory Conflict Prevention</td>
                    <td className="py-4 px-6 text-emerald-400 font-bold bg-primary/5 border-x border-primary/20">
                      ✓ Real-time cross-org domain &amp; phone shield
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">Expensive third-party plugins</td>
                    <td className="py-4 px-6 text-rose-400">Reps routinely double-pitch</td>
                  </tr>

                  <tr className="hover:bg-surface-elevated/40 transition-colors">
                    <td className="py-4 px-6 font-semibold">Audit &amp; Compliance Trail</td>
                    <td className="py-4 px-6 text-emerald-400 font-bold bg-primary/5 border-x border-primary/20">
                      ✓ Immutable cryptographic ledger + Google Drive backups
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">Complex paid enterprise add-ons</td>
                    <td className="py-4 px-6 text-rose-400">Accidental cell deletion risks</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive ROI Impact Calculator Section ──────────────────────── */}
      <section id="calculator" className="py-24 border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              <Sliders className="size-3.5" aria-hidden="true" />
              <span>Operational Yield Model</span>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground text-balance">
              Calculate the direct revenue impact on your BD team.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Adjust your team parameters to see estimated hours reclaimed and pipeline slippage prevented.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-panel p-6 sm:p-10 shadow-lg grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Sliders */}
            <div className="md:col-span-7 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Active Territory Sales Reps:</span>
                  <span className="text-foreground font-bold tabular-nums text-sm">
                    {teamSize} Associates
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="50"
                  value={teamSize}
                  onChange={(e) => setTeamSize(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-surface-elevated appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>2 Reps</span>
                  <span>25 Reps</span>
                  <span>50 Reps</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Average Enterprise Deal Value:</span>
                  <span className="text-foreground font-bold tabular-nums text-sm">
                    ₹{avgDealValue} Lakhs
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="250"
                  step="5"
                  value={avgDealValue}
                  onChange={(e) => setAvgDealValue(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-surface-elevated appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>₹15 Lakhs</span>
                  <span>₹1.25 Cr</span>
                  <span>₹2.50 Cr</span>
                </div>
              </div>
            </div>

            {/* Calculated Yield Box */}
            <div className="md:col-span-5 rounded-lg border border-border bg-surface-card p-6 space-y-4 font-mono">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider block border-b border-border pb-2">
                Annual Operational Yield
              </span>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Admin Hours Reclaimed:
                  </span>
                  <span className="text-2xl font-bold text-foreground tabular-nums">
                    {hoursSavedAnnual} hrs/yr
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    ({hoursSavedWeekly} hrs/wk saved on EOD assembling)
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Prevented Pipeline Slippage:
                  </span>
                  <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                    ₹{savedSlippageCr} Cr
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    14% prevented deal dormancy rate
                  </span>
                </div>
              </div>

              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary-hover py-2.5 px-4 rounded-md transition-colors shadow-xs"
              >
                <span>Deploy Leadwise in Your Organization</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Security & Specifications Matrix ─────────────────────────────────── */}
      <section id="specifications" className="py-24 border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              <span>Enterprise Procurement Matrix</span>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground text-balance">
              Institutional security &amp; specifications.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every deployment meets strict enterprise IT compliance and security requirements out of the box.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-panel overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-surface-card border-b border-border text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-5 font-medium">Architecture Specification</th>
                  <th className="py-3.5 px-5 font-medium">Implementation Standard</th>
                  <th className="py-3.5 px-5 font-medium text-right">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-foreground">
                <tr className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3.5 px-5 font-semibold">Data Encryption at Rest</td>
                  <td className="py-3.5 px-5 text-muted-foreground">
                    AES-256 GCM on all persistent database records and credentials
                  </td>
                  <td className="py-3.5 px-5 text-right text-emerald-400 font-semibold">Verified</td>
                </tr>
                <tr className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3.5 px-5 font-semibold">Data Encryption in Transit</td>
                  <td className="py-3.5 px-5 text-muted-foreground">
                    TLS 1.3 enforced with strict HSTS (max-age 63072000)
                  </td>
                  <td className="py-3.5 px-5 text-right text-emerald-400 font-semibold">Verified</td>
                </tr>
                <tr className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3.5 px-5 font-semibold">Access Boundaries (RBAC)</td>
                  <td className="py-3.5 px-5 text-muted-foreground">
                    Strict Owner / Team Lead / Associate / Intern role boundaries
                  </td>
                  <td className="py-3.5 px-5 text-right text-emerald-400 font-semibold">Enforced</td>
                </tr>
                <tr className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3.5 px-5 font-semibold">Disaster Recovery (DR)</td>
                  <td className="py-3.5 px-5 text-muted-foreground">
                    Automated PostgreSQL binary dump snapshotting to Google Drive
                  </td>
                  <td className="py-3.5 px-5 text-right text-emerald-400 font-semibold">Scheduled</td>
                </tr>
                <tr className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3.5 px-5 font-semibold">Single Sign-On (SSO)</td>
                  <td className="py-3.5 px-5 text-muted-foreground">
                    SAML 2.0 / Okta / Azure AD Enterprise Directory integration
                  </td>
                  <td className="py-3.5 px-5 text-right text-emerald-400 font-semibold">Ready</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Modern High-Impact Closing CTA ──────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden bg-surface-panel/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground text-balance leading-tight">
            Transform high-value B2B outreach from chaotic spreadsheets to an institutional intelligence platform.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Join modern enterprise sales organizations and strategic business development teams operating on Leadwise.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary-hover px-7 py-3.5 rounded-lg shadow-sm transition-[background-color,transform] duration-150 active:scale-[0.98] group"
            >
              <span>Access Command Center</span>
              <ArrowRight
                className="size-4 group-hover:translate-x-0.5 transition-transform duration-150"
                aria-hidden="true"
              />
            </Link>

            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-surface-card hover:bg-surface-elevated border border-border px-6 py-3.5 rounded-lg shadow-xs transition-[background-color,border-color] duration-150"
            >
              <span>Request Territory Access</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Institutional Modern Footer ─────────────────────────────────────── */}
      <footer className="border-t border-border/80 bg-surface-panel py-12 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <Image
              src="/footer-logo-white.png"
              alt="Leadwise by HVT"
              width={180}
              height={58}
              className="h-12 sm:h-14 w-auto object-contain hidden dark:block"
            />
            <Image
              src="/footer-logo-dark.png"
              alt="Leadwise by HVT"
              width={180}
              height={58}
              className="h-12 sm:h-14 w-auto object-contain block dark:hidden"
            />
            <span className="text-border">|</span>
            <span className="font-mono text-xs">Enterprise Outreach Intelligence</span>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Console Sign In
            </Link>
            <a href="#specifications" className="hover:text-foreground transition-colors">
              Security Matrix
            </a>
            <span className="text-emerald-400">● 99.98% System Uptime</span>
          </div>

          <div className="text-[11px] font-mono text-muted-foreground">
            © {new Date().getFullYear()} Leadwise CRM. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
