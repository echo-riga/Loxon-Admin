import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'
import { ValidationError, positiveInteger, readJsonObject, validationResponse } from '@/lib/validation'

export async function PUT(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  let orderedIds: number[]
  try {
    const body = await readJsonObject(request, 16 * 1024)
    if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0 || body.orderedIds.length > 1_000) {
      throw new ValidationError('Ordered project IDs must be a non-empty array with at most 1,000 items.')
    }
    orderedIds = body.orderedIds.map(id => positiveInteger(id, 'Project ID'))
    if (new Set(orderedIds).size !== orderedIds.length) throw new ValidationError('Ordered project IDs must not contain duplicates.')
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    return NextResponse.json({ error: 'Invalid reorder request.' }, { status: 400 })
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
