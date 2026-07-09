import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { image_url, title, description, video_url, project_type, constructed_date, location, client_name } = await request.json()
    const result = await pool.query(
      'UPDATE projects SET image_url=$1, title=$2, description=$3, video_url=$4, project_type=$5, constructed_date=$6, location=$7, client_name=$8 WHERE id=$9 RETURNING *',
      [image_url, title, description, video_url, project_type || null, constructed_date || null, location || null, client_name || null, id]
    )
    return NextResponse.json(result.rows[0])
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await pool.query('DELETE FROM projects WHERE id=$1', [id])
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}