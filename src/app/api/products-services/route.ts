import { NextResponse } from 'next/server'
import pool from '@/lib/db'
 
export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM products_services ORDER BY created_at DESC')
    return NextResponse.json(result.rows)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
 
export async function POST(request: Request) {
  try {
    const { image_url, title, description, video_url } = await request.json()
    const result = await pool.query(
      'INSERT INTO products_services (image_url, title, description, video_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [image_url, title, description, video_url]
    )
    return NextResponse.json(result.rows[0])
  } catch {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}