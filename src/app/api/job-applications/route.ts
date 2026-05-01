import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT ja.id, ja.full_name, ja.email, ja.phone, ja.cover_letter, ja.resume_url,
             j.title as job_title, ja.created_at
      FROM job_applications ja
      LEFT JOIN jobs j ON ja.job_id = j.id
      ORDER BY ja.created_at DESC
    `)
    return NextResponse.json(result.rows)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}