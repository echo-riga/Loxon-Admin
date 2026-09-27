const SESSION_COOKIE = 'loxon_admin_session'
const SESSION_SECONDS = 60 * 60 * 8

type SessionPayload = {
  email: string
  expiresAt: number
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

async function signingKey() {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret || secret.length < 32) throw new Error('ADMIN_SESSION_SECRET must contain at least 32 characters.')
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function createSessionToken(email: string) {
  const payload: SessionPayload = { email, expiresAt: Date.now() + SESSION_SECONDS * 1000 }
  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign('HMAC', await signingKey(), encoder.encode(encodedPayload))
  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`
}

export async function verifySessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null
  const [encodedPayload, encodedSignature, extra] = token.split('.')
  if (!encodedPayload || !encodedSignature || extra) return null

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await signingKey(),
      base64UrlToBytes(encodedSignature),
      encoder.encode(encodedPayload),
    )
    if (!valid) return null
    const payload = JSON.parse(decoder.decode(base64UrlToBytes(encodedPayload))) as SessionPayload
    if (!payload.email || !Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim())
  }
  return null
}

export const adminSession = {
  cookieName: SESSION_COOKIE,
  maxAge: SESSION_SECONDS,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_SECONDS,
    priority: 'high' as const,
  },
}
