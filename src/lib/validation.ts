export class ValidationError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
    this.name = 'ValidationError'
  }
}

type JsonObject = Record<string, unknown>

const encoder = new TextEncoder()
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function readJsonObject(request: Request, maxBytes = 64 * 1024): Promise<JsonObject> {
  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > maxBytes) throw new ValidationError('Request body is too large.', 413)

  const text = await request.text()
  if (encoder.encode(text).byteLength > maxBytes) throw new ValidationError('Request body is too large.', 413)

  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new ValidationError('Request body must be valid JSON.')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('Request body must be a JSON object.')
  }
  return value as JsonObject
}

export function requiredString(body: JsonObject, key: string, label: string, maxLength: number) {
  if (typeof body[key] !== 'string') throw new ValidationError(`${label} is required.`)
  const value = body[key].trim()
  if (!value) throw new ValidationError(`${label} is required.`)
  if (value.length > maxLength) throw new ValidationError(`${label} must be ${maxLength} characters or fewer.`)
  return value
}

export function optionalString(body: JsonObject, key: string, label: string, maxLength: number) {
  const raw = body[key]
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw !== 'string') throw new ValidationError(`${label} must be text.`)
  const value = raw.trim()
  if (!value) return null
  if (value.length > maxLength) throw new ValidationError(`${label} must be ${maxLength} characters or fewer.`)
  return value
}

export function emailString(body: JsonObject, key = 'email', label = 'Email') {
  const value = requiredString(body, key, label, 254).toLowerCase()
  if (!EMAIL_PATTERN.test(value)) throw new ValidationError(`${label} must be a valid email address.`)
  return value
}

export function positiveInteger(value: unknown, label: string) {
  const number = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN
  if (!Number.isSafeInteger(number) || number <= 0) throw new ValidationError(`${label} must be a positive integer.`)
  return number
}

export function optionalHttpsUrl(body: JsonObject, key: string, label: string, maxLength = 2048) {
  const value = optionalString(body, key, label, maxLength)
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') throw new Error('invalid protocol')
    return url.toString()
  } catch {
    throw new ValidationError(`${label} must be a valid HTTPS URL.`)
  }
}

export function optionalDate(body: JsonObject, key: string, label: string) {
  const value = optionalString(body, key, label, 10)
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ValidationError(`${label} must use YYYY-MM-DD format.`)
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(`${label} must be a valid date.`)
  }
  return value
}

export function oneOf<T extends string>(body: JsonObject, key: string, label: string, values: readonly T[], fallback?: T) {
  const raw = body[key]
  if ((raw === undefined || raw === null || raw === '') && fallback) return fallback
  if (typeof raw !== 'string' || !values.includes(raw as T)) {
    throw new ValidationError(`${label} must be one of: ${values.join(', ')}.`)
  }
  return raw as T
}

export function validationResponse(error: unknown) {
  if (!(error instanceof ValidationError)) return null
  return Response.json({ error: error.message }, { status: error.status })
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export function chatMessages(body: JsonObject): ChatMessage[] {
  const value = body.messages
  if (!Array.isArray(value) || value.length === 0) throw new ValidationError('At least one chat message is required.')
  if (value.length > 12) throw new ValidationError('A maximum of 12 chat messages is allowed.')

  let totalLength = 0
  const messages = value.map<ChatMessage>((message, index) => {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      throw new ValidationError(`Chat message ${index + 1} is invalid.`)
    }
    const role = (message as JsonObject).role
    const content = (message as JsonObject).content
    if (role !== 'user' && role !== 'assistant') {
      throw new ValidationError('Chat messages may only use user or assistant roles.')
    }
    if (typeof content !== 'string' || !content.trim()) throw new ValidationError(`Chat message ${index + 1} is empty.`)
    const cleaned = content.trim()
    if (cleaned.length > 2_000) throw new ValidationError('Each chat message must be 2,000 characters or fewer.')
    totalLength += cleaned.length
    return { role, content: cleaned }
  })
  if (totalLength > 8_000) throw new ValidationError('The chat conversation is too long.')
  if (messages.at(-1)?.role !== 'user') throw new ValidationError('The last chat message must be from the user.')
  return messages
}
