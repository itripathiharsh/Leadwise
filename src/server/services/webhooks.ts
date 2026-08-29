import { prisma } from '@/lib/db'
import crypto from 'crypto'

export async function dispatchWebhookEvent(
  event: string,
  payload: Record<string, any>,
) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      isActive: true,
      OR: [
        { events: { has: event } },
        { events: { has: '*' } },
      ],
    },
  })

  if (endpoints.length === 0) return

  const timestamp = Math.floor(Date.now() / 1000)
  const body = JSON.stringify({
    event,
    timestamp,
    data: payload,
  })

  for (const ep of endpoints) {
    const signature = crypto
      .createHmac('sha256', ep.secret)
      .update(`${timestamp}.${body}`)
      .digest('hex')

    fetch(ep.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Leadwise-Signature': signature,
        'X-Leadwise-Timestamp': String(timestamp),
        'X-Leadwise-Event': event,
      },
      body,
    }).catch((err) => {
      console.warn(`Webhook delivery to ${ep.url} failed:`, err)
    })
  }
}
