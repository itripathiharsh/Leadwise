'use client'

import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Search, X, Smile } from 'lucide-react'
import { EMOJI_LIST, EMOJI_CATEGORIES, EmojiItem } from './emoji-data'
import { cn } from '@/lib/utils'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  children?: React.ReactNode
  triggerClassName?: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
  sideOffset?: number
}

export function EmojiPicker({
  onSelect,
  children,
  triggerClassName,
  align = 'end',
  side = 'top',
  sideOffset = 8,
}: EmojiPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [activeCategory, setActiveCategory] = React.useState<string>('smileys')
  const [hoveredEmoji, setHoveredEmoji] = React.useState<EmojiItem | null>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Focus search input when popover opens
  React.useEffect(() => {
    if (open) {
      setSearch('')
      setHoveredEmoji(null)
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [open])

  // Filter emojis based on search or active category
  const filteredEmojis = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      return EMOJI_LIST.filter((e) => e.category === activeCategory)
    }
    return EMOJI_LIST.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.keywords.some((k) => k.toLowerCase().includes(q)) ||
        e.emoji.includes(q)
    )
  }, [search, activeCategory])

  const handleSelectEmoji = (emoji: string) => {
    onSelect(emoji)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Enter' && filteredEmojis.length > 0) {
      e.preventDefault()
      handleSelectEmoji(filteredEmojis[0].emoji)
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {children || (
          <button
            type="button"
            aria-label="Add emoji"
            title="Add emoji"
            className={cn(
              'p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-surface-muted transition-colors cursor-pointer',
              triggerClassName
            )}
          >
            <Smile className="size-4" />
          </button>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          onKeyDown={handleKeyDown}
          className="z-50 w-[300px] sm:w-[320px] rounded-xl border border-border bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none text-foreground"
        >
          {/* Header & Search */}
          <div className="p-2.5 border-b border-border bg-surface-muted/50 space-y-2">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search emojis..."
                className="w-full bg-surface border border-border/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-border-strong focus:ring-1 focus:ring-primary/40 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Category Nav (hidden when searching) */}
            {!search && (
              <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-none pt-0.5">
                {EMOJI_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    title={cat.name}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      'p-1 rounded-md text-sm transition-all hover:scale-110 shrink-0',
                      activeCategory === cat.id
                        ? 'bg-primary/15 border border-primary/40 shadow-xs'
                        : 'opacity-65 hover:opacity-100'
                    )}
                  >
                    <span>{cat.icon}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Emoji Grid */}
          <div className="h-52 overflow-y-auto p-2 scrollbar-slim">
            {filteredEmojis.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground space-y-1">
                <span className="text-xl">🔍</span>
                <p className="text-xs font-medium">No emojis found</p>
                <p className="text-[10px] text-muted-foreground/70">Try searching for &quot;fire&quot;, &quot;happy&quot;, or &quot;party&quot;</p>
              </div>
            ) : (
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                {filteredEmojis.map((item) => (
                  <button
                    key={item.emoji}
                    type="button"
                    onClick={() => handleSelectEmoji(item.emoji)}
                    onMouseEnter={() => setHoveredEmoji(item)}
                    title={item.name}
                    className="size-8 flex items-center justify-center text-base rounded-md hover:bg-surface-hover hover:scale-120 active:scale-95 transition-transform duration-75 cursor-pointer"
                  >
                    <span>{item.emoji}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer Preview Bar */}
          <div className="h-9 px-3 border-t border-border bg-surface-muted/40 flex items-center justify-between text-[11px] text-muted-foreground">
            {hoveredEmoji ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">{hoveredEmoji.emoji}</span>
                <span className="truncate font-medium text-foreground">{hoveredEmoji.name}</span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground/70 italic">Pick an emoji or press Enter</span>
            )}
            <span className="text-[9px] font-mono text-muted-foreground/60 shrink-0 ml-2">ESC to close</span>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
