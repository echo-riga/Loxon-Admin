import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { publicContentResponse } from '@/lib/public-content-response'
import { requireAdmin } from '@/lib/admin-auth'
import { optionalString, optionalHttpsUrl, positiveInteger, readJsonObject, validationResponse } from '@/lib/validation'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idText } = await params
    const id = positiveInteger(idText, 'Project ID')
    const result = await pool.query(
      `SELECT id, image_url, caption, display_order
       FROM project_images
       WHERE project_id = $1
       ORDER BY display_order ASC`,
      [id]
    )
    return publicContentResponse(request, result.rows)
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    return NextResponse.json({ error: 'Failed to fetch project images.' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const { id: idText } = await params
    const id = positiveInteger(idText, 'Project ID')
    const body = await readJsonObject(request, 8 * 1024)
    const image_url = optionalHttpsUrl(body, 'image_url', 'Image URL')
    if (!image_url) return NextResponse.json({ error: 'Image URL is required.' }, { status: 400 })
    const caption = optionalString(body, 'caption', 'Caption', 500)
    const project = await pool.query('SELECT 1 FROM projects WHERE id = $1', [id])
    if (!project.rows[0]) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    const result = await pool.query(
      `INSERT INTO project_images (project_id, image_url, caption, display_order)
       VALUES ($1, $2, $3, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM project_images WHERE project_id = $1))
       RETURNING *`,
      [id, image_url, caption]
    )
    return NextResponse.json(result.rows[0])
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    return NextResponse.json({ error: 'Failed to add project image.' }, { status: 500 })
  }
}
