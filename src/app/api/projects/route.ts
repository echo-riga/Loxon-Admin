import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { publicContentResponse } from '@/lib/public-content-response'
import { requireAdmin } from '@/lib/admin-auth'
import { optionalDate, optionalHttpsUrl, optionalString, readJsonObject, requiredString, validationResponse } from '@/lib/validation'

export async function GET(request: Request) {
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
    return publicContentResponse(request, result.rows)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const body = await readJsonObject(request, 40 * 1024)
    const image_url = optionalHttpsUrl(body, 'image_url', 'Image URL')
    const title = requiredString(body, 'title', 'Title', 160)
    const description = optionalString(body, 'description', 'Description', 10_000)
    const video_url = optionalHttpsUrl(body, 'video_url', 'Video URL')
    const project_type = optionalString(body, 'project_type', 'Project type', 160)
    const constructed_date = optionalDate(body, 'constructed_date', 'Constructed date')
    const location = optionalString(body, 'location', 'Location', 200)
    const client_name = optionalString(body, 'client_name', 'Client name', 160)
    const orderResult = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM projects')
    const nextOrder = Number(orderResult.rows[0].next_order)
    const result = await pool.query(
      'INSERT INTO projects (image_url, title, description, video_url, project_type, constructed_date, location, client_name, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [image_url, title, description, video_url, project_type || null, constructed_date || null, location || null, client_name || null, nextOrder]
    )
    return NextResponse.json(result.rows[0])
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
