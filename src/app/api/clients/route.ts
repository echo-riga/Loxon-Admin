import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { publicContentResponse } from '@/lib/public-content-response'
import { requireAdmin } from '@/lib/admin-auth'
import { oneOf, optionalHttpsUrl, optionalString, readJsonObject, requiredString, validationResponse } from '@/lib/validation'

// GET – automatically returns entity_type because of SELECT *
export async function GET(request: Request) {
  try {
    const result = await pool.query('SELECT * FROM clients ORDER BY created_at DESC')
    return publicContentResponse(request, result.rows)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

// POST – now includes entity_type
export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const body = await readJsonObject(request, 32 * 1024)
    const image_url = optionalHttpsUrl(body, 'image_url', 'Image URL')
    const title = requiredString(body, 'title', 'Company name', 160)
    const description = optionalString(body, 'description', 'Description', 5_000)
    const link = optionalHttpsUrl(body, 'link', 'Website link')
    const entity_type = oneOf(body, 'entity_type', 'Entity type', ['partner', 'membership'] as const, 'partner')
    const result = await pool.query(
      `INSERT INTO clients (image_url, title, description, link, entity_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [image_url, title, description, link, entity_type || 'partner']
    )
    return NextResponse.json(result.rows[0])
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
