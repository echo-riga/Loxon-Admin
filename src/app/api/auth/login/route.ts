import { NextResponse } from 'next/server'
import { verifyAdminCredentials } from '@/lib/admin-auth'
import { applyRateLimit, rateLimitIdentifier, rateLimits } from '@/lib/rate-limit'
import { adminSession, createSessionToken } from '@/lib/session'
import { ValidationError, emailString, readJsonObject, validationResponse } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 4 * 1024)
    const email = emailString(body)
    if (typeof body.password !== 'string' || body.password.length === 0 || body.password.length > 256) {
      throw new ValidationError('Invalid login request.')
    }
    const password = body.password
    const limited = await applyRateLimit(rateLimits.login, rateLimitIdentifier(request, 'login', email), true)
    if (limited) return limited
    if (!verifyAdminCredentials(email, password)) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(adminSession.cookieName, await createSessionToken(email), adminSession.cookieOptions)
    return response
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    return NextResponse.json({ error: 'Unable to sign in.' }, { status: 500 })
  }
}
