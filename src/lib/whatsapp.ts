/**
 * WhatsApp deep links (spec §28).
 *
 * P0 is deliberately ₹0: we build a `wa.me` link with the report pre-filled and
 * the user presses Send themselves. There is no Business API, no unofficial bot,
 * and the app never sends a message on anyone's behalf.
 *
 * Pure functions only — safe to import from client components.
 */

/** WhatsApp's practical ceiling for a pre-filled message. */
export const WHATSAPP_TEXT_LIMIT = 4000

export function normalizeWhatsAppNumber(input: string | null | undefined): string | null {
  const digits = (input ?? '').replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length < 10 || digits.length > 15) return null
  return digits
}

export interface WhatsAppLink {
  url: string
  /** True when the text had to be shortened to fit the URL. */
  truncated: boolean
}

/**
 * `https://wa.me/<number>?text=<encoded>` — opens WhatsApp (app or Web) with the
 * message ready to send. Without a number, opens the contact picker instead so
 * the report can still be sent somewhere.
 */
export function buildWhatsAppLink(text: string, number?: string | null): WhatsAppLink {
  const truncated = text.length > WHATSAPP_TEXT_LIMIT
  const body = truncated
    ? `${text.slice(0, WHATSAPP_TEXT_LIMIT - 40).trimEnd()}\n… (see CRM for full report)`
    : text

  const target = normalizeWhatsAppNumber(number)
  const encoded = encodeURIComponent(body)

  return {
    url: target ? `https://wa.me/${target}?text=${encoded}` : `https://wa.me/?text=${encoded}`,
    truncated,
  }
}

/** "+91 98765 43210" for display next to the Send button. */
export function formatWhatsAppNumber(input: string | null | undefined): string {
  const digits = normalizeWhatsAppNumber(input)
  if (!digits) return '—'
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  return `+${digits}`
}
