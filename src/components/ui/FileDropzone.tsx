import { Box, Button, LinearProgress, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import { AudioFileOutlined, CloudUploadOutlined, ImageOutlined, MovieOutlined } from '@mui/icons-material'
import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { UPLOAD_LIMITS_BYTES, validateUploadSize } from '../../constants/uploadLimits'
import { color, motion, radius } from '../../theme/tokens'

export type DropzoneKind = keyof typeof UPLOAD_LIMITS_BYTES

const ACCEPT: Record<DropzoneKind, string> = {
  image: 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml',
  audio: 'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg',
  video: 'video/mp4,video/webm,video/quicktime',
}
const KIND_LABEL: Record<DropzoneKind, string> = { image: 'Изображение', audio: 'Аудио', video: 'Видео' }
const FORMATS: Record<DropzoneKind, string> = {
  image: 'JPG, PNG, WebP',
  audio: 'MP3, WAV, M4A',
  video: 'MP4, WebM',
}
const ICON: Record<DropzoneKind, ReactNode> = {
  image: <ImageOutlined />,
  audio: <AudioFileOutlined />,
  video: <MovieOutlined />,
}

const mb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} МБ`

/** «Изображение до 1 МБ · JPG, PNG, WebP» for each allowed kind. */
export function describeUploadLimits(kinds: DropzoneKind[]): string {
  return kinds.map((k) => `${KIND_LABEL[k].toLowerCase()} до ${mb(UPLOAD_LIMITS_BYTES[k])} (${FORMATS[k]})`).join(', ')
}

export interface FileDropzoneProps {
  /** Allowed media kinds; drives `accept`, icon and the limits line. */
  accept: DropzoneKind | DropzoneKind[]
  /** Receives files that passed type and size validation. */
  onFiles: (files: File[]) => void
  multiple?: boolean
  disabled?: boolean
  /** Upload in progress: shows a progress bar and disables input. */
  uploading?: boolean
  /** 0–100 for a determinate bar; omit for indeterminate. */
  progress?: number
  /** External error (e.g. from the upload request). Validation errors are shown automatically. */
  error?: string | null
  /** Main instruction. Default: «Перетащите файл сюда или выберите на компьютере». */
  label?: ReactNode
  /** Visible field label above the zone. */
  title?: ReactNode
  /** Compact single-line variant for tight forms and table rows. */
  compact?: boolean
  sx?: SxProps<Theme>
}

/**
 * Drag-and-drop / click-to-select upload area with type checks and the size limits
 * from `constants/uploadLimits.ts` (image 1 МБ, audio 3 МБ, video 30 МБ — the backend
 * enforces the same). Keyboard: Tab to focus, Enter/Space to open the file picker.
 *
 * @example
 * <FileDropzone
 *   title="Аудио произношения"
 *   accept="audio"
 *   uploading={isUploading}
 *   onFiles={([file]) => uploadAudio(file)}
 * />
 */
export function FileDropzone({
  accept,
  onFiles,
  multiple,
  disabled,
  uploading,
  progress,
  error,
  label,
  title,
  compact,
  sx,
}: FileDropzoneProps) {
  const kinds = Array.isArray(accept) ? accept : [accept]
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const hintId = useId()
  const errorId = useId()
  const blocked = disabled || uploading
  const shownError = error || localError

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    const files = Array.from(list).slice(0, multiple ? undefined : 1)
    for (const f of files) {
      const kindOk = kinds.some((k) => f.type.startsWith(`${k}/`))
      if (!kindOk) {
        setLocalError(`Файл «${f.name}» не подходит: нужен формат ${kinds.map((k) => FORMATS[k]).join(' / ')}`)
        return
      }
      const sizeError = validateUploadSize(f)
      if (sizeError) {
        setLocalError(sizeError)
        return
      }
    }
    setLocalError(null)
    onFiles(files)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (blocked) return
    handleFiles(e.dataTransfer.files)
  }

  const open = () => {
    if (!blocked) inputRef.current?.click()
  }

  const limits = describeUploadLimits(kinds)

  return (
    <Box sx={sx}>
      {title && (
        <Typography variant="subtitle2" component="p" sx={{ mb: 0.75 }}>
          {title}
        </Typography>
      )}
      <Box
        role="button"
        tabIndex={blocked ? -1 : 0}
        aria-disabled={blocked || undefined}
        aria-describedby={`${hintId}${shownError ? ` ${errorId}` : ''}`}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            open()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!blocked) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: compact ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: compact ? 'left' : 'center',
          gap: compact ? 1.5 : 1,
          px: compact ? 1.5 : 3,
          py: compact ? 1.25 : 3.5,
          borderRadius: `${radius.lg}px`,
          border: '1.5px dashed',
          borderColor: shownError ? 'error.main' : dragging ? color.bronze[500] : color.neutral[300],
          bgcolor: dragging ? color.bronze[50] : color.neutral[50],
          cursor: blocked ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: `border-color ${motion.fast}, background-color ${motion.fast}`,
          overflow: 'hidden',
          '&:hover': blocked ? undefined : { borderColor: color.bronze[500], bgcolor: color.bronze[50] },
          '&:focus-visible': { outline: `2px solid ${color.bronze[500]}`, outlineOffset: 2 },
        }}
      >
        <Box
          aria-hidden
          sx={{
            color: dragging ? color.bronze[600] : color.neutral[500],
            display: 'flex',
            '& .MuiSvgIcon-root': { fontSize: compact ? 22 : 30 },
          }}
        >
          {kinds.length === 1 ? ICON[kinds[0]] : <CloudUploadOutlined />}
        </Box>
        <Box sx={{ minWidth: 0, flex: compact ? 1 : undefined }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {uploading
              ? 'Загружаем…'
              : label ??
                (dragging ? (
                  'Отпустите, чтобы загрузить'
                ) : compact ? (
                  'Перетащите файл сюда'
                ) : (
                  <>
                    Перетащите файл или{' '}
                    <Box component="span" sx={{ color: 'primary.main', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                      выберите на компьютере
                    </Box>
                  </>
                ))}
          </Typography>
          <Typography id={hintId} variant="caption" color="text.secondary" component="p" sx={{ mt: 0.25 }}>
            {limits.charAt(0).toUpperCase() + limits.slice(1)}
          </Typography>
        </Box>
        {compact && !uploading && (
          <Button size="small" variant="outlined" tabIndex={-1} disabled={blocked} sx={{ flexShrink: 0 }}>
            Выбрать
          </Button>
        )}
        {uploading && (
          <LinearProgress
            variant={progress != null ? 'determinate' : 'indeterminate'}
            value={progress}
            aria-label="Прогресс загрузки"
            sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: 0, height: 3 }}
          />
        )}
      </Box>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={kinds.map((k) => ACCEPT[k]).join(',')}
        multiple={multiple}
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {shownError && (
        <Stack direction="row" sx={{ mt: 0.75 }}>
          <Typography id={errorId} role="alert" variant="caption" sx={{ color: 'error.dark' }}>
            {shownError}
          </Typography>
        </Stack>
      )}
    </Box>
  )
}
