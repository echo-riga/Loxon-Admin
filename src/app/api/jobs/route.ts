import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { publicContentResponse } from '@/lib/public-content-response'
import { requireAdmin } from '@/lib/admin-auth'
import { optionalString, readJsonObject, requiredString, validationResponse } from '@/lib/validation'
 
export async function GET(request: Request) {
  try {
    const result = await pool.query('SELECT * FROM jobs ORDER BY sort_order ASC NULLS LAST, created_at DESC, id DESC')
    return publicContentResponse(request, result.rows)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
 
export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const body = await readJsonObject(request, 24 * 1024)
    const title = requiredString(body, 'title', 'Job title', 160)
    const description = optionalString(body, 'description', 'Description', 10_000)
    const result = await pool.query(
      'INSERT INTO jobs (title, description, sort_order) VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM jobs)) RETURNING *',
      [title, description]
    )
    return NextResponse.json(result.rows[0])
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
