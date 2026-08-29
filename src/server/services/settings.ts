import { prisma } from '@/lib/db'
import { env } from '@/lib/env'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { writeAudit } from './audit'

/**
 * App settings (spec §41 Settings).
 *
 * A tiny key/value table so the Owner can change the EOD WhatsApp recipient and
 * team name without a redeploy. Environment variables remain the fallback, so a
 * fresh install works with nothing in the table.
 */

export const SETTING_KEYS = {
  whatsappNumber: 'eod.whatsapp_number',
  whatsappRecipientLabel: 'eod.whatsapp_recipient_label',
  teamName: 'app.team_name',
} as const

export interface AppSettings {
  /** Digits only, international format, e.g. "919876543210". */
  whatsappNumber: string | null
  whatsappRecipientLabel: string | null
  teamName: string
  /** True when the number came from the environment rather than the database. */
  whatsappFromEnv: boolean
}

export const DEFAULT_TEAM_NAME = 'Leadwise'

export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: Object.values(SETTING_KEYS) } },
  })
  const map = new Map(rows.map((row) => [row.key, row.value.trim()]))

  const stored = map.get(SETTING_KEYS.whatsappNumber) || ''
  const envNumber = env.eodWhatsappNumber ?? null

  return {
    whatsappNumber: stored || envNumber,
    whatsappRecipientLabel: map.get(SETTING_KEYS.whatsappRecipientLabel) || null,
    teamName: map.get(SETTING_KEYS.teamName) || DEFAULT_TEAM_NAME,
    whatsappFromEnv: !stored && Boolean(envNumber),
  }
}

export interface SettingsUpdate {
  whatsappNumber?: string
  whatsappRecipientLabel?: string
  teamName?: string
}

export async function updateSettings(user: CurrentUser, input: SettingsUpdate): Promise<void> {
  assertCan(user, 'settings:manage')

  const entries: Array<[string, string]> = []
  if (input.whatsappNumber !== undefined) {
    entries.push([SETTING_KEYS.whatsappNumber, input.whatsappNumber.replace(/\D/g, '')])
  }
  if (input.whatsappRecipientLabel !== undefined) {
    entries.push([SETTING_KEYS.whatsappRecipientLabel, input.whatsappRecipientLabel])
  }
  if (input.teamName !== undefined) {
    entries.push([SETTING_KEYS.teamName, input.teamName])
  }
  if (entries.length === 0) return

  await prisma.$transaction(async (tx) => {
    for (const [key, value] of entries) {
      await tx.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
    }
    await writeAudit(
      {
        userId: user.id,
        action: 'settings.updated',
        entityType: 'settings',
        entityId: 'app',
        summary: `Updated settings: ${entries.map(([key]) => key).join(', ')}`,
        after: Object.fromEntries(entries),
      },
      tx,
    )
  })
}

export async function getAppSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } })
  return row ? row.value : null
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

