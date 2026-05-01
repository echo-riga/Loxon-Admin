import { NextResponse } from 'next/server'
import pool from '@/lib/db'
 
export async function POST(request: Request) {
  try {
    const { title, description, image_url } = await request.json()
    const company = await pool.query('SELECT id FROM our_company ORDER BY id LIMIT 1')
    if (company.rows.length === 0) return NextResponse.json({ error: 'No company record' }, { status: 404 })
    const result = await pool.query(
      'INSERT INTO our_company_sections (our_company_id, title, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [company.rows[0].id, title, description, image_url]
    )
    return NextResponse.json(result.rows[0])
  } catch {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}