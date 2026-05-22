import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { imageId } = await params
  await pool.query('DELETE FROM project_images WHERE id = $1', [imageId])
  return NextResponse.json({ success: true })
}