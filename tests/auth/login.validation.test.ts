import { describe, it, expect } from 'vitest'
import { loginSchema } from '../../src/lib/validation'

describe('Login Payload Validation', () => {
  it('rejects payload with missing email', () => {
    const result = loginSchema.safeParse({ password: 'Password123' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined()
    }
  })

  it('rejects payload with invalid email format', () => {
    const invalidEmails = ['not-an-email', 'user@', '@domain.com', 'user@domain']
    for (const email of invalidEmails) {
      const result = loginSchema.safeParse({ email, password: 'Password123' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.email).toBeDefined()
      }
    }
  })

  it('rejects payload with empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toBeDefined()
    }
  })

  it('rejects payload with non-string data types', () => {
    const result = loginSchema.safeParse({ email: 12345, password: true })
    expect(result.success).toBe(false)
  })

  it('accepts and normalizes a valid login payload', () => {
    const result = loginSchema.safeParse({
      email: '  Harsh@SentioMind.COM  ',
      password: 'Sentio@123',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('harsh@sentiomind.com')
      expect(result.data.password).toBe('Sentio@123')
    }
  })
})
