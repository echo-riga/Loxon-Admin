'use client'

import { imageUploadError } from './image-upload-policy'

async function readResult(response: Response) {
  try {
    return await response.json()
  } catch {
    throw new Error('The upload service returned an invalid response. Please try again.')
  }
}

export async function uploadImage(file: File): Promise<string> {
  const invalid = imageUploadError(file.type, file.size)
  if (invalid) throw new Error(invalid.message)
  const prepared = await fetch('/api/uploads/images', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: file.type, size: file.size }), signal: AbortSignal.timeout(30_000),
  })
  const signed = await readResult(prepared)
  if (!prepared.ok) throw new Error(signed.error || 'Unable to prepare the image upload.')
  if (typeof signed.uploadUrl !== 'string' || !signed.uploadUrl.startsWith('https://api.cloudinary.com/v1_1/') || !signed.params) {
    throw new Error('Unable to prepare the image upload.')
  }
  const body = new FormData()
  body.append('file', file)
  for (const [key, value] of Object.entries(signed.params)) body.append(key, String(value))
  const response = await fetch(signed.uploadUrl, {
    method: 'POST', body, credentials: 'omit', signal: AbortSignal.timeout(180_000),
  })
  const result = await readResult(response)
  if (!response.ok) throw new Error(result.error?.message || 'Cloudinary rejected the image upload. Please try again.')
  if (typeof result.secure_url !== 'string' || !result.secure_url.startsWith('https://res.cloudinary.com/')) {
    throw new Error('Upload completed without a valid image URL.')
  }
  return result.secure_url
}
