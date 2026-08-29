/**
 * Timezone-correct day arithmetic.
 *
 * The CRM's notion of "today" must match the team's wall clock (APP_TIMEZONE,
 * default Asia/Kolkata), not the server's UTC clock — otherwise an activity
 * logged at 9pm IST would land on the *next* day's EOD report.
 *
 * Everything stored in Postgres is a UTC instant. These helpers translate
 * between UTC instants and calendar days in the app timezone. We use Intl
 * rather than a date library so DST-aware conversion is handled by the
 * platform's own tz database and there are no extra dependencies.
 */

import { env } from './env'

export type DateKey = string // "YYYY-MM-DD"

function tz(explicit?: string): string {
  return explicit || env.timezone
}

const partsCache = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string): Intl.DateTimeFormat {
  let cached = partsCache.get(timeZone)
  if (!cached) {
    cached = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    partsCache.set(timeZone, cached)
  }
  return cached
}

interface WallClock {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second: number
}

/** Wall-clock fields of a UTC instant, as seen in `timeZone`. */
export function wallClock(date: Date, timeZone?: string): WallClock {
  const parts = formatter(tz(timeZone)).formatToParts(date)
  const map: Record<string, number> = {}
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = Number.parseInt(part.value, 10)
  }
  return {
    year: map.year!,
    month: map.month!,
    day: map.day!,
    // Intl with hour12:false can emit hour "24" for midnight on some ICU builds.
    hour: (map.hour ?? 0) % 24,
    minute: map.minute ?? 0,
    second: map.second ?? 0,
  }
}

/** Offset in ms that must be added to a UTC instant to get local wall time. */
function offsetMs(date: Date, timeZone: string): number {
  const wc = wallClock(date, timeZone)
  const asIfUtc = Date.UTC(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute, wc.second)
  // Drop sub-second precision from the instant before comparing.
  return asIfUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** "2026-08-22" for the given instant, in app timezone. */
export function toDateKey(date: Date = new Date(), timeZone?: string): DateKey {
  const wc = wallClock(date, tz(timeZone))
  return `${wc.year.toString().padStart(4, '0')}-${wc.month
    .toString()
    .padStart(2, '0')}-${wc.day.toString().padStart(2, '0')}`
}

export function isDateKey(value: unknown): value is DateKey {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/**
 * UTC instant corresponding to 00:00:00 local time on `key`.
 * Iterates twice so days that begin inside a DST transition resolve correctly.
 */
export function startOfDayUtc(key: DateKey, timeZone?: string): Date {
  const [y, m, d] = key.split('-').map((n) => Number.parseInt(n, 10)) as [number, number, number]
  return zonedToUtc(y, m, d, 0, 0, tz(timeZone))
}

/** Local wall-clock fields in `zone` → the UTC instant they denote. */
function zonedToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  zone: string,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0)
  let ts = naive
  for (let i = 0; i < 2; i++) {
    ts = naive - offsetMs(new Date(ts), zone)
  }
  return new Date(ts)
}

/**
 * `<input type="datetime-local">` value → UTC instant, read as app-timezone
 * wall time. Accepts a bare "YYYY-MM-DD" (treated as local midnight).
 */
export function dateTimeInputToUtc(value: string, timeZone?: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value.trim())
  if (!match) return null
  const [, y, m, d, h, mi] = match
  const year = Number.parseInt(y!, 10)
  const month = Number.parseInt(m!, 10)
  const day = Number.parseInt(d!, 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return zonedToUtc(
    year,
    month,
    day,
    h ? Number.parseInt(h, 10) : 0,
    mi ? Number.parseInt(mi, 10) : 0,
    tz(timeZone),
  )
}

