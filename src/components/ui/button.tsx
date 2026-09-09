'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'dangerGhost'
  | 'link'
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'iconSm'

const BASE =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover border border-primary/20 hover:shadow-[0_0_18px_-3px_rgba(99,102,241,0.35)]',
  secondary:
    'bg-secondary text-secondary-foreground border border-border hover:bg-muted hover:border-border-strong shadow-xs',
  outline:
    'border border-border/90 bg-surface/90 backdrop-blur-sm text-foreground hover:bg-muted/90 hover:border-border-strong shadow-xs',
  ghost: 'text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-transparent',
  danger:
    'bg-destructive text-destructive-foreground shadow-xs hover:brightness-110 border border-transparent',
  dangerGhost:
    'text-destructive hover:bg-destructive-soft border border-transparent',
  link: 'text-primary underline-offset-4 hover:underline p-0 h-auto border-0',
}

const SIZES: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-xs [&_svg]:size-3.5 rounded-md',
  sm: 'h-8 px-3 text-[13px] [&_svg]:size-4',
  md: 'h-9.5 px-4 text-sm [&_svg]:size-4',
  lg: 'h-11 px-5 text-[15px] [&_svg]:size-4.5',
  icon: 'size-9.5 [&_svg]:size-4',
  iconSm: 'size-8 [&_svg]:size-4 rounded-md',
}

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: Variant
  size?: Size
  asChild?: boolean
  /** Shows a spinner and blocks interaction. */
  loading?: boolean
  /** Optional text to display while loading (e.g. "Saving...") */
  loadingText?: string
  /** Rendered before the label; hidden while loading. */
  icon?: React.ReactNode
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  asChild = false,
  loading = false,
  loadingText,
  icon,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  // `asChild` forwards to a single child (e.g. a Link) — a spinner or extra
  // icon node would break Slot's single-child contract, so skip the extras.
  if (asChild) {
    return (
      <Comp className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
        {children}
      </Comp>
    )
  }

  return (
    <button
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {loadingText ?? children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  )
}
