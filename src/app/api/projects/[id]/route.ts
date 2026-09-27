import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'
import { optionalDate, optionalHttpsUrl, optionalString, positiveInteger, readJsonObject, requiredString, validationResponse } from '@/lib/validation'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const { id: idText } = await params
    const id = positiveInteger(idText, 'Project ID')
    const body = await readJsonObject(request, 40 * 1024)
    const image_url = optionalHttpsUrl(body, 'image_url', 'Image URL')
    const title = requiredString(body, 'title', 'Title', 160)
    const description = optionalString(body, 'description', 'Description', 10_000)
    const video_url = optionalHttpsUrl(body, 'video_url', 'Video URL')
    const project_type = optionalString(body, 'project_type', 'Project type', 160)
    const constructed_date = optionalDate(body, 'constructed_date', 'Constructed date')
    const location = optionalString(body, 'location', 'Location', 200)
    const client_name = optionalString(body, 'client_name', 'Client name', 160)
    const result = await pool.query(
      'UPDATE projects SET image_url=$1, title=$2, description=$3, video_url=$4, project_type=$5, constructed_date=$6, location=$7, client_name=$8 WHERE id=$9 RETURNING *',
      [image_url, title, description, video_url, project_type || null, constructed_date || null, location || null, client_name || null, id]
    )
    if (!result.rows[0]) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const { id: idText } = await params
    const id = positiveInteger(idText, 'Project ID')
    const result = await pool.query('DELETE FROM projects WHERE id=$1', [id])
    if (!result.rowCount) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
