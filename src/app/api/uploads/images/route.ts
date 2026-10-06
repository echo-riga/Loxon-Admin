import { createHash, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getAdminFromRequest, requireAdmin } from '@/lib/admin-auth'
import { applyRateLimit, rateLimitIdentifier, rateLimits } from '@/lib/rate-limit'
import { imageUploadError } from '@/lib/image-upload-policy'
import { readJsonObject, validationResponse } from '@/lib/validation'

export const runtime = 'nodejs'

// Only metadata reaches this endpoint. The browser sends file bytes to Cloudinary.
export async function POST(request: Request) {
  try {
    const denied = await requireAdmin(request)
    if (denied) return denied
    const session = await getAdminFromRequest(request)
    const limited = await applyRateLimit(rateLimits.upload, rateLimitIdentifier(request, 'upload', session?.email || ''), true)
    if (limited) return limited
    const body = await readJsonObject(request, 2048)
    const invalid = imageUploadError(body.type, body.size)
    if (invalid) return NextResponse.json({ error: invalid.message }, { status: invalid.status })

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Image uploads are not configured. Ask an administrator to add the Cloudinary environment variables.' }, { status: 503 })
    }
    const params = {
      allowed_formats: 'jpg,png,webp,gif,avif',
      folder: 'loxon-admin',
      overwrite: 'false',
      public_id: randomUUID(),
      timestamp: String(Math.floor(Date.now() / 1000)),
    }
    const toSign = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&')
    const signature = createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex')
    return NextResponse.json({
      uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      params: { ...params, api_key: apiKey, signature },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    console.error('Image upload signing failed:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Unable to prepare the image upload right now.' }, { status: 500 })
  }
}
