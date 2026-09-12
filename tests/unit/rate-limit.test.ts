import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, getClientIp } from '../../src/lib/rate-limit'

describe('Rate Limiter & IP Parsing', () => {
  it('allows requests within limit and decrements remaining', () => {
    const id = `test-ip-${Date.now()}`
    const first = checkRateLimit(id, 5, 10000)
    expect(first.ok).toBe(true)
    expect(first.remaining).toBe(4)

    const second = checkRateLimit(id, 5, 10000)
    expect(second.ok).toBe(true)
    expect(second.remaining).toBe(3)
  })

  it('blocks requests exceeding limit', () => {
    const id = `blocked-ip-${Date.now()}`
    for (let i = 0; i < 3; i++) {
      checkRateLimit(id, 3, 10000)
    }
    const fourth = checkRateLimit(id, 3, 10000)
    expect(fourth.ok).toBe(false)
    expect(fourth.remaining).toBe(0)
  })

  it('correctly extracts client IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
    })
    expect(getClientIp(req)).toBe('203.0.113.195')
  })

  it('extracts client IP from x-real-ip when x-forwarded-for is missing', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '198.51.100.42' },
    })
    expect(getClientIp(req)).toBe('198.51.100.42')
  })

  it('falls back to unknown when no headers are present', () => {
    const req = new Request('http://localhost')
    expect(getClientIp(req)).toBe('unknown')
  })
})
