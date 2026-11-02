import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  IconButton,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AudiotrackOutlined,
  DeleteOutline,
  ImageOutlined,
  InsertDriveFileOutlined,
  Pause,
  PlayArrow,
  SmartDisplayOutlined,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import { FileDropzone, getErrorMessage, useConfirm, type DropzoneKind } from './ui'
import { color, radius } from '../theme'

interface MediaFile {
  id: string
  type: 'image' | 'audio' | 'video'
  url: string
  filename: string
  mimeType: string
  size: number
  /** Preferred display label in lists (e.g. Match Pairs picker). */
  description?: string
}

interface MediaUploaderProps {
  blockId?: string
  mediaFiles: MediaFile[]
  onUpload: (file: File, type: 'image' | 'audio' | 'video', description?: string) => Promise<void>
  onDelete: (mediaFileId: string) => Promise<void>
  onRefresh: () => void
  disabled?: boolean
  /** Allowed kinds for the dropzone (default: image, audio, video). */
  accept?: DropzoneKind[]
  /** Hide the «подпись» field (when labels are not used by this block type). */
  hideDescription?: boolean
}

type MediaFilter = 'all' | 'image' | 'audio' | 'video'

const getMediaType = (mimeType: string): 'image' | 'audio' | 'video' => {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  return 'image'
}

const getMediaIcon = (type: string) => {
  switch (type) {
    case 'image':
      return <ImageOutlined fontSize="small" />
    case 'audio':
      return <AudiotrackOutlined fontSize="small" />
    case 'video':
      return <SmartDisplayOutlined fontSize="small" />
    default:
      return <InsertDriveFileOutlined fontSize="small" />
  }
}

const TYPE_LABEL: Record<string, string> = { image: 'Изображение', audio: 'Аудио', video: 'Видео' }

// ── Inline audio player ────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function AudioPlayer({ url, filename }: { url: string; filename: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [seeking, setSeeking] = useState(false)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => {
      if (!seeking) setCurrent(el.currentTime)
    }
    const onDuration = () => setDuration(el.duration)
    const onEnded = () => setPlaying(false)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onDuration)
    el.addEventListener('durationchange', onDuration)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onDuration)
      el.removeEventListener('durationchange', onDuration)
      el.removeEventListener('ended', onEnded)
    }
  }, [seeking])

  const togglePlay = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
    } else {
      void el.play()
      setPlaying(true)
    }
  }

  return (
    <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0, width: '100%' }}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <IconButton
        onClick={togglePlay}
        size="small"
        aria-label={playing ? `Пауза: ${filename}` : `Прослушать: ${filename}`}
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          width: 30,
          height: 30,
          flexShrink: 0,
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        {playing ? <Pause sx={{ fontSize: 18 }} /> : <PlayArrow sx={{ fontSize: 18 }} />}
      </IconButton>
      <Slider
        size="small"
        value={current}
        min={0}
        max={duration || 1}
        step={0.1}
        aria-label={`Позиция воспроизведения: ${filename}`}
        onChange={(_, val) => setCurrent(val as number)}
        onChangeCommitted={(_, val) => {
          const el = audioRef.current
          if (el) el.currentTime = val as number
          setSeeking(false)
        }}
        onMouseDown={() => setSeeking(true)}
        sx={{ flex: 1, minWidth: 60, '& .MuiSlider-thumb': { width: 10, height: 10 } }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', minWidth: 64, textAlign: 'right' }}>
        {formatTime(current)} / {formatTime(duration)}
      </Typography>
    </Stack>
  )
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

/**
 * Upload area + list of media files attached to a block or a test question.
 * Size limits (image 1 МБ, audio 3 МБ, video 30 МБ) are shown and checked before upload.
 */
