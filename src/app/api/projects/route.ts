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
      ORDER BY p.created_at DESC
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { image_url, title, description, video_url } = await request.json()
    const result = await pool.query(
      'INSERT INTO projects (image_url, title, description, video_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [image_url, title, description, video_url]
    )
    return NextResponse.json(result.rows[0])
  } catch {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}