import { NextResponse } from 'next/server'
import { applyRateLimit, rateLimitIdentifier, rateLimits } from '@/lib/rate-limit'
import { chatMessages, readJsonObject, validationResponse } from '@/lib/validation'

async function buildSystemPrompt(request: Request) {
  const apiBase = new URL(request.url).origin
  const [projectsResult, servicesResult, jobsResult, clientsResult] = await Promise.allSettled([
    fetch(`${apiBase}/api/projects`, { next: { revalidate: 60 } }),
    fetch(`${apiBase}/api/products-services`, { next: { revalidate: 60 } }),
    fetch(`${apiBase}/api/jobs`, { next: { revalidate: 60 } }),
    fetch(`${apiBase}/api/clients`, { next: { revalidate: 60 } }),
  ])

  const context: string[] = []
  if (projectsResult.status === 'fulfilled' && projectsResult.value.ok) {
    const projects = await projectsResult.value.json()
    context.push(...projects.slice(0, 50).map((project: { title: string; description?: string; project_type?: string; location?: string; constructed_date?: string; client_name?: string }) => {
      const details = [project.title]
      if (project.project_type) details.push(`Type: ${project.project_type}`)
      if (project.location) details.push(`Location: ${project.location}`)
      if (project.constructed_date) details.push(`Date: ${project.constructed_date}`)
      if (project.client_name) details.push(`Client: ${project.client_name}`)
      if (project.description) details.push(`Description: ${project.description.slice(0, 1200)}`)
      return `Project: ${details.join(' | ')}`
    }))
  }
  if (servicesResult.status === 'fulfilled' && servicesResult.value.ok) {
    const services = await servicesResult.value.json()
    context.push(...services.slice(0, 50).map((service: { title: string; description?: string }) => `Service: ${service.title}${service.description ? ` | Description: ${service.description.slice(0, 1200)}` : ''}`))
  }
  if (jobsResult.status === 'fulfilled' && jobsResult.value.ok) {
    const jobs = await jobsResult.value.json()
    context.push(...jobs.slice(0, 50).map((job: { title: string; description?: string }) => `Job opening: ${job.title}${job.description ? ` | Description: ${job.description.slice(0, 1200)}` : ''}`))
  }
  if (clientsResult.status === 'fulfilled' && clientsResult.value.ok) {
    const clients = await clientsResult.value.json()
    context.push(...clients.slice(0, 100).map((client: { title: string; description?: string; entity_type?: string }) => {
      const category = client.entity_type === 'membership' ? 'Membership' : 'Client or partner'
      return `${category}: ${client.title}${client.description ? ` | Description: ${client.description.slice(0, 600)}` : ''}`
    }))
  }
  return `You are the customer service assistant for Loxon Philippines Inc., an engineering and construction firm. Be professional, concise, and only answer Loxon-related questions. For quotes or new projects, direct visitors to /contact. For careers, direct them to /join-us. For safety-critical service concerns, ask them to contact Loxon directly. Do not invent facts.\n\nCurrent Loxon data:\n${context.join('\n')}`
}

export async function POST(request: Request) {
  try {
    const identifier = rateLimitIdentifier(request, 'chat')
    const burstLimited = await applyRateLimit(rateLimits.chatBurst, identifier, true)
    if (burstLimited) return burstLimited
    const hourlyLimited = await applyRateLimit(rateLimits.chatHourly, identifier, true)
    if (hourlyLimited) return hourlyLimited
    const messages = chatMessages(await readJsonObject(request, 24 * 1024))
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Chat service is not configured' }, { status: 500 })

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'openai/gpt-oss-20b', messages: [{ role: 'system', content: await buildSystemPrompt(request) }, ...messages], temperature: 0.5, max_tokens: 600 }),
    })
    if (!response.ok) return NextResponse.json({ error: 'Failed to get a response from the assistant' }, { status: 502 })
    const data = await response.json()
    return NextResponse.json({ reply: data?.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.' })
  } catch (error) {
    const invalid = validationResponse(error)
    if (invalid) return invalid
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204 })
}

