import { NextResponse } from 'next/server'
import pool from '@/lib/db'
 
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL is not set' }, { status: 500 })
  }
  try {
    await pool.query('SELECT 1')
    return NextResponse.json({ ok: true, message: 'DB connected successfully' })
  } catch (e: unknown) {
    return NextResponse.json({ error: 'DB connection failed', detail: String(e) }, { status: 500 })
  }
}