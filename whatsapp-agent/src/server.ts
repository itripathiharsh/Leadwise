import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { sendWhatsAppMessage } from './whatsapp.js'
import { getSessionInfo } from './session.js'

// ── Configuration ──────────────────────────────────────────────────────────────

// Load .env manually (no dotenv dependency needed)
function loadEnv() {
  const envPath = path.join(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1'), '..', '.env')
  try {
    const content = fs.readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // No .env file — that's fine, use defaults
  }
}

loadEnv()

const PORT = parseInt(process.env.WHATSAPP_AGENT_PORT || '7860', 10)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim())

// ── Auth Token (auto-generate on first run) ────────────────────────────────────

function getOrCreateToken(): string {
  if (process.env.WHATSAPP_AGENT_TOKEN) {
    return process.env.WHATSAPP_AGENT_TOKEN
  }

  // Auto-generate a token and save it
  const tokenDir = path.join(os.homedir(), '.leadwise-whatsapp')
  const tokenFile = path.join(tokenDir, 'agent-token.txt')

  if (fs.existsSync(tokenFile)) {
    return fs.readFileSync(tokenFile, 'utf-8').trim()
  }

  const token = `swa_${crypto.randomBytes(24).toString('hex')}`
  fs.mkdirSync(tokenDir, { recursive: true })
  fs.writeFileSync(tokenFile, token, 'utf-8')
  return token
}

const AUTH_TOKEN = getOrCreateToken()

// ── Express Server ─────────────────────────────────────────────────────────────

const app = express()

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, local scripts)
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true)
    }
    callback(new Error('CORS: Origin not allowed'))
  },
  credentials: true,
}))

app.use(express.json({ limit: '500kb' }))

// ── Auth Middleware ─────────────────────────────────────────────────────────────

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  if (!token || token !== AUTH_TOKEN) {
    res.status(401).json({ error: 'Unauthorized — invalid or missing agent token' })
    return
  }
  next()
}

// ── Track sending state ────────────────────────────────────────────────────────

let isSending = false

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * GET /health — Agent status check (no auth required for status polling).
 */
app.get('/health', (_req, res) => {
  const session = getSessionInfo()
  res.json({
    status: 'online',
    agent: 'leadwise-whatsapp-agent',
    version: '1.0.0',
    port: PORT,
    session: {
      hasProfile: session.hasSession,
      profileDir: session.profileDir,
      lastModified: session.lastModified,
    },
    isSending,
    timestamp: new Date().toISOString(),
  })
})

/**
 * POST /send-eod — Send a WhatsApp message via browser automation.
 * Requires auth token.
 *
 * Body: { phone: string, message: string }
 * Returns: { success: boolean, sentAt?: string, error?: string, errorCode?: string }
 */
app.post('/send-eod', requireAuth, async (req, res) => {
  const { phone, message } = req.body

  if (!phone || typeof phone !== 'string') {
    res.status(400).json({ success: false, error: 'Missing or invalid phone number', errorCode: 'invalid_phone' })
    return
  }

  if (!message || typeof message !== 'string' || message.length < 10) {
    res.status(400).json({ success: false, error: 'Missing or too-short message text', errorCode: 'send_failed' })
    return
  }

  if (isSending) {
    res.status(409).json({ success: false, error: 'Another message is currently being sent. Please wait.', errorCode: 'send_failed' })
    return
  }

  isSending = true
  console.log(`\n${'━'.repeat(60)}`)
  console.log(`📤 Send request received`)
  console.log(`   Phone: +${phone.replace(/\D/g, '')}`)
  console.log(`   Message length: ${message.length} chars`)
  console.log(`${'━'.repeat(60)}`)

  try {
    const result = await sendWhatsAppMessage(phone, message)

    if (result.success) {
      console.log(`✅ Message sent successfully at ${result.sentAt}`)
    } else {
      console.log(`❌ Send failed: ${result.error}`)
    }

    res.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('💥 Unexpected error:', msg)
    res.status(500).json({ success: false, error: msg, errorCode: 'browser_error' })
  } finally {
    isSending = false
  }
})

// ── Start ──────────────────────────────────────────────────────────────────────

app.listen(PORT, '127.0.0.1', () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║        LEADWISE — WhatsApp Automation Agent v1.0             ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Agent running on:  http://localhost:${PORT}                   ║
║  Health check:      GET  http://localhost:${PORT}/health       ║
║  Send EOD:          POST http://localhost:${PORT}/send-eod     ║
║                                                              ║
║  Auth Token:        ${AUTH_TOKEN.slice(0, 20)}...              ║
║  Browser Profile:   ~/.leadwise-whatsapp/chrome-profile      ║
║                                                              ║
║  Press Ctrl+C to stop the agent.                             ║
╚══════════════════════════════════════════════════════════════╝
`)

  console.log('💡 First time? The agent will open WhatsApp Web and ask you to scan QR.')
  console.log('   After that, sessions are saved and you won\'t need to scan again.\n')
  console.log(`🔑 Set this token in your CRM .env:`)
  console.log(`   WHATSAPP_AGENT_TOKEN="${AUTH_TOKEN}"\n`)
})