export default function MediaUploader({
  mediaFiles,
  onUpload,
  onDelete,
  onRefresh,
  disabled = false,
  accept = ['image', 'audio', 'video'],
  hideDescription,
}: MediaUploaderProps) {
  const confirm = useConfirm()
  const [uploading, setUploading] = useState(false)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  /** Applied to each file in the next upload batch (stored as media description). */
  const [uploadDescription, setUploadDescription] = useState('')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')

  const counts = {
    all: mediaFiles.length,
    image: mediaFiles.filter((f) => f.type === 'image').length,
    audio: mediaFiles.filter((f) => f.type === 'audio').length,
    video: mediaFiles.filter((f) => f.type === 'video').length,
  }
  const visibleMediaFiles = mediaFilter === 'all' ? mediaFiles : mediaFiles.filter((media) => media.type === mediaFilter)

  const handleFiles = async (files: File[]) => {
    if (!files.length || disabled) return
    setUploading(true)
    setError(null)
    const desc = uploadDescription.trim() || undefined
    let ok = 0
    for (const [i, file] of files.entries()) {
      setProgressLabel(files.length > 1 ? `${i + 1} из ${files.length}: ${file.name}` : file.name)
      try {
        await onUpload(file, getMediaType(file.type), desc)
        ok += 1
      } catch (err) {
        setError(getErrorMessage(err, `Не удалось загрузить «${file.name}»`))
      }
    }
    setUploading(false)
    setProgressLabel('')
    if (ok > 0) toast.success(ok > 1 ? `Загружено файлов: ${ok}` : 'Файл загружен')
    onRefresh()
  }

  const handleDelete = async (media: MediaFile) => {
    if (disabled) return
    const name = media.description?.trim() || media.filename
    const yes = await confirm({
      title: 'Удалить файл?',
      description: `«${name}» исчезнет из медиа. Если файл вставлен в текст или выбран в упражнении, там он перестанет отображаться.`,
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (!yes) return
    try {
      await onDelete(media.id)
      toast.success('Файл удалён')
      onRefresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось удалить файл'))
    }
  }

  const filters = (
    [
      { value: 'all', label: 'Все' },
      { value: 'audio', label: 'Аудио' },
      { value: 'image', label: 'Изображения' },
      { value: 'video', label: 'Видео' },
    ] as { value: MediaFilter; label: string }[]
  ).filter((f) => f.value === 'all' || counts[f.value] > 0)

  return (
    <Stack gap={1.5}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!hideDescription && (
        <TextField
          fullWidth
          size="small"
          label="Подпись к следующим файлам (необязательно)"
          helperText="Сохраняется в описании файла — по ней проще найти аудио в списках выбора"
          value={uploadDescription}
          onChange={(e) => setUploadDescription(e.target.value)}
          disabled={disabled}
        />
      )}

      <FileDropzone
        accept={accept}
        multiple
        disabled={disabled}
        uploading={uploading}
        onFiles={(files) => void handleFiles(files)}
        label={uploading ? `Загружаем ${progressLabel}` : undefined}
      />

      {mediaFiles.length > 1 && filters.length > 2 && (
        <Stack direction="row" gap={0.75} flexWrap="wrap" role="group" aria-label="Фильтр по типу">
          {filters.map((filter) => (
            <Chip
              key={filter.value}
              size="small"
              label={`${filter.label} ${counts[filter.value]}`}
              aria-pressed={mediaFilter === filter.value}
              color={mediaFilter === filter.value ? 'primary' : 'default'}
              variant={mediaFilter === filter.value ? 'filled' : 'outlined'}
              onClick={() => setMediaFilter(filter.value)}
            />
          ))}
        </Stack>
      )}

      {visibleMediaFiles.length > 0 && (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, border: '1px solid', borderColor: 'divider', borderRadius: `${radius.lg}px`, overflow: 'hidden' }}>
          {visibleMediaFiles.map((media, i) => {
            const title = media.description?.trim() || media.filename
            return (
              <Box
                component="li"
                key={media.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  borderTop: i === 0 ? 0 : '1px solid',
                  borderColor: 'divider',
                  flexWrap: { xs: 'wrap', sm: 'nowrap' },
                }}
              >
                {media.type === 'image' ? (
                  <Box component="img" src={media.url} alt="" loading="lazy" sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: `${radius.sm}px`, flexShrink: 0, border: '1px solid', borderColor: 'divider' }} />
                ) : (
                  <Box sx={{ width: 40, height: 40, borderRadius: `${radius.sm}px`, bgcolor: color.sand[200], color: color.bronze[700], display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    {getMediaIcon(media.type)}
                  </Box>
                )}
                <Box sx={{ minWidth: 0, flex: '1 1 160px' }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }} title={title}>
                    {title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="p">
                    {TYPE_LABEL[media.type] ?? media.type}, {formatFileSize(media.size)}
                    {media.description?.trim() ? `, ${media.filename}` : ''}
                  </Typography>
                </Box>
                {media.type === 'audio' && (
                  <Box sx={{ flex: '1 1 220px', minWidth: 0, maxWidth: 340 }}>
                    <AudioPlayer url={media.url} filename={title} />
                  </Box>
                )}
                <Tooltip title="Удалить файл">
                  <span>
                    <IconButton onClick={() => void handleDelete(media)} disabled={disabled} size="small" aria-label={`Удалить ${title}`} sx={{ '&:hover': { color: 'error.main' } }}>
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            )
          })}
        </Box>
      )}

      {mediaFiles.length === 0 && !uploading && (
        <Typography variant="body2" color="text.secondary">
          Файлов пока нет.
        </Typography>
      )}
    </Stack>
  )
}
