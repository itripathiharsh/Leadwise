import { describe, it, expect } from 'vitest'
import robots from '../../src/app/robots'
import sitemap from '../../src/app/sitemap'

describe('SEO Configuration Tests', () => {
  it('robots() disallows internal dashboard and api routes while allowing public routes', () => {
    const config = robots()
    expect(config.rules).toBeDefined()
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules
    expect(rules.allow).toContain('/login')
    expect(rules.allow).toContain('/signup')
    expect(rules.disallow).toContain('/api/')
    expect(rules.disallow).toContain('/dashboard')
    expect(rules.disallow).toContain('/pipeline')
    expect(config.sitemap).toBeDefined()
  })

  it('sitemap() outputs canonical entries for all public onboarding routes', () => {
    const entries = sitemap()
    expect(entries.length).toBeGreaterThanOrEqual(3)
    const urls = entries.map((e) => e.url)
    expect(urls.some((u) => u.endsWith('/login'))).toBe(true)
    expect(urls.some((u) => u.endsWith('/signup'))).toBe(true)
    expect(urls.some((u) => u.endsWith('/awaiting-approval'))).toBe(true)
  })
})
