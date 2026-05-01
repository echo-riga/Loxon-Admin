import { NextResponse } from 'next/server'
import pool from '@/lib/db'
 
export async function GET() {
  try {
    const company = await pool.query('SELECT * FROM our_company ORDER BY id LIMIT 1')
    if (company.rows.length === 0) {
      const inserted = await pool.query("INSERT INTO our_company (description) VALUES ('') RETURNING *")
      const sections = await pool.query('SELECT * FROM our_company_sections WHERE our_company_id=$1 ORDER BY created_at', [inserted.rows[0].id])
      return NextResponse.json({ ...inserted.rows[0], sections: sections.rows })
    }
    const sections = await pool.query('SELECT * FROM our_company_sections WHERE our_company_id=$1 ORDER BY created_at', [company.rows[0].id])
    return NextResponse.json({ ...company.rows[0], sections: sections.rows })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
 
export async function PUT(request: Request) {
  try {
    const { cover_pic, description } = await request.json()
    const company = await pool.query('SELECT id FROM our_company ORDER BY id LIMIT 1')
    if (company.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const result = await pool.query(
      'UPDATE our_company SET cover_pic=$1, description=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [cover_pic, description, company.rows[0].id]
    )
    return NextResponse.json(result.rows[0])
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}