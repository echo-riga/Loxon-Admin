import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { image_url, title, description, link, entity_type } = await request.json()
    const result = await pool.query(
      `UPDATE clients
       SET image_url = $1, title = $2, description = $3, link = $4, entity_type = $5
       WHERE id = $6 RETURNING *`,
      [image_url, title, description, link, entity_type, id]
    )
    return NextResponse.json(result.rows[0])
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await pool.query('DELETE FROM clients WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}