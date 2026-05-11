import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await pool.query(
    `SELECT id, image_url, caption, display_order 
     FROM project_images 
     WHERE project_id = $1 
     ORDER BY display_order ASC`,
    [id]
  )
  return NextResponse.json(result.rows)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { image_url, caption } = await request.json()
  if (!image_url) {
    return NextResponse.json({ error: 'Image URL required' }, { status: 400 })
  }
  const result = await pool.query(
    `INSERT INTO project_images (project_id, image_url, caption, display_order)
     VALUES ($1, $2, $3, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM project_images WHERE project_id = $1))
     RETURNING *`,
    [id, image_url, caption || null]
  )
  return NextResponse.json(result.rows[0])
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params // this is the image id, not project id
  await pool.query('DELETE FROM project_images WHERE id = $1', [id])
  return NextResponse.json({ success: true })
}