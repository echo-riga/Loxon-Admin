import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'

export async function PUT(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  const body = await request.json()
  const { orderedIds } = body

  if (
    !Array.isArray(orderedIds) ||
    orderedIds.length === 0 ||
    orderedIds.some((id) => !Number.isInteger(id) || id <= 0) ||
    new Set(orderedIds).size !== orderedIds.length
  ) {
    return NextResponse.json({ error: 'Invalid orderedIds' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        'UPDATE projects SET sort_order = $1 WHERE id = $2',
        [i, orderedIds[i]],
      )
    }
    await client.query('COMMIT')
    return NextResponse.json({ success: true })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Failed to reorder projects:', error)
    return NextResponse.json({ error: 'Failed to reorder projects.' }, { status: 500 })
  } finally {
    client.release()
  }
}
