import { useRef, useState } from 'react'
import { Box, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { AddPhotoAlternateOutlined, ImageOutlined } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { FileDropzone, getErrorMessage } from '../../../components/ui'
import { validateUploadSize } from '../../../constants/uploadLimits'
import { IMAGE_LIMITS_TEXT } from '../shared'

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml'

/** Square preview; a muted placeholder when there is no image. */
export function CardThumb({ url, alt, size = 44 }: { url?: string | null; alt: string; size?: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'surface.sunken',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.disabled',
      }}
    >
      {url ? (
        <Box component="img" src={url} alt={alt} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <ImageOutlined fontSize="small" aria-hidden />
      )}
    </Box>
  )
}

/** Icon button for table rows: pick an image (up to 1 МБ) and upload it. */
export function ImageUploadIconButton({
  hasImage,
  onUpload,
  itemLabel,
}: {
  hasImage: boolean
  onUpload: (file: File) => Promise<unknown>
  itemLabel?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const action = hasImage ? 'Заменить изображение' : 'Загрузить изображение'

  const handle = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error(`Файл «${file.name}» не изображение. Нужен JPG, PNG или WebP.`)
      return
    }
    const sizeError = validateUploadSize(file)
    if (sizeError) {
      toast.error(sizeError)
      return
    }
    setBusy(true)
    try {
      await onUpload(file)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось загрузить изображение'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Tooltip title={`${action}. ${IMAGE_LIMITS_TEXT}`}>
        <span>
          <IconButton
            size="small"
            disabled={busy}
            aria-label={`${action}${itemLabel ? `: ${itemLabel}` : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              ref.current?.click()
            }}
          >
            {busy ? <CircularProgress size={16} thickness={5} aria-hidden /> : <AddPhotoAlternateOutlined fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
      <input
        ref={ref}
        type="file"
        hidden
        accept={IMAGE_ACCEPT}
        onChange={(e) => {
          handle(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </>
  )
}

/** Image block for the card editor: preview + dropzone to add or replace. */
export function ImageField({
  url,
  alt,
  onUpload,
  disabledReason,
}: {
  url?: string | null
  alt: string
  onUpload: (file: File) => Promise<unknown>
  disabledReason?: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (disabledReason) {
    return (
      <Box sx={{ px: 2, py: 1.5, borderRadius: 3, border: 1, borderStyle: 'dashed', borderColor: 'surface.borderStrong', bgcolor: 'surface.sunken' }}>
        <Typography variant="body2" color="text.secondary">
          {disabledReason}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {IMAGE_LIMITS_TEXT}
        </Typography>
      </Box>
    )
  }

  const upload = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      await onUpload(file)
    } catch (e) {
      setError(getErrorMessage(e, 'Не удалось загрузить изображение'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
      {url && <CardThumb url={url} alt={alt} size={112} />}
      <FileDropzone
        accept="image"
        compact={!!url}
        uploading={busy}
        error={error}
        label={url ? 'Перетащите новое изображение, чтобы заменить' : undefined}
        onFiles={([f]) => upload(f)}
        sx={{ flex: 1 }}
      />
    </Stack>
  )
}
