import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { sendJobApplicationNotification } from '@/lib/email'
import { requireAdmin } from '@/lib/admin-auth'
import { applyRateLimit, rateLimitIdentifier, rateLimits } from '@/lib/rate-limit'

export async function GET(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const result = await pool.query(`SELECT ja.id, ja.full_name, ja.email, ja.phone, ja.cover_letter, ja.resume_url, ja.notification_status, ja.notification_error, j.title as job_title, ja.created_at FROM job_applications ja LEFT JOIN jobs j ON ja.job_id = j.id ORDER BY ja.created_at DESC`)
    return NextResponse.json(result.rows)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { job_id, full_name, email, phone, cover_letter, resume_url } = await request.json()
    if (!full_name || !email) return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    const limited = await applyRateLimit(rateLimits.job, rateLimitIdentifier(request, 'job', String(email)), true)
    if (limited) return limited
    let jobTitle = 'Unknown Position'
    if (job_id) { const job = await pool.query('SELECT title FROM jobs WHERE id = $1', [job_id]); jobTitle = job.rows[0]?.title || jobTitle }
    const result = await pool.query(`INSERT INTO job_applications (job_id, full_name, email, phone, cover_letter, resume_url, notification_status) VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id`, [job_id || null, full_name, email, phone || null, cover_letter || null, resume_url || null])
    try {
      await sendJobApplicationNotification({ jobTitle, fullName: full_name, email, phone, coverLetter: cover_letter, resumeUrl: resume_url })
      await pool.query(`UPDATE job_applications SET notification_status = 'sent', notification_error = NULL WHERE id = $1`, [result.rows[0].id])
    } catch (error) {
      const notificationError = error instanceof Error ? error.message : 'Unknown email error'
      console.error('Job-application notification failed:', error)
      await pool.query(`UPDATE job_applications SET notification_status = 'failed', notification_error = $2 WHERE id = $1`, [result.rows[0].id, notificationError.slice(0, 1000)])
    }
    return NextResponse.json({ success: true, id: result.rows[0].id })
  } catch (error) {
    console.error('Job application error:', error)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204 })
}