/** Inverse of `dateTimeInputToUtc`, for pre-filling datetime-local inputs. */
export function utcToDateTimeInput(date: Date | null | undefined, timeZone?: string): string {
  if (!date) return ''
  const wc = wallClock(date, tz(timeZone))
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${wc.year}-${pad(wc.month)}-${pad(wc.day)}T${pad(wc.hour)}:${pad(wc.minute)}`
}

/** Exclusive end of the local day (== start of next local day). */
export function endOfDayUtc(key: DateKey, timeZone?: string): Date {
  return startOfDayUtc(addDaysToKey(key, 1), timeZone)
}

/** Half-open [start, end) UTC range covering one local calendar day. */
export function dayRangeUtc(key: DateKey, timeZone?: string): { start: Date; end: Date } {
  return { start: startOfDayUtc(key, timeZone), end: endOfDayUtc(key, timeZone) }
}

/** Half-open UTC range covering the local days from `fromKey` to `toKey` inclusive. */
export function rangeUtc(
  fromKey: DateKey,
  toKey: DateKey,
  timeZone?: string,
): { start: Date; end: Date } {
  return { start: startOfDayUtc(fromKey, timeZone), end: endOfDayUtc(toKey, timeZone) }
}

export function addDaysToKey(key: DateKey, days: number): DateKey {
  const [y, m, d] = key.split('-').map((n) => Number.parseInt(n, 10)) as [number, number, number]
  const shifted = new Date(Date.UTC(y, m - 1, d + days))
  return `${shifted.getUTCFullYear().toString().padStart(4, '0')}-${(shifted.getUTCMonth() + 1)
    .toString()
    .padStart(2, '0')}-${shifted.getUTCDate().toString().padStart(2, '0')}`
}

export function todayKey(timeZone?: string): DateKey {
  return toDateKey(new Date(), timeZone)
}

/** Whole local days between two keys (b - a). Negative when b precedes a. */
export function daysBetweenKeys(a: DateKey, b: DateKey): number {
  const [ay, am, ad] = a.split('-').map(Number) as [number, number, number]
  const [by, bm, bd] = b.split('-').map(Number) as [number, number, number]
  const diff = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)
  return Math.round(diff / 86_400_000)
}

/**
 * A `<input type="date">` value is a bare calendar date with no timezone.
 * Interpret it as local midnight in the app timezone.
 */
export function dateInputToUtc(value: string, timeZone?: string): Date | null {
  if (!isDateKey(value)) return null
  return startOfDayUtc(value, timeZone)
}

/** Inverse of `dateInputToUtc`, for pre-filling date inputs. */
export function utcToDateInput(date: Date | null | undefined, timeZone?: string): string {
  if (!date) return ''
  return toDateKey(date, timeZone)
}

// ── Display formatting ───────────────────────────────────────────────────────

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** "22 Aug 2026" */
export function formatDate(date: Date | string | null | undefined, timeZone?: string): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '—'
  const wc = wallClock(d, tz(timeZone))
  return `${wc.day} ${MONTHS[wc.month - 1]} ${wc.year}`
}

/** "22 Aug" — compact form for dense tables */
export function formatDateShort(
  date: Date | string | null | undefined,
  timeZone?: string,
): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '—'
  const wc = wallClock(d, tz(timeZone))
  const nowWc = wallClock(new Date(), tz(timeZone))
  const base = `${wc.day} ${MONTHS[wc.month - 1]}`
  return wc.year === nowWc.year ? base : `${base} ${wc.year}`
}

/** "10:30 AM" */
export function formatTime(date: Date | string | null | undefined, timeZone?: string): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '—'
  const wc = wallClock(d, tz(timeZone))
  const suffix = wc.hour >= 12 ? 'PM' : 'AM'
  const hour12 = wc.hour % 12 === 0 ? 12 : wc.hour % 12
  return `${hour12}:${wc.minute.toString().padStart(2, '0')} ${suffix}`
}

/** "22 Aug · 10:30 AM" — the timeline stamp format from the spec. */
export function formatDateTime(
  date: Date | string | null | undefined,
  timeZone?: string,
): string {
  if (!date) return '—'
  return `${formatDateShort(date, timeZone)} · ${formatTime(date, timeZone)}`
}

/** "Today", "Yesterday", "in 3 days", "5 days overdue" */
export function formatRelativeDay(
  date: Date | string | null | undefined,
  timeZone?: string,
): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '—'
  const diff = daysBetweenKeys(todayKey(timeZone), toDateKey(d, timeZone))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1) return `In ${diff} days`
  return `${Math.abs(diff)} days ago`
}

/** Long form used in page headers: "Saturday, 22 August 2026" */
export function formatLongDate(key: DateKey, timeZone?: string): string {
  const d = startOfDayUtc(key, timeZone)
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz(timeZone),
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

/** Bucket a follow-up due date relative to today, in app timezone. */
export type FollowUpBucket = 'OVERDUE' | 'TODAY' | 'TOMORROW' | 'UPCOMING'

export function bucketFollowUp(dueDate: Date, timeZone?: string): FollowUpBucket {
  const diff = daysBetweenKeys(todayKey(timeZone), toDateKey(dueDate, timeZone))
  if (diff < 0) return 'OVERDUE'
  if (diff === 0) return 'TODAY'
  if (diff === 1) return 'TOMORROW'
  return 'UPCOMING'
}
