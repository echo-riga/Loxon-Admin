import { NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET – automatically returns entity_type because of SELECT *
export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM clients ORDER BY created_at DESC')
    return NextResponse.json(result.rows)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

// POST – now includes entity_type
export async function POST(request: Request) {
  try {
    const { image_url, title, description, link, entity_type } = await request.json()
    const result = await pool.query(
      `INSERT INTO clients (image_url, title, description, link, entity_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [image_url, title, description, link, entity_type || 'partner']
    )
    return NextResponse.json(result.rows[0])
  } catch {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}