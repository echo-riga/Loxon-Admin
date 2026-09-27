import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getAdminFromRequest, requireAdmin } from '@/lib/admin-auth'
import { applyRateLimit, rateLimitIdentifier, rateLimits } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])

export async function POST(request: Request) {
  try {
    const denied = await requireAdmin(request)
    if (denied) return denied
    const session = await getAdminFromRequest(request)
    const limited = await applyRateLimit(rateLimits.upload, rateLimitIdentifier(request, 'upload', session?.email || ''), true)
    if (limited) return limited
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Image uploads are not configured. Ask an administrator to add the Cloudinary environment variables.' }, { status: 503 })
    }
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'No image file was provided.' }, { status: 400 })
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Unsupported image type. Use JPG, PNG, WebP, GIF, or AVIF.' }, { status: 415 })
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Image must be between 1 byte and 8 MB.' }, { status: 413 })

    const bytes = new Uint8Array(await file.arrayBuffer())
    const signatures: Record<string, number[]> = {
      'image/jpeg': [0xff, 0xd8, 0xff], 'image/png': [0x89, 0x50, 0x4e, 0x47],
      'image/gif': [0x47, 0x49, 0x46, 0x38], 'image/webp': [0x52, 0x49, 0x46, 0x46],
      'image/avif': [0x00, 0x00, 0x00],
    }
    if (!signatures[file.type].every((byte, index) => bytes[index] === byte)) {
      return NextResponse.json({ error: 'The selected file does not appear to be a valid image.' }, { status: 400 })
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const folder = 'loxon-admin'
    const signature = createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest('hex')
    const cloudinaryForm = new FormData()
    cloudinaryForm.append('file', new Blob([bytes], { type: file.type }), file.name)
    cloudinaryForm.append('api_key', apiKey)
    cloudinaryForm.append('timestamp', String(timestamp))
    cloudinaryForm.append('folder', folder)
    cloudinaryForm.append('signature', signature)
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, { method: 'POST', body: cloudinaryForm, cache: 'no-store' })
    const result = await response.json() as { secure_url?: string; public_id?: string; width?: number; height?: number; format?: string }
    if (!response.ok || !result.secure_url) {
      console.error('Cloudinary upload failed with status', response.status)
      return NextResponse.json({ error: 'The image host rejected the upload. Check the server configuration and try again.' }, { status: 502 })
    }
    return NextResponse.json({ secureUrl: result.secure_url, publicId: result.public_id, width: result.width, height: result.height, format: result.format })
  } catch (error) {
    console.error('Image upload failed:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Unable to upload the image right now.' }, { status: 500 })
  }
}
