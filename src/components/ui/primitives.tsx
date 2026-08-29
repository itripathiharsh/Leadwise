'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Tooltip ──────────────────────────────────────────────────────────────────

export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 250,
  className,
}: {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delay?: number
  className?: string
}) {
  if (!content) return <>{children}</>
  return (
    <TooltipPrimitive.Root delayDuration={delay}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-60 max-w-64 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs leading-4.5 font-medium text-slate-50 shadow-lg',
            'data-[state=delayed-open]:animate-[fade-in_0.12s_ease-out] dark:bg-slate-700',
            className,
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-slate-900 dark:fill-slate-700" width={9} height={5} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'scrollbar-slim -mb-px flex items-center gap-1 overflow-x-auto border-b border-border',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative inline-flex shrink-0 items-center gap-2 rounded-t-md border-b-2 border-transparent px-3 pb-2.5 pt-2 text-[13px] font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none',
        'hover:text-foreground focus-visible:ring-[2.5px] focus-visible:ring-ring/40',
        'data-[state=active]:border-primary data-[state=active]:text-foreground',
        '[&_svg]:size-4',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('pt-5 outline-none data-[state=active]:animate-in-fast', className)}
      {...props}
    />
  )
}

// ── Segmented control ────────────────────────────────────────────────────────

/**
 * Used for the activity-type picker: five equal targets, one tap to switch.
 * Deliberately not a <Select> — speed of logging is the whole point (spec §36).
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
  ariaLabel,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; icon?: React.ReactNode }[]
  className?: string
  size?: 'sm' | 'md'
  ariaLabel?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex w-full items-center gap-1 rounded-lg border border-border bg-surface-muted p-1',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150 outline-none',
              'focus-visible:ring-[2.5px] focus-visible:ring-ring/40',
              size === 'sm' ? 'h-7 px-2 text-xs' : 'h-8 px-2.5 text-[13px]',
              active
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
              '[&_svg]:size-3.5 [&_svg]:shrink-0',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Checkbox ─────────────────────────────────────────────────────────────────

export function Checkbox({
  className,
  indeterminate,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & { indeterminate?: boolean }) {
  return (
    <CheckboxPrimitive.Root
      checked={indeterminate ? 'indeterminate' : props.checked}
      className={cn(
        'peer inline-flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border border-input bg-surface shadow-xs transition-colors outline-none',
        'focus-visible:ring-[3px] focus-visible:ring-ring/25',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="inline-flex items-center justify-center">
        {indeterminate ? <Minus className="size-3 stroke-3" /> : <Check className="size-3 stroke-3" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

/** Checkbox + label + optional description, aligned for form use. */
export function CheckboxField({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
}: {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <div className="min-w-0">
        <label
          htmlFor={id}
          className="block cursor-pointer text-[13px] leading-5 font-medium select-none"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs leading-4.5 text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

// ── Switch ───────────────────────────────────────────────────────────────────

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors outline-none',
        'focus-visible:ring-[3px] focus-visible:ring-ring/25',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-border-strong',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  )
}

// ── Separator ────────────────────────────────────────────────────────────────

export function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
}

// ── Popover ──────────────────────────────────────────────────────────────────

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor

export function PopoverContent({
  className,
  align = 'start',
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-72 rounded-lg border border-border bg-popover p-3.5 text-popover-foreground shadow-pop outline-none',
          'data-[state=open]:animate-[scale-in_0.14s_cubic-bezier(0.16,1,0.3,1)]',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
