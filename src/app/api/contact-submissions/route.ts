import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { sendContactNotification } from '@/lib/email'

export async function GET() {
  try {
    const result = await pool.query('SELECT id, name, email, subject, message, created_at FROM contact_submissions ORDER BY created_at DESC')
    return NextResponse.json(result.rows)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, subject, message, inquiryType } = await request.json()
    if (!name || !email || !message) return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 })
    const result = await pool.query(`INSERT INTO contact_submissions (name, email, subject, message, inquiry_type) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [name, email, subject || null, message, inquiryType || 'sales'])
    try { await sendContactNotification({ name, email, subject, message, inquiryType: inquiryType || 'sales' }) } catch (error) { console.error('Contact notification failed:', error) }
    return NextResponse.json({ success: true, id: result.rows[0].id })
  } catch (error) {
    console.error('Contact submission error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204 })
}

