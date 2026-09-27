import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { sendContactNotification } from '@/lib/email'
import { requireAdmin } from '@/lib/admin-auth'
import { applyRateLimit, rateLimitIdentifier, rateLimits } from '@/lib/rate-limit'

export async function GET(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const result = await pool.query('SELECT id, name, email, subject, message, notification_status, notification_error, created_at FROM contact_submissions ORDER BY created_at DESC')
    return NextResponse.json(result.rows)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json()
    if (!name || !email || !message) return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 })
    const limited = await applyRateLimit(rateLimits.contact, rateLimitIdentifier(request, 'contact', String(email)), true)
    if (limited) return limited
    const result = await pool.query(`INSERT INTO contact_submissions (name, email, subject, message, notification_status) VALUES ($1, $2, $3, $4, 'pending') RETURNING id`, [name, email, subject || null, message])
    try {
      await sendContactNotification({ name, email, subject, message })
      await pool.query(`UPDATE contact_submissions SET notification_status = 'sent', notification_error = NULL WHERE id = $1`, [result.rows[0].id])
    } catch (error) {
      const notificationError = error instanceof Error ? error.message : 'Unknown email error'
      console.error('Contact notification failed:', error)
      await pool.query(`UPDATE contact_submissions SET notification_status = 'failed', notification_error = $2 WHERE id = $1`, [result.rows[0].id, notificationError.slice(0, 1000)])
    }
    return NextResponse.json({ success: true, id: result.rows[0].id })
  } catch (error) {
    console.error('Contact submission error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204 })
}

