'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Centred modal dialog. Used for confirmations and compact forms.
 * For anything longer than a few fields, prefer <Sheet /> (side drawer).
 */

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

function Overlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] data-[state=closed]:animate-[fade-in_0.15s_ease-in_reverse] data-[state=open]:animate-[fade-in_0.18s_ease-out] dark:bg-slate-950/65',
        className,
      )}
      {...props}
    />
  )
}

export function DialogContent({
  className,
  children,
  size = 'md',
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showClose?: boolean
}) {
  const width =
    size === 'sm'
      ? 'max-w-md'
      : size === 'md'
        ? 'max-w-xl'
        : size === 'lg'
          ? 'max-w-2xl'
          : 'max-w-4xl'
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none',
          'data-[state=open]:animate-[scale-in_0.16s_cubic-bezier(0.16,1,0.3,1)]',
          width,
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[2.5px] focus-visible:ring-ring/40 focus-visible:outline-none"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 border-b border-border/80 px-6 py-5 pr-12 bg-surface/40', className)}
      {...props}
    />
  )
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-base sm:text-lg leading-6 font-semibold tracking-[-0.012em]', className)}
      {...props}
    />
  )
}

export function DialogDescription({
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

export function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('scrollbar-slim flex-1 overflow-y-auto px-6 py-5', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2.5 border-t border-border/80 bg-surface-muted/40 px-6 py-4 sm:flex-row sm:justify-end sm:items-center',
        className,
      )}
      {...props}
    />
  )
}
