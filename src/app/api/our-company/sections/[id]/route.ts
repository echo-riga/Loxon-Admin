import { NextResponse } from 'next/server'
import pool from '@/lib/db'
 
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { title, description, image_url } = await request.json()
    const result = await pool.query(
      'UPDATE our_company_sections SET title=$1, description=$2, image_url=$3 WHERE id=$4 RETURNING *',
      [title, description, image_url, id]
    )
    return NextResponse.json(result.rows[0])
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
 
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await pool.query('DELETE FROM our_company_sections WHERE id=$1', [id])
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}