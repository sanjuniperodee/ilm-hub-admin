import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { LinkOutlined, PermMediaOutlined } from '@mui/icons-material'
import { useState } from 'react'
import { MediaChoice } from './lesson-editor/MediaChoice'

export interface MediaFile {
  id: string
  type: 'image' | 'audio' | 'video'
  url: string
  filename: string
  mimeType: string
  size: number
  description?: string
}

interface ImageMediaPickerProps {
  mediaFiles: MediaFile[]
  imageUrl?: string
  imageMediaId?: string
  onChange?: (imageUrl: string, imageMediaId?: string) => void
  label?: string
}

/** Pick an uploaded image (or type a URL) for a test question. */
export function ImageMediaPicker({ mediaFiles, imageUrl, imageMediaId, onChange, label = 'Изображение' }: ImageMediaPickerProps) {
  const [manualUrl, setManualUrl] = useState(imageUrl || '')
  const [showManual, setShowManual] = useState(!imageMediaId && !!imageUrl)

  const images = mediaFiles.filter((f) => f.type === 'image')
  const selectedMedia = imageMediaId ? images.find((img) => img.id === imageMediaId) : images.find((img) => img.url === imageUrl)

  const handleSelect = (mediaId: string) => {
    const media = images.find((img) => img.id === mediaId)
    if (!media) return
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
          kind="image"
          files={images}
          selectedId={selectedMedia?.id}
          onSelect={handleSelect}
          label={label || 'Изображение'}
          emptyText="Сначала загрузите изображения в медиафайлы — они появятся здесь."
        />
      )}

      {showManual && (
        <Stack direction="row" gap={1} alignItems="flex-start">
          <TextField
            fullWidth
            size="small"
            label="Ссылка на изображение"
            value={manualUrl}
            onChange={(e) => {
              setManualUrl(e.target.value)
              onChange?.(e.target.value, '')
            }}
            placeholder="https://storage.example.com/image.png"
          />
          {manualUrl && (
            <Box component="img" src={manualUrl} alt="" sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider', flexShrink: 0 }} />
          )}
        </Stack>
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
              setManualUrl(imageUrl || '')
            }
          }}
        >
          {showManual ? 'Выбрать из загруженных' : 'Указать ссылку вручную'}
        </Button>
      </Box>
    </Stack>
  )
}
