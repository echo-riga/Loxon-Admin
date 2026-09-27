import { NextRequest, NextResponse } from 'next/server'
import { adminSession, verifySessionToken } from '@/lib/session'

function allowedOrigins(request: NextRequest) {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
  return new Set([request.nextUrl.origin, 'http://localhost:3000', 'http://localhost:3001', ...configured])
}

function corsHeaders(response: NextResponse, origin: string | null) {
  if (!origin) return response
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  response.headers.set('Access-Control-Max-Age', '86400')
  response.headers.set('Vary', 'Origin')
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')?.replace(/\/$/, '') || null

  if (pathname.startsWith('/api/')) {
    if (origin && !allowedOrigins(request).has(origin)) {
      return NextResponse.json({ error: 'Origin is not allowed.' }, { status: 403 })
    }
    if (request.method === 'OPTIONS') return corsHeaders(new NextResponse(null, { status: 204 }), origin)
    return corsHeaders(NextResponse.next(), origin)
  }

  const session = await verifySessionToken(request.cookies.get(adminSession.cookieName)?.value)
  if (pathname === '/login') {
    if (session) return NextResponse.redirect(new URL('/', request.url))
    return NextResponse.next()
  }
  if (!session) {
    const login = new URL('/login', request.url)
    login.searchParams.set('from', pathname)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
