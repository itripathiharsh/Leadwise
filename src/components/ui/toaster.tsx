'use client'

import { Toaster as SonnerToaster } from 'sonner'

/**
 * Toast host. Mounted once in the app shell.
 *
 * Styling is driven by our own tokens rather than Sonner's defaults so toasts
 * match the rest of the chrome in both themes.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      duration={3800}
      gap={10}
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            'group !rounded-xl !border !border-border !bg-popover !text-popover-foreground !shadow-pop !font-sans !text-[13px] !px-4 !py-3.5 !gap-3',
          title: '!font-semibold !text-[13px] !leading-5 !text-foreground',
          description: '!text-[12.5px] !leading-5 !text-muted-foreground',
          actionButton:
            '!rounded-md !bg-primary !text-primary-foreground !text-xs !font-medium !px-2.5 !h-7',
          cancelButton:
            '!rounded-md !bg-muted !text-muted-foreground !text-xs !font-medium !px-2.5 !h-7',
          closeButton: '!bg-surface !border-border !text-muted-foreground hover:!text-foreground',
          success: '[&_[data-icon]]:!text-success',
          error: '[&_[data-icon]]:!text-destructive',
          warning: '[&_[data-icon]]:!text-warning',
          info: '[&_[data-icon]]:!text-primary',
        },
      }}
    />
  )
}

export { toast } from 'sonner'
