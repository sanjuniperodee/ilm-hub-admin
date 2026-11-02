import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { LinkOutlined, PermMediaOutlined } from '@mui/icons-material'
import { useState } from 'react'
import { MediaChoice, mediaDisplayName } from './lesson-editor/MediaChoice'

export interface MediaFile {
  id: string
  type: 'image' | 'audio' | 'video'
  url: string
  filename: string
  mimeType: string
  size: number
  description?: string
}

interface AudioMediaPickerProps {
  mediaFiles: MediaFile[]
  audioUrl?: string
  audioMediaId?: string
  onChange?: (audioUrl: string, audioMediaId?: string) => void
  label?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

/** Pick an uploaded audio file (or type a URL) for a test question. */
export function AudioMediaPicker({ mediaFiles, audioUrl, audioMediaId, onChange, label = 'Аудио файл' }: AudioMediaPickerProps) {
  const [manualUrl, setManualUrl] = useState(audioUrl || '')
  const [showManual, setShowManual] = useState(!audioMediaId && !!audioUrl)

  const audios = mediaFiles.filter((f) => f.type === 'audio')
  const selectedMedia = audioMediaId ? audios.find((a) => a.id === audioMediaId) : audios.find((a) => a.url === audioUrl)

  const handleSelect = (mediaId: string) => {
    const media = audios.find((a) => a.id === mediaId)
    if (!media) return
    // Toggle off if already selected
    if (selectedMedia?.id === mediaId) onChange?.('', '')
    else onChange?.(media.url, media.id)
    setShowManual(false)
    setManualUrl('')
  }

  return (
    <Stack gap={1}>
      {label && <Typography variant="subtitle2" component="p">{label}</Typography>}

      {!showManual && (
        <MediaChoice
          kind="audio"
          files={audios}
          selectedId={selectedMedia?.id}
          onSelect={handleSelect}
          label={label || 'Аудио'}
          emptyText="Сначала загрузите аудио в медиафайлы — оно появится здесь."
        />
      )}

      {selectedMedia && !showManual && (
        <Box sx={{ p: 1, bgcolor: 'surface.sunken', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {mediaDisplayName(selectedMedia)}, {formatFileSize(selectedMedia.size)}
          </Typography>
          <audio src={selectedMedia.url} controls preload="none" style={{ width: '100%', height: 32, display: 'block', marginTop: 4 }} />
        </Box>
      )}

      {showManual && (
        <TextField
          fullWidth
          size="small"
          label="Ссылка на аудио"
          value={manualUrl}
          onChange={(e) => {
            setManualUrl(e.target.value)
            onChange?.(e.target.value, '')
          }}
          placeholder="https://storage.example.com/audio.mp3"
        />
      )}

      <Box>
        <Button
          size="small"
          variant="text"
          startIcon={showManual ? <PermMediaOutlined /> : <LinkOutlined />}
          onClick={() => {
            if (showManual) setShowManual(false)
            else {
              setShowManual(true)
              setManualUrl(audioUrl || '')
            }
          }}
        >
          {showManual ? 'Выбрать из загруженных' : 'Указать ссылку вручную'}
        </Button>
      </Box>
    </Stack>
  )
}
