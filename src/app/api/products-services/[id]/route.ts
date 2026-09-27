import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'
import { optionalHttpsUrl, optionalString, positiveInteger, readJsonObject, requiredString, validationResponse } from '@/lib/validation'
 
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const { id: idText } = await params
    const id = positiveInteger(idText, 'Product or service ID')
    const body = await readJsonObject(request, 32 * 1024)
    const image_url = optionalHttpsUrl(body, 'image_url', 'Image URL')
    const title = requiredString(body, 'title', 'Title', 160)
    const description = optionalString(body, 'description', 'Description', 10_000)
    const video_url = optionalHttpsUrl(body, 'video_url', 'Video URL')
    const result = await pool.query(
      'UPDATE products_services SET image_url=$1, title=$2, description=$3, video_url=$4 WHERE id=$5 RETURNING *',
      [image_url, title, description, video_url, id]
    )
    if (!result.rows[0]) return NextResponse.json({ error: 'Product or service not found.' }, { status: 404 })
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
    const id = positiveInteger(idText, 'Product or service ID')
    const result = await pool.query('DELETE FROM products_services WHERE id=$1', [id])
    if (!result.rowCount) return NextResponse.json({ error: 'Product or service not found.' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
