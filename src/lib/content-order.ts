import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'
import { ValidationError, positiveInteger, readJsonObject, validationResponse } from '@/lib/validation'

type OrderedTable = 'products_services' | 'clients' | 'jobs'

export async function reorderContent(request: Request, table: OrderedTable) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  let orderedIds: number[]
  try {
    const body = await readJsonObject(request, 16 * 1024)
    if (!Array.isArray(body.orderedIds) || !body.orderedIds.length || body.orderedIds.length > 1000) {
      throw new ValidationError('Ordered IDs must contain between 1 and 1,000 records.')
    }
    orderedIds = body.orderedIds.map(id => positiveInteger(id, 'Record ID'))
    if (new Set(orderedIds).size !== orderedIds.length) throw new ValidationError('Ordered IDs must not contain duplicates.')
  } catch (error) {
    return validationResponse(error) || NextResponse.json({ error: 'Invalid reorder request.' }, { status: 400 })
  }

  // Table names are code constants, never request input.
  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    // Serialize reorders and hold inserts/deletes until the complete order is saved.
    await client.query(`LOCK TABLE ${table} IN SHARE ROW EXCLUSIVE MODE`)
    const records = await client.query<{ id: number }>(`SELECT id FROM ${table}`)
    const currentIds = new Set(records.rows.map(row => row.id))
    if (currentIds.size !== orderedIds.length || orderedIds.some(id => !currentIds.has(id))) {
      throw new ValidationError('Records have changed. Refresh the list and try again.', 409)
    }
    await client.query(`
      UPDATE ${table} AS record SET sort_order = ordered.position::integer - 1
      FROM unnest($1::integer[]) WITH ORDINALITY AS ordered(id, position)
      WHERE record.id = ordered.id
    `, [orderedIds])
    await client.query('COMMIT')
    return NextResponse.json({ success: true })
  } catch (error) {
    if (client) await client.query('ROLLBACK')
    const invalid = validationResponse(error)
    if (invalid) return invalid
    console.error('Failed to save content order:', error)
    return NextResponse.json({ error: 'Unable to save order.' }, { status: 500 })
  } finally {
    client?.release()
  }
}
