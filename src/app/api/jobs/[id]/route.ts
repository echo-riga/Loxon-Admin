import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'
import { optionalString, positiveInteger, readJsonObject, requiredString, validationResponse } from '@/lib/validation'
 
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const { id: idText } = await params
    const id = positiveInteger(idText, 'Job ID')
    const body = await readJsonObject(request, 24 * 1024)
    const title = requiredString(body, 'title', 'Job title', 160)
    const description = optionalString(body, 'description', 'Description', 10_000)
    const result = await pool.query(
      'UPDATE jobs SET title=$1, description=$2 WHERE id=$3 RETURNING *',
      [title, description, id]
    )
    if (!result.rows[0]) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
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
    const id = positiveInteger(idText, 'Job ID')
    const result = await pool.query('DELETE FROM jobs WHERE id=$1', [id])
    if (!result.rowCount) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
