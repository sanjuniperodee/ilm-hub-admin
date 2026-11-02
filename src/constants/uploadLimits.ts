/** Upload limits from the technical specification (§10); the backend enforces the same values. */
export const UPLOAD_LIMITS_BYTES = {
  image: 1 * 1024 * 1024,
  audio: 3 * 1024 * 1024,
  video: 30 * 1024 * 1024,
} as const

const LABELS: Record<keyof typeof UPLOAD_LIMITS_BYTES, string> = {
  image: 'Изображение',
  audio: 'Аудио',
  video: 'Видео',
}

function kindOf(file: File): keyof typeof UPLOAD_LIMITS_BYTES | null {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

/** Returns a user-facing error message when the file exceeds its limit, otherwise null. */
export function validateUploadSize(file: File): string | null {
  const kind = kindOf(file)
  if (!kind) return null
  const limit = UPLOAD_LIMITS_BYTES[kind]
  if (file.size <= limit) return null
  const mb = (n: number) => (n / 1024 / 1024).toFixed(n < 1024 * 1024 ? 2 : 1)
  return `${LABELS[kind]} «${file.name}» весит ${mb(file.size)} МБ — максимум ${mb(limit)} МБ`
}
