import { chromium, type BrowserContext, type Page } from 'playwright'
import { getProfileDir } from './session.js'

export interface SendResult {
  success: boolean
  sentAt?: string
  error?: string
  errorCode?: 'whatsapp_not_logged_in' | 'chat_not_found' | 'send_failed' | 'timeout' | 'invalid_phone' | 'browser_error'
  needsLogin?: boolean
}

/**
 * Validate phone number: must be digits only, 10–15 chars.
 * Auto-prefixes 10-digit Indian numbers with 91.
 */
function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length < 10 || digits.length > 15) return null
  return digits
}

/**
 * Send a WhatsApp message using Playwright browser automation.
 *
 * Uses a persistent Chromium profile so the user only needs to
 * scan the WhatsApp Web QR code once.
 */
export async function sendWhatsAppMessage(phone: string, message: string): Promise<SendResult> {
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) {
    return { success: false, error: 'Invalid phone number format', errorCode: 'invalid_phone' }
  }

  const profileDir = getProfileDir()
  let context: BrowserContext | null = null

  try {
    // Launch persistent Chromium context (reuses WhatsApp Web session)
    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      channel: 'msedge', // Use installed Edge on Windows; falls back to bundled Chromium
      viewport: { width: 1280, height: 900 },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--disable-default-apps',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    })

    const page = context.pages()[0] || await context.newPage()

    // ── Step 1: Navigate to WhatsApp Web ──
    console.log('📱 Opening WhatsApp Web...')
    await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded', timeout: 30000 })

    // ── Step 2: Check login state ──
    // Wait for either the chat list (logged in) or the QR canvas (needs login)
    console.log('🔍 Checking WhatsApp login state...')

    const loginResult = await Promise.race([
      page.waitForSelector('[data-testid="chat-list"]', { timeout: 45000 })
        .then(() => 'logged_in' as const),
      page.waitForSelector('canvas[aria-label*="QR"]', { timeout: 45000 })
        .then(() => 'needs_login' as const),
      page.waitForSelector('[data-testid="qrcode"]', { timeout: 45000 })
        .then(() => 'needs_login' as const),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 50000)),
    ])

    if (loginResult === 'needs_login') {
      console.log('⚠️  WhatsApp Web requires QR login. Please scan the QR code in the browser window.')
      // Wait up to 120 seconds for the user to scan QR
      try {
        await page.waitForSelector('[data-testid="chat-list"]', { timeout: 120000 })
        console.log('✅ WhatsApp Web logged in successfully!')
      } catch {
        return {
          success: false,
          error: 'WhatsApp Web login timeout. Please scan the QR code in the browser window and try again.',
          errorCode: 'whatsapp_not_logged_in',
          needsLogin: true,
        }
      }
    } else if (loginResult === 'timeout') {
      return {
        success: false,
        error: 'WhatsApp Web took too long to load. Check your internet connection.',
        errorCode: 'timeout',
      }
    }

    console.log('✅ WhatsApp Web is logged in.')

    // ── Step 3: Open the target chat ──
    console.log(`📞 Opening chat with +${normalizedPhone}...`)
    const chatUrl = `https://web.whatsapp.com/send?phone=${normalizedPhone}`
    await page.goto(chatUrl, { waitUntil: 'domcontentloaded', timeout: 20000 })

    // Wait for the message input to appear (confirms chat opened)
    const messageInput = await page.waitForSelector(
      '[data-testid="conversation-compose-box-input"], div[contenteditable="true"][data-tab="10"]',
      { timeout: 20000 }
    ).catch(() => null)

    if (!messageInput) {
      // Check if "Phone number shared via url is invalid" toast appears
      const invalidNumber = await page.locator('text=invalid').first().isVisible().catch(() => false)
      if (invalidNumber) {
        return { success: false, error: 'WhatsApp could not find this phone number.', errorCode: 'chat_not_found' }
      }

      // Check for "Continue to chat" popup
      const continueBtn = await page.locator('a[href*="send?phone"]').first().isVisible().catch(() => false)
      if (continueBtn) {
        await page.locator('a[href*="send?phone"]').first().click()
        await page.waitForSelector(
          '[data-testid="conversation-compose-box-input"], div[contenteditable="true"][data-tab="10"]',
          { timeout: 15000 }
        )
      } else {
        return { success: false, error: 'Could not open chat — message input box not found.', errorCode: 'chat_not_found' }
      }
    }

    console.log('✅ Chat opened, composing message...')

    // ── Step 4: Type the message ──
    // WhatsApp Web uses a contenteditable div. We need to handle multi-line text.
    // Shift+Enter for newlines within WhatsApp Web input.
    const inputBox = await page.waitForSelector(
      '[data-testid="conversation-compose-box-input"], div[contenteditable="true"][data-tab="10"]',
      { timeout: 5000 }
    )

    if (!inputBox) {
      return { success: false, error: 'Message input box disappeared.', errorCode: 'send_failed' }
    }

    await inputBox.click()

    // Split message into lines and type with Shift+Enter for newlines
    const lines = message.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > 0) {
        await inputBox.type(lines[i], { delay: 2 })
      }
      if (i < lines.length - 1) {
        await page.keyboard.down('Shift')
        await page.keyboard.press('Enter')
        await page.keyboard.up('Shift')
      }
    }

    // Small pause to let WhatsApp process the input
    await page.waitForTimeout(500)

    // ── Step 5: Click Send ──
    console.log('📤 Clicking Send button...')
    const sendButton = await page.waitForSelector(
      '[data-testid="send"], button[aria-label="Send"]',
      { timeout: 5000 }
    ).catch(() => null)

    if (!sendButton) {
      return { success: false, error: 'Send button not found. The message was typed but not sent.', errorCode: 'send_failed' }
    }

    await sendButton.click()

    // ── Step 6: Verify send ──
    // Wait a moment and check that the most recent outgoing message appeared
    await page.waitForTimeout(2000)

    // Check for the message status (tick marks)
    const sentConfirmation = await page.locator('[data-testid="msg-check"], [data-testid="msg-dblcheck"], [data-icon="msg-check"], [data-icon="msg-dblcheck"]')
      .last()
      .isVisible()
      .catch(() => false)

    const sentAt = new Date().toISOString()

    if (sentConfirmation) {
      console.log('✅ Message sent and delivery confirmed!')
    } else {
      console.log('✅ Message sent (delivery confirmation pending).')
    }

    // Close the browser context gracefully (keeps the session)
    await context.close()

    return { success: true, sentAt }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('❌ WhatsApp automation error:', msg)

    if (context) {
      try { await context.close() } catch { /* ignore */ }
    }

    if (msg.includes('Executable doesn\'t exist') || msg.includes('browserType.launch')) {
      return { success: false, error: 'Browser not found. Run `npm run setup` to install Chromium.', errorCode: 'browser_error' }
    }

    return { success: false, error: msg, errorCode: 'browser_error' }
  }
}
