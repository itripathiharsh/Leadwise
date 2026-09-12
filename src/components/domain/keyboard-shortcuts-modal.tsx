'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X, Keyboard, Command } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShortcutGroup {
  title: string
  shortcuts: Array<{ keys: string[]; description: string }>
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['G', 'D'], description: 'Go to Dashboard' },
      { keys: ['G', 'O'], description: 'Go to Organisations' },
      { keys: ['G', 'C'], description: 'Go to Contacts' },
      { keys: ['G', 'P'], description: 'Go to Pipeline' },
      { keys: ['G', 'F'], description: 'Go to Follow-ups' },
      { keys: ['G', 'A'], description: 'Go to Calendar' },
      { keys: ['G', 'R'], description: 'Go to Reports' },
      { keys: ['G', 'S'], description: 'Go to Settings' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open Global Search' },
      { keys: ['N'], description: 'Log New Activity' },
      { keys: ['?'], description: 'Open Keyboard Shortcuts' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['Esc'], description: 'Close modal / dialog' },
      { keys: ['Tab'], description: 'Move focus to next element' },
      { keys: ['Enter'], description: 'Confirm / submit' },
    ],
  },
]

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] animate-in fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[10%] left-1/2 z-50 w-full max-w-lg -translate-x-1/2 rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden outline-none animate-in zoom-in-95 duration-150"
        >
          <DialogPrimitive.Title className="sr-only">
            Keyboard Shortcuts
          </DialogPrimitive.Title>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Keyboard className="size-4.5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-sm text-foreground">
                  Keyboard Shortcuts
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Navigate faster with keyboard shortcuts
                </p>
              </div>
            </div>
            <DialogPrimitive.Close
              aria-label="Close keyboard shortcuts"
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors hover:bg-muted"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Shortcuts List */}
          <div className="max-h-[60vh] overflow-y-auto p-5 space-y-5 scrollbar-slim">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2.5">
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.description}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-foreground font-medium">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && (
                              <span className="text-[10px] text-muted-foreground mx-0.5">
                                then
                              </span>
                            )}
                            <kbd
                              className={cn(
                                'inline-flex items-center justify-center rounded-md border border-border bg-surface-elevated px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground shadow-xs min-w-[24px] text-center',
                              )}
                            >
                              {key}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-5 py-3 text-center">
            <p className="text-[11px] text-muted-foreground">
              Press{' '}
              <kbd className="inline-flex items-center rounded border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                ?
              </kbd>{' '}
              anytime to open this dialog
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
