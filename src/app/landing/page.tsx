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
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  ExternalLink,
  FileCheck2,
  FileText,
  Filter,
  Globe,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  Network,
  Phone,
  Play,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react'

// ── Interactive Simulator State Types ───────────────────────────────────────

type SimulatorTab = 'pipeline' | 'dossier' | 'cadence' | 'governance'

export default function LandingPage() {
  const [activeTab, setActiveTab] = React.useState<SimulatorTab>('pipeline')
  const [teamSize, setTeamSize] = React.useState<number>(8)
  const [dealSize, setDealSize] = React.useState<number>(45) // in Lakhs

  // Calculated ROI values
  const hoursSaved = teamSize * 3.5 // 3.5 hours saved per rep per week on EOD + reporting
  const pipelineCapacity = Math.round(teamSize * dealSize * 1.8) // Total pipeline velocity capacity
  const preventedSlippage = Math.round(pipelineCapacity * 0.14) // 14% prevented deal decay

  return (
    <div className="min-h-screen bg-canvas text-foreground selection:bg-primary/20 selection:text-primary font-sans antialiased overflow-x-hidden">
      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-surface-panel/85 backdrop-blur-md transition-[background-color,border-color] duration-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/landing" className="flex items-center gap-3 group">
              <Image
                src="/logo-white-text.png"
                alt="Leadwise"
                width={130}
                height={34}
                className="h-8 w-auto object-contain hidden dark:block"
                priority
              />
              <Image
                src="/logo-dark-text.png"
                alt="Leadwise"
                width={130}
                height={34}
                className="h-8 w-auto object-contain block dark:hidden"
                priority
              />
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-surface-elevated text-primary border border-primary/20 font-medium">
                Enterprise v1.2
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <a
                href="#simulator"
                className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-surface-elevated/60 transition-[background-color,color] duration-150"
              >
                Product Console
              </a>
              <a
                href="#architecture"
                className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-surface-elevated/60 transition-[background-color,color] duration-150"
              >
                Architecture
              </a>
              <a
                href="#governance"
                className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-surface-elevated/60 transition-[background-color,color] duration-150"
              >
                Governance
              </a>
              <a
                href="#calculator"
                className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-surface-elevated/60 transition-[background-color,color] duration-150"
              >
                ROI Impact
              </a>
              <a
                href="#specifications"
                className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-surface-elevated/60 transition-[background-color,color] duration-150"
              >
                Security & Specs
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border border-border bg-surface-card text-[11px] font-mono text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-foreground font-medium">SOC-2 Aligned</span>
            </div>

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

      {/* ── Hero Section ───────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-border/60 overflow-hidden">
        <div className="absolute inset-0 bg-grid-subtle opacity-20 pointer-events-none"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-48 bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none"></div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-border text-xs font-mono text-muted-foreground shadow-xs">
            <span className="size-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-foreground font-medium">Healthcare BD & Clinical Outreach</span>
            <span className="text-border">•</span>
            <span className="text-primary font-semibold">Institutional Command Suite</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance max-w-4xl mx-auto leading-[1.12]">
            Strategic outreach intelligence for healthcare BD and clinical partnerships.
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed text-pretty">
            Orchestrate high-stakes hospital relationships, map key clinical decision-makers, and
            execute synchronized touchpoint cadences with mathematical discipline and zero deal slippage.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary-hover px-6 py-3 rounded-lg shadow-sm transition-[background-color,transform] duration-150 active:scale-[0.98] group"
            >
              <span>Enter Executive Command Center</span>
              <ArrowRight
                className="size-4 group-hover:translate-x-0.5 transition-transform duration-150"
                aria-hidden="true"
              />
            </Link>

            <a
              href="#simulator"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-surface-card hover:bg-surface-elevated border border-border px-5 py-3 rounded-lg shadow-xs transition-[background-color,border-color] duration-150"
            >
              <Play className="size-3.5 text-primary" aria-hidden="true" />
              <span>Interactive Console Simulator</span>
            </a>
          </div>

          <div className="pt-8 border-t border-border/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-3.5 rounded-lg border border-border/70 bg-surface-panel/60">
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
                Active Pipeline
              </span>
              <span className="text-xl sm:text-2xl font-bold font-display text-foreground tabular-nums">
                ₹18.4 Cr+
              </span>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <TrendingUp className="size-3" aria-hidden="true" />
                <span>Synchronized tracking</span>
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border/70 bg-surface-panel/60">
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
                Decision Reach
              </span>
              <span className="text-xl sm:text-2xl font-bold font-display text-foreground tabular-nums">
                84.2%
              </span>
              <span className="text-[11px] text-primary font-medium flex items-center gap-1 mt-0.5">
                <UserCheck className="size-3" aria-hidden="true" />
                <span>Direct C-suite access</span>
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border/70 bg-surface-panel/60">
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
                Cadence SLA
              </span>
              <span className="text-xl sm:text-2xl font-bold font-display text-foreground tabular-nums">
                Zero Slippage
              </span>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <ShieldCheck className="size-3" aria-hidden="true" />
                <span>14-day cadence loop</span>
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border/70 bg-surface-panel/60">
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
                Compliance
              </span>
              <span className="text-xl sm:text-2xl font-bold font-display text-foreground tabular-nums">
                SOC-2 & HIPAA
              </span>
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                <Lock className="size-3" aria-hidden="true" />
                <span>Immutable audit trail</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Console Simulator Section ───────────────────────────── */}
      <section id="simulator" className="py-20 border-b border-border/60 bg-surface-panel/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              <Layers className="size-3.5" aria-hidden="true" />
              <span>Interactive System Simulator</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
              Test-drive the actual command console interface.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-pretty">
              Switch through live operational modules below to inspect how Leadwise handles high-volume clinical
              pipelines, executive decision-maker mapping, and automated EOD briefs.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-panel shadow-2xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-6 border-b border-border bg-surface-card gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full bg-rose-500/80"></div>
                  <div className="size-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="size-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
                <span className="text-xs font-mono text-muted-foreground border-l border-border pl-3">
                  leadwise.sentio.internal/console
                </span>
              </div>

              <div className="flex items-center gap-1 bg-surface-panel p-1 rounded-lg border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('pipeline')}
                  className={`px-3 py-1.5 rounded font-medium transition-[background-color,color] duration-150 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'pipeline'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BarChart3 className="size-3.5" aria-hidden="true" />
                  <span>Pipeline Velocity</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('dossier')}
                  className={`px-3 py-1.5 rounded font-medium transition-[background-color,color] duration-150 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'dossier'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Building2 className="size-3.5" aria-hidden="true" />
                  <span>Decision Dossier</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('cadence')}
                  className={`px-3 py-1.5 rounded font-medium transition-[background-color,color] duration-150 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'cadence'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Clock className="size-3.5" aria-hidden="true" />
                  <span>Cadence & EOD</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('governance')}
                  className={`px-3 py-1.5 rounded font-medium transition-[background-color,color] duration-150 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'governance'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  <span>Audit Trail</span>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-8 bg-canvas min-h-[440px]">
              {activeTab === 'pipeline' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border text-xs">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Institutional Territory Pipeline
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Real-time clinical opportunity distribution across synchronized stages
                      </p>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-muted-foreground">
                        Total Deals:{' '}
                        <strong className="text-foreground tabular-nums">42 Active</strong>
                      </span>
                      <span className="text-border">•</span>
                      <span className="text-muted-foreground">
                        Total Volume:{' '}
                        <strong className="text-emerald-400 tabular-nums">₹18.45 Cr</strong>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-3 rounded-lg border border-border bg-surface-panel p-3.5">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-blue-500"></span>
                          Executive Meeting
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-card border border-border text-muted-foreground">
                          3 Deals
                        </span>
                      </div>

                      <div className="p-3 rounded-md border border-border bg-surface-card space-y-2 hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-semibold text-xs text-foreground block">
                              Apollo Hospitals Group
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Bangalore & Hyderabad
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            P1 HIGH
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60">
                          <span className="font-mono text-emerald-400 font-semibold tabular-nums">
                            ₹2.40 Cr
                          </span>
                          <span className="text-muted-foreground font-mono">Follow-up: Today</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-md border border-border bg-surface-card space-y-2 hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-semibold text-xs text-foreground block">
                              Manipal Health Enterprises
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Karnataka Regional
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            P2 MED
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60">
                          <span className="font-mono text-emerald-400 font-semibold tabular-nums">
                            ₹1.15 Cr
                          </span>
                          <span className="text-muted-foreground font-mono">Follow-up: 2d</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-border bg-surface-panel p-3.5">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-violet-500"></span>
                          MoU Legal Review
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-card border border-border text-muted-foreground">
                          2 Deals
                        </span>
                      </div>

                      <div className="p-3 rounded-md border border-border bg-surface-card space-y-2 hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-semibold text-xs text-foreground block">
                              Fortis Healthcare Network
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              NCR Multi-Specialty
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            P1 HIGH
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60">
                          <span className="font-mono text-emerald-400 font-semibold tabular-nums">
                            ₹3.80 Cr
                          </span>
                          <span className="text-muted-foreground font-mono">Legal Desk Signoff</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-border bg-surface-panel p-3.5">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-emerald-500"></span>
                          Partnership Finalized
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-card border border-border text-emerald-400 font-semibold">
                          Active
                        </span>
                      </div>

                      <div className="p-3 rounded-md border border-emerald-500/30 bg-surface-card space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-semibold text-xs text-foreground block">
                              Max Healthcare Institute
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Pan-India Network
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            CLOSED
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60">
                          <span className="font-mono text-emerald-400 font-semibold tabular-nums">
                            ₹5.20 Cr Annual
                          </span>
                          <span className="text-emerald-400 font-mono text-[10px]">
                            Live Integration
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'dossier' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg border border-border bg-surface-panel flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-display font-bold text-primary text-lg">
                        DR
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-foreground">Dr. Rajesh Rao</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Primary Decision Maker
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Chief Medical Director · Apollo Hospitals Enterprise Ltd
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="px-2.5 py-1 rounded bg-surface-card border border-border text-muted-foreground">
                        Territory: <strong className="text-foreground">South Zone</strong>
                      </span>
                      <span className="px-2.5 py-1 rounded bg-surface-card border border-border text-muted-foreground">
                        Status: <strong className="text-primary">In Discussion</strong>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-border bg-surface-card space-y-3">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <UserCheck className="size-4 text-primary" aria-hidden="true" />
                        Verified Executive Contact Matrix
                      </span>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between p-2 rounded bg-surface-panel border border-border/60">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Mail className="size-3.5" aria-hidden="true" />
                            Corporate Email:
                          </span>
                          <span className="text-foreground font-medium">
                            dr.rao@apollohospitals.corp
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-surface-panel border border-border/60">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Phone className="size-3.5" aria-hidden="true" />
                            Direct Boardline:
                          </span>
                          <span className="text-foreground font-medium">+91 80 2630 4000</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-surface-panel border border-border/60">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <ShieldCheck className="size-3.5" aria-hidden="true" />
                            Integrity Check:
                          </span>
                          <span className="text-emerald-400 font-semibold">
                            Deduplication Passed (Unique)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border border-border bg-surface-card space-y-3">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <Activity className="size-4 text-primary" aria-hidden="true" />
                        Chronological Touchpoint Ledger
                      </span>
                      <div className="space-y-2 text-xs">
                        <div className="p-2 rounded bg-surface-panel border border-border/60 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground text-[11px]">
                              Outbound Executive Call
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              Yesterday, 3:15 PM
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Reviewed clinical validation study. Agreed to schedule procurement MoU
                            meeting for Friday 11 AM.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'cadence' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-border bg-surface-panel space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                          <Clock className="size-4 text-amber-400" aria-hidden="true" />
                          Zero-Leak Follow-Up Queue
                        </span>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-card text-foreground">
                          3 Actions Due
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 rounded-md border border-border bg-surface-card space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              Apollo Hospitals Group
                            </span>
                            <span className="font-mono text-[10px] text-rose-400 font-semibold bg-rose-500/10 px-1.5 py-0.5 rounded">
                              DUE TODAY
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Send updated clinical efficacy report deck prior to executive review.
                          </p>
                        </div>

                        <div className="p-2.5 rounded-md border border-border bg-surface-card space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              Narayana Institute of Cardiac Sciences
                            </span>
                            <span className="font-mono text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded">
                              TOMORROW
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Confirm attendee roster for technical integration workshop.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border border-border bg-surface-panel space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                          <MessageSquare className="size-4 text-emerald-400" aria-hidden="true" />
                          Automated EOD Executive Brief
                        </span>
                        <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          1-Click WhatsApp Format
                        </span>
                      </div>

                      <div className="p-3 rounded-md bg-surface-card border border-border font-mono text-[11px] text-muted-foreground leading-relaxed space-y-2">
                        <p className="text-foreground font-semibold">
                          📊 *SENTIO CLINICAL OUTREACH — DAILY DIGEST*
                        </p>
                        <p>Date: 2026-09-14 | Territory: South Regional</p>
                        <p>
                          • Touchpoints Completed: <strong className="text-foreground">18</strong>
                          <br />• Key Decisions Progressed:{' '}
                          <strong className="text-foreground">3</strong>
                          <br />• Total Active Pipeline Value:{' '}
                          <strong className="text-emerald-400">₹18.45 Cr</strong>
                        </p>
                        <p className="text-border">
                          ---------------------------------
                          <br />
                          Ready for broadcast to Leadership Group
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'governance' && (
                <div className="space-y-4 text-xs font-mono">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                      <Shield className="size-4 text-primary" aria-hidden="true" />
                      Tamper-Evident Security Trail
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Cryptographic Event Logging Active
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded border border-border bg-surface-card flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-bold">200 OK</span>
                        <span className="text-foreground font-medium">activity.logged</span>
                        <span className="text-muted-foreground">
                          Harsh Tripathi (OWNER) logged Call with Dr. Rajesh Rao
                        </span>
                      </div>
                      <span className="text-muted-foreground text-[10px]">13:06:51 UTC</span>
                    </div>

                    <div className="p-2.5 rounded border border-border bg-surface-card flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-bold">200 OK</span>
                        <span className="text-foreground font-medium">stage.transition</span>
                        <span className="text-muted-foreground">
                          Apollo Hospitals moved: NEW ➔ CONTACTED
                        </span>
                      </div>
                      <span className="text-muted-foreground text-[10px]">13:06:51 UTC</span>
                    </div>

                    <div className="p-2.5 rounded border border-border bg-surface-card flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-primary font-bold">BACKUP</span>
                        <span className="text-foreground font-medium">database.snapshot</span>
                        <span className="text-muted-foreground">
                          Automated PostgreSQL snapshot synchronized to Google Drive
                        </span>
                      </div>
                      <span className="text-muted-foreground text-[10px]">12:00:00 UTC</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Architecture & Differentiators Bento Section ─────────────────────── */}
      <section id="architecture" className="py-20 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              <Network className="size-3.5" aria-hidden="true" />
              <span>Core Architectural Tenets</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
              Built specifically for clinical BD dynamics.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-pretty">
              Generic sales CRMs fail healthcare teams because medical partnerships require complex
              credentialing, committee approvals, and strict institutional privacy barriers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 rounded-xl border border-border bg-surface-panel p-6 sm:p-8 space-y-5 relative overflow-hidden shadow-xs">
              <div className="flex items-center justify-between">
                <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Activity className="size-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Zero Deal Decay
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold text-foreground">
                  Algorithmic Cadence Engine with Auto-Scheduling
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every logged outreach automatically computes and locks the next follow-up date
                  based on the outcome. If an associate logs a &quot;Connected Call,&quot; the platform
                  enforces a 3-day touchpoint; if a &quot;Voicemail&quot; is left, a 24-hour retry is
                  queued. Accounts never slip through the cracks.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-surface-card border border-border grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase block">
                    Cycle Acceleration
                  </span>
                  <span className="text-lg font-bold text-foreground tabular-nums">4.2x Faster</span>
                  <span className="text-[11px] text-emerald-400 block">MoU Execution</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase block">
                    Cadence Discipline
                  </span>
                  <span className="text-lg font-bold text-foreground tabular-nums">100%</span>
                  <span className="text-[11px] text-primary block">Audit Coverage</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase block">
                    Stale Account Drop
                  </span>
                  <span className="text-lg font-bold text-foreground tabular-nums">-92%</span>
                  <span className="text-[11px] text-emerald-400 block">Dormancy Eliminated</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-4 rounded-xl border border-border bg-surface-panel p-6 sm:p-8 space-y-5 shadow-xs">
              <div className="size-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Filter className="size-5" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold text-foreground">
                  Phone & Domain Deduplication
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Real-time deduplication algorithms scan phone numbers, hospital URLs, and key
                  decision-maker emails to ensure multiple reps never pitch the same medical
                  director twice.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-surface-card border border-border text-xs font-mono text-muted-foreground space-y-1.5">
                <span className="text-emerald-400 font-semibold block">
                  ✓ Strict E.164 Normalization
                </span>
                <span className="text-emerald-400 font-semibold block">
                  ✓ Institutional Domain Matching
                </span>
                <span className="text-emerald-400 font-semibold block">
                  ✓ Cross-Territory Conflict Shield
                </span>
              </div>
            </div>

            <div id="governance" className="md:col-span-4 rounded-xl border border-border bg-surface-panel p-6 sm:p-8 space-y-5 shadow-xs">
              <div className="size-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold text-foreground">
                  4-Tier RBAC Isolation
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Granular permission gates distinguish between Owners, Team Leads, Associates, and
                  Interns. Interns can only view assigned accounts; Owners enjoy complete network
                  governance and telemetry.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 text-[11px] font-mono text-muted-foreground">
                <span className="px-2 py-1 rounded bg-surface-card border border-border">OWNER</span>
                <span className="px-2 py-1 rounded bg-surface-card border border-border">TL</span>
                <span className="px-2 py-1 rounded bg-surface-card border border-border">ASSOC</span>
                <span className="px-2 py-1 rounded bg-surface-card border border-border">INTERN</span>
              </div>
            </div>

            <div className="md:col-span-8 rounded-xl border border-border bg-surface-panel p-6 sm:p-8 space-y-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="size-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FileCheck2 className="size-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  Zero Admin Overhead
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold text-foreground">
                  1-Click EOD Intelligence & WhatsApp Broadcast
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Stop requiring business development associates to fill out tedious end-of-day
                  spreadsheets. Leadwise aggregates calls, meetings, follow-ups, and stage movements
                  into an executive brief formatted directly for instant WhatsApp copy-paste.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  No End-of-Day Spreadsheets
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  Instant Executive Group Delivery
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

      {/* ── Interactive ROI Impact Calculator Section ──────────────────────── */}
      <section id="calculator" className="py-20 border-b border-border/60 bg-surface-panel/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              <Sliders className="size-3.5" aria-hidden="true" />
              <span>Operational Yield Model</span>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground text-balance">
              Calculate the direct impact on your BD organization.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Adjust your team parameters to see estimated hours reclaimed and pipeline slippage prevented.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-panel p-6 sm:p-10 shadow-lg grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Active Territory BD Reps:</span>
                  <span className="text-foreground font-bold tabular-nums text-sm">
                    {teamSize} Associates
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="40"
                  value={teamSize}
                  onChange={(e) => setTeamSize(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-surface-elevated appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>2 Reps</span>
                  <span>20 Reps</span>
                  <span>40 Reps</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Average Hospital Deal Value:</span>
                  <span className="text-foreground font-bold tabular-nums text-sm">
                    ₹{dealSize} Lakhs
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="200"
                  step="5"
                  value={dealSize}
                  onChange={(e) => setDealSize(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-surface-elevated appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>₹15 Lakhs</span>
                  <span>₹1.00 Cr</span>
                  <span>₹2.00 Cr</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 rounded-lg border border-border bg-surface-card p-6 space-y-4 font-mono">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider block border-b border-border pb-2">
                Estimated Annual Impact
              </span>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Admin Hours Reclaimed:
                  </span>
                  <span className="text-2xl font-bold text-foreground tabular-nums">
                    {Math.round(hoursSaved * 50)} hrs/yr
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    ({hoursSaved} hrs/week saved on EOD assembly)
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Prevented Pipeline Slippage:
                  </span>
                  <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                    ₹{preventedSlippage >= 100 ? `${(preventedSlippage / 100).toFixed(2)} Cr` : `${preventedSlippage} Lakhs`}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Based on 14% prevented deal decay
                  </span>
                </div>
              </div>

              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary-hover py-2.5 px-4 rounded-md transition-colors shadow-xs"
              >
                <span>Deploy Leadwise in Your Territory</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Security & Specifications Matrix Section ──────────────────────── */}
      <section id="specifications" className="py-20 border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              <span>Institutional Procurement Matrix</span>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground text-balance">
              Enterprise compliance & specifications.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every deployment meets strict hospital IT procurement standards out of the box.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-panel overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-surface-card border-b border-border text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-medium">Architecture Specification</th>
                  <th className="py-3 px-4 font-medium">Implementation Standard</th>
                  <th className="py-3 px-4 font-medium text-right">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-foreground">
                <tr className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold">Data Encryption at Rest</td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    AES-256 GCM on all persistent records and credentials
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-400 font-semibold">Verified</td>
                </tr>
                <tr className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold">Transit Protocol</td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    TLS 1.3 enforced with strict HSTS (max-age 63072000)
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-400 font-semibold">Verified</td>
                </tr>
                <tr className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold">Access Controls (RBAC)</td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    Strict Owner / Team Lead / Associate / Intern boundary composition
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-400 font-semibold">Enforced</td>
                </tr>
                <tr className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold">Disaster Recovery (DR)</td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    Automated PostgreSQL binary dump snapshotting to Google Drive
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-400 font-semibold">Scheduled</td>
                </tr>
                <tr className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold">Single Sign-On (SSO)</td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    SAML 2.0 / Okta / Azure AD Enterprise Directory compatibility
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-400 font-semibold">Ready</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Closing Call to Action ─────────────────────────────────────────── */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
            Elevate your healthcare outreach from fragmented spreadsheets to an institutional intelligence platform.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Join leading medical groups and clinical business development teams operating on Leadwise.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary-hover px-6 py-3 rounded-lg shadow-sm transition-[background-color,transform] duration-150 active:scale-[0.98] group"
            >
              <span>Access Command Center</span>
              <ArrowRight
                className="size-4 group-hover:translate-x-0.5 transition-transform duration-150"
                aria-hidden="true"
              />
            </Link>

            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-surface-card hover:bg-surface-elevated border border-border px-5 py-3 rounded-lg shadow-xs transition-[background-color,border-color] duration-150"
            >
              <span>Request Territory Access</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Institutional Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border/80 bg-surface-panel py-12 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-white-text.png"
              alt="Leadwise"
              width={110}
              height={30}
              className="h-7 w-auto object-contain hidden dark:block"
            />
            <Image
              src="/logo-dark-text.png"
              alt="Leadwise"
              width={110}
              height={30}
              className="h-7 w-auto object-contain block dark:hidden"
            />
            <span className="text-border">|</span>
            <span className="font-mono text-[11px]">Sentio Healthcare Technologies</span>
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
            © {new Date().getFullYear()} Sentio Leadwise CRM. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
