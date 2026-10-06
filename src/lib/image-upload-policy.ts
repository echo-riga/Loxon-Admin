export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif'
const ALLOWED_IMAGE_TYPES = new Set(IMAGE_ACCEPT.split(','))

export function imageUploadError(type: unknown, size: unknown) {
  if (typeof type !== 'string' || !ALLOWED_IMAGE_TYPES.has(type)) {
    return { message: 'Choose a JPG, PNG, WebP, GIF, or AVIF image.', status: 415 }
  }
  if (typeof size !== 'number' || !Number.isSafeInteger(size) || size <= 0 || size > MAX_IMAGE_BYTES) {
    return { message: 'Image must be between 1 byte and 8 MB.', status: 413 }
  }
  return null
}
