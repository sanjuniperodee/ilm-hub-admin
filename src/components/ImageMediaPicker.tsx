import { Box, Chip, Typography, TextField, Stack } from '@mui/material'
import { useState } from 'react'

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

export function ImageMediaPicker({
    mediaFiles,
    imageUrl,
    imageMediaId,
    onChange,
    label = 'Изображение',
}: ImageMediaPickerProps) {
    const [manualUrl, setManualUrl] = useState(imageUrl || '')
    const [showManual, setShowManual] = useState(!imageMediaId && !!imageUrl)

    const images = mediaFiles.filter((f) => f.type === 'image')

    const selectedMedia = imageMediaId
        ? images.find((img) => img.id === imageMediaId)
        : images.find((img) => img.url === imageUrl)

    const handleSelect = (mediaId: string) => {
        const media = images.find((img) => img.id === mediaId)
        if (!media) return
        if (imageMediaId === mediaId) {
            onChange?.('', '')
        } else {
            onChange?.(media.url, media.id)
        }
        setShowManual(false)
        setManualUrl('')
    }

    const handleManualChange = (url: string) => {
        setManualUrl(url)
        onChange?.(url, '')
    }

    return (
        <Stack spacing={1}>
            {label && (
                <Typography variant="subtitle2">{label}</Typography>
            )}

            {images.length === 0 && !showManual && (
                <Typography variant="caption" color="text.disabled">
                    — загрузите изображения через раздел «Медиа файлы теста» выше —
                </Typography>
            )}

            {images.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {images.map((file) => {
                        const isSelected = imageMediaId === file.id || (!imageMediaId && file.url === imageUrl)
                        return (
                            <Box
                                key={file.id}
                                onClick={() => handleSelect(file.id)}
                                sx={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    border: isSelected ? '3px solid #2e7d32' : '2px solid transparent',
                                    outline: isSelected ? '2px solid #81c784' : '2px solid #e0e0e0',
                                    '&:hover': { outline: '2px solid #66bb6a' },
                                    position: 'relative',
                                }}
                            >
                                <img
                                    src={file.url}
                                    alt={file.filename}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                            </Box>
                        )
                    })}
                </Box>
            )}

            {selectedMedia && (
                <Box
                    component="img"
                    src={selectedMedia.url}
                    alt={selectedMedia.filename}
                    sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 1, border: '2px solid #2e7d32' }}
                />
            )}

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {!showManual && (
                    <Chip
                        label="Ввести URL вручную"
                        onClick={() => {
                            setShowManual(true)
                            setManualUrl(imageUrl || '')
                        }}
                        variant="outlined"
                        sx={{ cursor: 'pointer' }}
                    />
                )}
                {showManual && (
                    <Chip
                        label="Выбрать из медиа"
                        onClick={() => setShowManual(false)}
                        variant="outlined"
                        color="warning"
                        sx={{ cursor: 'pointer' }}
                    />
                )}
            </Box>

            {showManual && (
                <TextField
                    fullWidth
                    size="small"
                    label="URL изображения (вручную)"
                    value={manualUrl}
                    onChange={(e) => handleManualChange(e.target.value)}
                    placeholder="https://storage.example.com/image.png"
                />
            )}
        </Stack>
    )
}
