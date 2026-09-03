import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const sender = process.env.EMAIL_FROM || 'Loxon Philippines <onboarding@resend.dev>'
const recipient = process.env.CONTACT_EMAIL_TO

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character] || character))
}

export async function sendContactNotification(data: { name: string; email: string; subject?: string; message: string; inquiryType: string }) {
  if (!recipient || !resend) return
  const typeLabel = data.inquiryType === 'sales' ? 'Sales Inquiry' : 'Technical Support / Service Request'
  await resend.emails.send({
    from: sender, to: [recipient], replyTo: data.email,
    subject: `${typeLabel}: ${data.subject || 'New message'} from ${data.name}`,
    text: `Inquiry Type: ${typeLabel}\nName: ${data.name}\nEmail: ${data.email}\nSubject: ${data.subject || 'No subject'}\n\nMessage:\n${data.message}`,
    html: `<h2>New Contact Form Submission (${typeLabel})</h2><p><strong>Name:</strong> ${escapeHtml(data.name)}</p><p><strong>Email:</strong> ${escapeHtml(data.email)}</p><p><strong>Subject:</strong> ${escapeHtml(data.subject || 'No subject')}</p><p>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>`,
  })
}

export async function sendJobApplicationNotification(data: { jobTitle: string; fullName: string; email: string; phone?: string; coverLetter?: string; resumeUrl?: string }) {
  if (!recipient || !resend) return
  await resend.emails.send({
    from: sender, to: [recipient], replyTo: data.email,
    subject: `Job Application: ${data.jobTitle} - ${data.fullName}`,
    text: `Position: ${data.jobTitle}\nName: ${data.fullName}\nEmail: ${data.email}\nPhone: ${data.phone || 'N/A'}\n\nCover Letter:\n${data.coverLetter || 'N/A'}\n\nResume URL: ${data.resumeUrl || 'N/A'}`,
    html: `<h2>New Job Application</h2><p><strong>Position:</strong> ${escapeHtml(data.jobTitle)}</p><p><strong>Name:</strong> ${escapeHtml(data.fullName)}</p><p><strong>Email:</strong> ${escapeHtml(data.email)}</p><p><strong>Phone:</strong> ${escapeHtml(data.phone || 'Not provided')}</p><p><strong>Cover Letter:</strong><br>${escapeHtml(data.coverLetter || 'Not provided').replace(/\n/g, '<br>')}</p>`,
  })
}

