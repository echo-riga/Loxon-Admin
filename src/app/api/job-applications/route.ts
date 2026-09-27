import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { sendJobApplicationNotification } from '@/lib/email'
import { requireAdmin } from '@/lib/admin-auth'
import { applyRateLimit, rateLimitIdentifier, rateLimits } from '@/lib/rate-limit'
import { ValidationError, emailString, optionalHttpsUrl, optionalString, positiveInteger, readJsonObject, requiredString, validationResponse } from '@/lib/validation'

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
    const body = await readJsonObject(request, 24 * 1024)
    const job_id = body.job_id === undefined || body.job_id === null || body.job_id === '' ? null : positiveInteger(body.job_id, 'Job ID')
    const full_name = requiredString(body, 'full_name', 'Full name', 120)
    const email = emailString(body)
    const phone = optionalString(body, 'phone', 'Phone', 40)
    const cover_letter = optionalString(body, 'cover_letter', 'Cover letter', 10_000)
    const resume_url = optionalHttpsUrl(body, 'resume_url', 'Resume URL')
    const limited = await applyRateLimit(rateLimits.job, rateLimitIdentifier(request, 'job', String(email)), true)
    if (limited) return limited
    let jobTitle = 'Unknown Position'
    if (job_id) {
      const job = await pool.query('SELECT title FROM jobs WHERE id = $1', [job_id])
      if (!job.rows[0]) throw new ValidationError('The selected job no longer exists.')
      jobTitle = job.rows[0].title
    }
    const result = await pool.query(`INSERT INTO job_applications (job_id, full_name, email, phone, cover_letter, resume_url, notification_status) VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id`, [job_id || null, full_name, email, phone || null, cover_letter || null, resume_url || null])
    try {
      await sendJobApplicationNotification({ jobTitle, fullName: full_name, email, phone: phone || undefined, coverLetter: cover_letter || undefined, resumeUrl: resume_url || undefined })
      await pool.query(`UPDATE job_applications SET notification_status = 'sent', notification_error = NULL WHERE id = $1`, [result.rows[0].id])
    } catch (error) {
      const notificationError = error instanceof Error ? error.message : 'Unknown email error'
      console.error('Job-application notification failed:', error)
      await pool.query(`UPDATE job_applications SET notification_status = 'failed', notification_error = $2 WHERE id = $1`, [result.rows[0].id, notificationError.slice(0, 1000)])
    }
    return NextResponse.json({ success: true, id: result.rows[0].id })
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    console.error('Job application error:', error)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204 })
}

