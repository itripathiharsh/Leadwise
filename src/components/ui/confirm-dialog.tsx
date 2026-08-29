'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/**
 * Confirmation dialog for destructive or hard-to-reverse actions
 * (delete, unassign, overwrite on import). Never used for routine saves.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void | Promise<void>
  /** Extra content between the description and the buttons. */
  children?: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children && <div className="px-5 py-4">{children}</div>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            loading={loading}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Imperative-style hook for one-off confirmations inside menus. */
export function useConfirm() {
  const [state, setState] = React.useState<{
    open: boolean
    props: Omit<React.ComponentProps<typeof ConfirmDialog>, 'open' | 'onOpenChange'> | null
  }>({ open: false, props: null })
  const [loading, setLoading] = React.useState(false)

  const confirm = React.useCallback(
    (props: Omit<React.ComponentProps<typeof ConfirmDialog>, 'open' | 'onOpenChange'>) => {
      setState({ open: true, props })
    },
    [],
  )

  const element = state.props ? (
    <ConfirmDialog
      {...state.props}
      open={state.open}
      loading={loading}
      onOpenChange={(open) => setState((s) => ({ ...s, open }))}
      onConfirm={async () => {
        setLoading(true)
        try {
          await state.props!.onConfirm()
          setState({ open: false, props: null })
        } finally {
          setLoading(false)
        }
      }}
    />
  ) : null

  return { confirm, confirmDialog: element }
}
