'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Side drawer.
 *
 * This is the primary container for "log an activity" and every longer form:
 * it keeps the underlying record visible, opens fast, and on mobile becomes a
 * bottom sheet rather than a cramped centred modal.
 */

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
} as const

export function SheetContent({
  className,
  children,
  size = 'md',
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  size?: keyof typeof SIZES
  showClose?: boolean
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_0.18s_ease-out] dark:bg-slate-950/65',
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden border-border bg-popover text-popover-foreground shadow-pop outline-none',
          // Mobile: bottom sheet
          'inset-x-0 bottom-0 max-h-[94dvh] rounded-t-2xl border-t data-[state=open]:animate-[slide-up_0.24s_cubic-bezier(0.16,1,0.3,1)]',
          // Desktop: right-hand drawer, full height
          'sm:inset-y-0 sm:right-0 sm:left-auto sm:h-dvh sm:max-h-none sm:w-full sm:rounded-none sm:rounded-l-2xl sm:border-t-0 sm:border-l sm:data-[state=open]:animate-[sheet-in_0.26s_cubic-bezier(0.16,1,0.3,1)]',
          SIZES[size],
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            className="absolute top-4 right-4 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[2.5px] focus-visible:ring-ring/40 focus-visible:outline-none"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function SheetHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col gap-1 border-b border-border px-5 py-4 pr-12',
        className,
      )}
      {...props}
    />
  )
}

export function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-base leading-6 font-semibold tracking-[-0.012em]', className)}
      {...props}
    />
  )
}

export function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-[13px] leading-5 text-muted-foreground', className)}
      {...props}
    />
  )
}

export function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('scrollbar-slim flex-1 overflow-y-auto px-5 py-4.5', className)}
      {...props}
    />
  )
}

export function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-surface-muted px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:pb-3.5',
        className,
      )}
      {...props}
    />
  )
}
