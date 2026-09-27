import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'
import { positiveInteger, validationResponse } from '@/lib/validation'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const { id: idText, imageId: imageIdText } = await params
    const id = positiveInteger(idText, 'Project ID')
    const imageId = positiveInteger(imageIdText, 'Image ID')
    const result = await pool.query('DELETE FROM project_images WHERE id = $1 AND project_id = $2', [imageId, id])
    if (!result.rowCount) return NextResponse.json({ error: 'Project image not found.' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    return NextResponse.json({ error: 'Failed to delete project image.' }, { status: 500 })
  }
}
