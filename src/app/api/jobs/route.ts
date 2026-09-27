import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'
 
export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM jobs ORDER BY created_at DESC')
    return NextResponse.json(result.rows)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
 
export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const { title, description } = await request.json()
    const result = await pool.query(
      'INSERT INTO jobs (title, description) VALUES ($1, $2) RETURNING *',
      [title, description]
    )
    return NextResponse.json(result.rows[0])
  } catch {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
