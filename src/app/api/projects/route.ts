import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', pi.id, 
              'image_url', pi.image_url, 
              'caption', pi.caption, 
              'display_order', pi.display_order
            ) ORDER BY pi.display_order
          )
          FROM project_images pi WHERE pi.project_id = p.id),
          '[]'::json
        ) as images
      FROM projects p
      ORDER BY p.sort_order ASC, p.created_at ASC
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { image_url, title, description, video_url, project_type, constructed_date, location, client_name } = await request.json()
    const countResult = await pool.query('SELECT COUNT(*) FROM projects')
    const nextOrder = parseInt(countResult.rows[0].count, 10)
    const result = await pool.query(
      'INSERT INTO projects (image_url, title, description, video_url, project_type, constructed_date, location, client_name, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [image_url, title, description, video_url, project_type || null, constructed_date || null, location || null, client_name || null, nextOrder]
    )
    return NextResponse.json(result.rows[0])
  } catch {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}