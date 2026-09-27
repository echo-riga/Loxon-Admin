import { NextResponse } from 'next/server'
import { verifyAdminCredentials } from '@/lib/admin-auth'
import { applyRateLimit, rateLimitIdentifier, rateLimits } from '@/lib/rate-limit'
import { adminSession, createSessionToken } from '@/lib/session'

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid login request.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const limited = await applyRateLimit(rateLimits.login, rateLimitIdentifier(request, 'login', email), true)
  if (limited) return limited
  if (!email || !password || !verifyAdminCredentials(email, password)) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(adminSession.cookieName, await createSessionToken(email), adminSession.cookieOptions)
  return response
}
