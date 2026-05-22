import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function PUT(request: Request) {
  const body = await request.json()
  console.log('Reorder body received:', body) // ← see what's coming in

  const { orderedIds } = body

  if (!orderedIds || !Array.isArray(orderedIds)) {
    return NextResponse.json({ error: 'Invalid orderedIds' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (let i = 0; i < orderedIds.length; i++) {
      console.log(`Updating id=${orderedIds[i]} to sort_order=${i}`) // ← see each update
      await client.query(
        'UPDATE projects SET sort_order = $1 WHERE id = $2',
        [i, orderedIds[i]]
      )
    }
    await client.query('COMMIT')
    return NextResponse.json({ success: true })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Reorder DB error:', error) // ← see the actual SQL error
    return NextResponse.json({ error: String(error) }, { status: 500 })
  } finally {
    client.release()
  }
}