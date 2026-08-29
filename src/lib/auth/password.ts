import bcrypt from 'bcryptjs'

/**
 * Password hashing. bcryptjs is pure JS so it works identically on Windows dev
 * machines and on Vercel's Node runtime with no native build step.
 *
 * Cost 12 ≈ 250ms on modern hardware: slow enough to be expensive to brute
 * force, fast enough for an interactive login.
 */
const COST = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}

export interface PasswordCheck {
  ok: boolean
  message?: string
}

/** Server-side password policy, shared by signup-by-owner and self-service change. */
export function checkPasswordStrength(plain: string): PasswordCheck {
  if (plain.length < 8) {
    return { ok: false, message: 'Password must be at least 8 characters.' }
  }
  if (plain.length > 100) {
    return { ok: false, message: 'Password must be under 100 characters.' }
  }
  if (!/[a-zA-Z]/.test(plain)) {
    return { ok: false, message: 'Password must contain at least one letter.' }
  }
  if (!/[0-9]/.test(plain)) {
    return { ok: false, message: 'Password must contain at least one number.' }
  }
  return { ok: true }
}
