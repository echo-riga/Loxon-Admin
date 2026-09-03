import { NextResponse } from 'next/server'

async function buildSystemPrompt(request: Request) {
  const apiBase = new URL(request.url).origin
  const [projectsResult, servicesResult, companyResult] = await Promise.allSettled([
    fetch(`${apiBase}/api/projects`, { cache: 'no-store' }),
    fetch(`${apiBase}/api/products-services`, { cache: 'no-store' }),
    fetch(`${apiBase}/api/our-company`, { cache: 'no-store' }),
  ])

  const context: string[] = []
  if (projectsResult.status === 'fulfilled' && projectsResult.value.ok) {
    const projects = await projectsResult.value.json()
    context.push(...projects.slice(0, 30).map((project: { title: string; location?: string }) => `Project: ${project.title}${project.location ? ` (${project.location})` : ''}`))
  }
  if (servicesResult.status === 'fulfilled' && servicesResult.value.ok) {
    const services = await servicesResult.value.json()
    context.push(...services.map((service: { title: string }) => `Service: ${service.title}`))
  }
  if (companyResult.status === 'fulfilled' && companyResult.value.ok) {
    const company = await companyResult.value.json()
    if (company.description) context.push(`Company description: ${String(company.description).slice(0, 500)}`)
  }

  return `You are the customer service assistant for Loxon Philippines Inc., an engineering and construction firm. Be professional, concise, and only answer Loxon-related questions. For quotes or new projects, direct visitors to /contact. For careers, direct them to /join-us. For safety-critical service concerns, ask them to contact Loxon directly. Do not invent facts.\n\nCurrent Loxon data:\n${context.join('\n')}`
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()
    if (!Array.isArray(messages) || messages.length === 0) return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
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
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204 })
}

