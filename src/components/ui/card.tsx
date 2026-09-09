import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.ComponentProps<'div'> {
  interactive?: boolean
  variant?: 'default' | 'elevated' | 'subtle' | 'ghost' | 'glass' | 'glow'
  sheen?: boolean
}

export function Card({
  className,
  interactive = false,
  variant = 'default',
  sheen = false,
  ...props
}: CardProps) {
  const variantStyles = {
    default: 'border border-border/80 bg-card text-card-foreground shadow-xs rim-highlight',
    elevated: 'border border-border/90 bg-surface-raised text-card-foreground shadow-md rim-highlight',
    subtle: 'border border-border/50 bg-surface-muted/50 text-card-foreground shadow-none',
    ghost: 'border-0 bg-transparent shadow-none',
    glass: 'border border-border/70 bg-surface/80 backdrop-blur-xl text-card-foreground shadow-xs rim-highlight',
    glow: 'border border-primary/30 bg-primary-soft/15 text-card-foreground shadow-sm rim-highlight',
  }

  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-200 ease-out',
        variantStyles[variant],
        sheen && 'surface-sheen',
        interactive &&
          'cursor-pointer hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-1 px-5 pt-4.5 pb-3.5', className)}
      {...props}
    />
  )
}

/**
 * Header variant for cards whose body is a table/list — adds the dividing
 * hairline so the header reads as chrome rather than content.
 */
export function CardHeaderBordered({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5',
        className,
      )}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      className={cn('text-[15px] leading-6 font-semibold tracking-[-0.01em]', className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-[13px] leading-5 text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border-t border-border px-5 py-3.5',
        className,
      )}
      {...props}
    />
  )
}
