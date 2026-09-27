import { NextResponse } from 'next/server'
import { adminSession } from '@/lib/session'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(adminSession.cookieName, '', { ...adminSession.cookieOptions, maxAge: 0 })
  return response
}
