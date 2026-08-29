'use client'

import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

// ── Label ────────────────────────────────────────────────────────────────────

export function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { required?: boolean }) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'flex items-center gap-1 text-[13px] leading-5 font-medium text-foreground select-none',
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-destructive" aria-hidden>
          *
        </span>
      )}
    </LabelPrimitive.Root>
  )
}

// ── Input ────────────────────────────────────────────────────────────────────

const CONTROL_BASE =
  'w-full rounded-lg border bg-surface text-sm text-foreground shadow-xs transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/18 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground'

export interface InputProps extends React.ComponentProps<'input'> {
  invalid?: boolean
  /** Icon rendered inside the field on the left. */
  leading?: React.ReactNode
  trailing?: React.ReactNode
}

export function Input({ className, invalid, leading, trailing, type = 'text', ...props }: InputProps) {
  const control = (
    <input
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL_BASE,
        'h-9.5 px-3 py-2',
        leading && 'pl-9',
        trailing && 'pr-9',
        invalid
          ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/18'
          : 'border-input',
        // Date/time inputs get a themed picker indicator.
        '[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-55 [&::-webkit-calendar-picker-indicator]:hover:opacity-90 dark:[&::-webkit-calendar-picker-indicator]:invert',
        className,
      )}
      {...props}
    />
  )

  if (!leading && !trailing) return control

  return (
    <div className="relative">
      {leading && (
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle-foreground [&_svg]:size-4">
          {leading}
        </span>
      )}
      {control}
      {trailing && (
        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-subtle-foreground [&_svg]:size-4">
          {trailing}
        </span>
      )}
    </div>
  )
}

// ── Textarea ─────────────────────────────────────────────────────────────────

export function Textarea({
  className,
  invalid,
  rows = 3,
  ...props
}: React.ComponentProps<'textarea'> & { invalid?: boolean }) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL_BASE,
        'scrollbar-slim min-h-20 resize-y px-3 py-2 leading-6',
        invalid
          ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/18'
          : 'border-input',
        className,
      )}
      {...props}
    />
  )
}

// ── Field wrapper ────────────────────────────────────────────────────────────

export interface FieldProps {
  label?: React.ReactNode
  htmlFor?: string
  required?: boolean
  hint?: React.ReactNode
  error?: string
  className?: string
  children: React.ReactNode
}

/**
 * Consistent label / control / hint / error stack. Using this everywhere is
 * what keeps forms across the app visually identical.
 */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs leading-4 font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs leading-4 text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

/** Grid used inside modals/drawers so two-column forms line up. */
export function FieldGrid({
  className,
  columns = 2,
  ...props
}: React.ComponentProps<'div'> & { columns?: 1 | 2 }) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
        className,
      )}
      {...props}
    />
  )
}
