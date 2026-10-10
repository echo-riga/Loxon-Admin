import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { publicContentResponse } from '@/lib/public-content-response'
import { requireAdmin } from '@/lib/admin-auth'
import { optionalHttpsUrl, optionalString, readJsonObject, requiredString, validationResponse } from '@/lib/validation'
 
export async function GET(request: Request) {
  try {
    const result = await pool.query('SELECT * FROM products_services ORDER BY sort_order ASC NULLS LAST, created_at DESC, id DESC')
    return publicContentResponse(request, result.rows)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
 
export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const body = await readJsonObject(request, 32 * 1024)
    const image_url = optionalHttpsUrl(body, 'image_url', 'Image URL')
    const title = requiredString(body, 'title', 'Title', 160)
    const description = optionalString(body, 'description', 'Description', 10_000)
    const video_url = optionalHttpsUrl(body, 'video_url', 'Video URL')
    const result = await pool.query(
      'INSERT INTO products_services (image_url, title, description, video_url, sort_order) VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM products_services)) RETURNING *',
      [image_url, title, description, video_url]
    )
    return NextResponse.json(result.rows[0])
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
