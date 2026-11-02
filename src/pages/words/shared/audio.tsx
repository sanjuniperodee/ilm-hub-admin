import { useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Box, Button, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import {
  DeleteOutline,
  ErrorOutline,
  GraphicEqRounded,
  PauseRounded,
  PlayArrowRounded,
  UploadFileOutlined,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import { FileDropzone, describeUploadLimits, getErrorMessage } from '../../../components/ui'
import { validateUploadSize } from '../../../constants/uploadLimits'

/* ------------------------------------------------------------------ */
/* One shared <audio> for the whole admin page: starting a clip stops   */
/* the previous one, and every play button reflects the same state.     */
/* ------------------------------------------------------------------ */

type PlayStatus = 'idle' | 'loading' | 'playing' | 'error'

let player: HTMLAudioElement | null = null
let playerSrc: string | null = null
let playerStatus: PlayStatus = 'idle'
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function setStatus(src: string, status: PlayStatus) {
  if (playerSrc !== src) return
  playerStatus = status
  emit()
}

function togglePlayback(src: string) {
  if (playerSrc === src && player && (playerStatus === 'playing' || playerStatus === 'loading')) {
    player.pause()
    playerStatus = 'idle'
    emit()
    return
  }
  player?.pause()
  const audio = new Audio(src)
  player = audio
  playerSrc = src
  playerStatus = 'loading'
  emit()
  audio.onplaying = () => setStatus(src, 'playing')
  audio.onended = () => setStatus(src, 'idle')
  audio.onpause = () => {
    if (player === audio && playerStatus === 'playing') setStatus(src, 'idle')
  }
  audio.onerror = () => setStatus(src, 'error')
  audio.play().catch(() => setStatus(src, 'error'))
}

/** Stops whatever is playing (e.g. when an editor closes). */
export function stopAudioPlayback() {
  player?.pause()
  if (playerSrc) {
    playerStatus = 'idle'
    emit()
  }
}

function usePlayStatus(src: string | null | undefined): PlayStatus {
  return useSyncExternalStore(subscribe, () => (src && playerSrc === src ? playerStatus : 'idle'))
}

export const AUDIO_LIMITS_TEXT = (() => {
  const s = describeUploadLimits(['audio'])
  return s.charAt(0).toUpperCase() + s.slice(1)
})()

export const IMAGE_LIMITS_TEXT = (() => {
  const s = describeUploadLimits(['image'])
  return s.charAt(0).toUpperCase() + s.slice(1)
})()

export interface AudioPlayButtonProps {
  src?: string | null
  /** What is being played, for the accessible name: «произношение буквы Алиф». */
  label?: string
  size?: 'small' | 'medium'
  /** Keep the button's space when there is no audio, so rows stay aligned. */
  reserveSpace?: boolean
}

/** Inline play / pause button. Renders nothing (or an empty slot) when there is no audio. */
export function AudioPlayButton({ src, label, size = 'small', reserveSpace }: AudioPlayButtonProps) {
  const status = usePlayStatus(src)
  if (!src) return reserveSpace ? <Box aria-hidden sx={{ width: size === 'small' ? 34 : 40, flexShrink: 0 }} /> : null
  const playing = status === 'playing'
  const tip =
    status === 'error'
      ? 'Не удалось воспроизвести файл'
      : playing || status === 'loading'
        ? 'Остановить'
        : 'Прослушать'
  return (
    <Tooltip title={tip}>
      <IconButton
        size={size}
        aria-label={`${tip}${label ? `: ${label}` : ''}`}
        aria-pressed={playing}
        onClick={(e) => {
          e.stopPropagation()
          togglePlayback(src)
        }}
        sx={{
          color: status === 'error' ? 'error.main' : 'primary.main',
          bgcolor: playing ? 'brand.sand' : 'transparent',
          border: 1,
          borderColor: playing ? 'primary.light' : 'divider',
          '&:hover': { bgcolor: 'brand.sand' },
        }}
      >
        {status === 'loading' ? (
          <CircularProgress size={size === 'small' ? 16 : 20} thickness={5} aria-hidden />
        ) : status === 'error' ? (
          <ErrorOutline fontSize="small" />
        ) : playing ? (
          <PauseRounded fontSize="small" />
        ) : (
          <PlayArrowRounded fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  )
}

function validateAudio(file: File): string | null {
  if (!file.type.startsWith('audio/')) return `Файл «${file.name}» не аудио. Нужен MP3, WAV или M4A.`
  return validateUploadSize(file)
}

export interface AudioUploadButtonProps {
  hasAudio: boolean
  /** Must throw on failure; errors are shown as a toast. */
  onUpload: (file: File) => Promise<unknown>
  disabled?: boolean
  /** `icon` for dense table rows, `button` for cards and forms. */
  variant?: 'icon' | 'button'
  /** Name of the item for the accessible label. */
  itemLabel?: string
}

/** Compact upload / replace control with type + size checks (audio up to 3 МБ). */
export function AudioUploadButton({ hasAudio, onUpload, disabled, variant = 'button', itemLabel }: AudioUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const action = hasAudio ? 'Заменить аудио' : 'Загрузить аудио'

  const handle = async (file: File | undefined) => {
    if (!file) return
    const problem = validateAudio(file)
    if (problem) {
      toast.error(problem)
      return
    }
    setBusy(true)
    try {
      await onUpload(file)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось загрузить аудио'))
    } finally {
      setBusy(false)
    }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      hidden
      accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg"
      onChange={(e) => {
        handle(e.target.files?.[0])
        e.target.value = ''
      }}
    />
  )

  if (variant === 'icon') {
    return (
      <>
        <Tooltip title={`${action}. ${AUDIO_LIMITS_TEXT}`}>
          <span>
            <IconButton
              size="small"
              disabled={disabled || busy}
              aria-label={`${action}${itemLabel ? `: ${itemLabel}` : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                inputRef.current?.click()
              }}
            >
              {busy ? <CircularProgress size={16} thickness={5} aria-hidden /> : <UploadFileOutlined fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
        {input}
      </>
    )
  }

  return (
    <>
      <Tooltip title={AUDIO_LIMITS_TEXT}>
        <span>
          <Button
            size="small"
            variant="outlined"
            disabled={disabled || busy}
            startIcon={busy ? <CircularProgress size={14} thickness={5} aria-hidden /> : <UploadFileOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              inputRef.current?.click()
            }}
          >
            {busy ? 'Загружаем…' : action}
          </Button>
        </span>
      </Tooltip>
      {input}
    </>
  )
}

export interface AudioFieldProps {
  url?: string | null
  onUpload: (file: File) => Promise<unknown>
  /** Omit when the API cannot delete audio for this entity. */
  onDelete?: () => Promise<unknown> | void
  /** When set, the field is disabled with this explanation (e.g. «Сначала сохраните слово»). */
  disabledReason?: ReactNode
  /** Accessible context for the play button. */
  label?: string
}

/**
 * Audio block for editor forms: empty → dropzone (with limits), filled → player row
 * with replace / delete.
 */
export function AudioField({ url, onUpload, onDelete, disabledReason, label }: AudioFieldProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hintId = useId()

  const upload = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      await onUpload(file)
    } catch (e) {
      setError(getErrorMessage(e, 'Не удалось загрузить аудио'))
    } finally {
      setBusy(false)
    }
  }

  if (disabledReason) {
    return (
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 3,
          border: 1,
          borderStyle: 'dashed',
          borderColor: 'surface.borderStrong',
          bgcolor: 'surface.sunken',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {disabledReason}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {AUDIO_LIMITS_TEXT}
        </Typography>
      </Box>
    )
  }

  if (!url) {
    return <FileDropzone accept="audio" compact uploading={busy} error={error} onFiles={([f]) => upload(f)} />
  }

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        gap={1.5}
        flexWrap="wrap"
        sx={{ px: 1.5, py: 1.25, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'surface.sunken' }}
      >
        <AudioPlayButton src={url} label={label} size="medium" />
        <Box sx={{ flex: 1, minWidth: 140 }}>
          <Stack direction="row" alignItems="center" gap={0.75}>
            <GraphicEqRounded fontSize="small" sx={{ color: 'success.main' }} aria-hidden />
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Аудио загружено
            </Typography>
          </Stack>
          <Typography id={hintId} variant="caption" color="text.secondary">
            {AUDIO_LIMITS_TEXT}
          </Typography>
        </Box>
        <AudioUploadButton hasAudio onUpload={onUpload} />
        {onDelete && (
          <Button
            size="small"
            color="error"
            startIcon={<DeleteOutline />}
            onClick={() => onDelete()}
            aria-describedby={hintId}
          >
            Удалить
          </Button>
        )}
      </Stack>
      {error && (
        <Typography role="alert" variant="caption" sx={{ color: 'error.dark', mt: 0.5, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  )
}
