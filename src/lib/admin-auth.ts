import { pbkdf2Sync, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { adminSession, readCookie, verifySessionToken } from '@/lib/session'

export function verifyAdminCredentials(email: string, password: string) {
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const encodedHash = process.env.ADMIN_PASSWORD_HASH
  if (!expectedEmail || !encodedHash || email.trim().toLowerCase() !== expectedEmail) return false

  const [algorithm, iterationsText, saltText, hashText] = encodedHash.split(':')
  const iterations = Number(iterationsText)
  if (algorithm !== 'pbkdf2-sha256' || !Number.isSafeInteger(iterations) || iterations < 100_000 || !saltText || !hashText) return false

  try {
    const salt = Buffer.from(saltText, 'base64')
    const expected = Buffer.from(hashText, 'base64')
    const actual = pbkdf2Sync(password, salt, iterations, expected.length, 'sha256')
    return expected.length > 0 && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

export async function getAdminFromRequest(request: Request) {
  const token = readCookie(request.headers.get('cookie'), adminSession.cookieName)
  return verifySessionToken(token)
}

export async function requireAdmin(request: Request) {
  const session = await getAdminFromRequest(request)
  if (session) return null
  return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
}
