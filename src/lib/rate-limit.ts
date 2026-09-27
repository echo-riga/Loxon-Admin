import { createHash } from 'node:crypto'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
const redis = hasRedis ? Redis.fromEnv() : null

function limiter(tokens: number, window: Parameters<typeof Ratelimit.slidingWindow>[1], prefix: string) {
  return redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(tokens, window), prefix, analytics: false }) : null
}

export const rateLimits = {
  login: limiter(5, '15 m', 'loxon:login'),
  contact: limiter(5, '1 h', 'loxon:contact'),
  job: limiter(3, '1 h', 'loxon:job'),
  upload: limiter(30, '10 m', 'loxon:upload'),
  chatBurst: limiter(20, '1 m', 'loxon:chat:burst'),
  chatHourly: limiter(200, '1 h', 'loxon:chat:hour'),
}

export function clientIp(request: Request) {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
}

export function rateLimitIdentifier(request: Request, scope: string, secondary = '') {
  return createHash('sha256').update(`${scope}:${clientIp(request)}:${secondary.trim().toLowerCase()}`).digest('hex')
}

type LimitResult = Awaited<ReturnType<Ratelimit['limit']>>

export async function applyRateLimit(activeLimiter: Ratelimit | null, identifier: string, failClosed = false) {
  if (!activeLimiter) {
    if (failClosed) return NextResponse.json({ error: 'Rate limiting is not configured.' }, { status: 503 })
    return null
  }

  let result: LimitResult
  try {
    result = await activeLimiter.limit(identifier)
  } catch (error) {
    console.error('Rate-limit service error:', error)
    if (failClosed) return NextResponse.json({ error: 'Unable to verify this request right now.' }, { status: 503 })
    return null
  }

  if (result.success) return null
  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.', retryAfter },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
      },
    },
  )
}
