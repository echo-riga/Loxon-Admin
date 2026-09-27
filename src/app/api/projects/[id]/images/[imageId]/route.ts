import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  const { imageId } = await params
  await pool.query('DELETE FROM project_images WHERE id = $1', [imageId])
  return NextResponse.json({ success: true })
}
