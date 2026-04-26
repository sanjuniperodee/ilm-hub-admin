import { Box, Chip, Typography, TextField, Stack } from '@mui/material'
import { Audiotrack } from '@mui/icons-material'
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

interface AudioMediaPickerProps {
    mediaFiles: MediaFile[]
    audioUrl?: string
    audioMediaId?: string
    onChange?: (audioUrl: string, audioMediaId?: string) => void
    label?: string
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AudioMediaPicker({
    mediaFiles,
    audioUrl,
    audioMediaId,
    onChange,
    label = 'Аудио файл',
}: AudioMediaPickerProps) {
    const [manualUrl, setManualUrl] = useState(audioUrl || '')
    const [showManual, setShowManual] = useState(!audioMediaId && !!audioUrl)

    const audios = mediaFiles.filter((f) => f.type === 'audio')

    const selectedMedia = audioMediaId
        ? audios.find((a) => a.id === audioMediaId)
        : audios.find((a) => a.url === audioUrl)

    const handleSelect = (mediaId: string) => {
        const media = audios.find((a) => a.id === mediaId)
        if (!media) return
        // Toggle off if already selected
        if (audioMediaId === mediaId) {
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

            {audios.length === 0 && !showManual && (
                <Typography variant="caption" color="text.disabled">
                    — загрузите аудио через раздел «Медиа файлы теста» выше —
                </Typography>
            )}

            {audios.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {audios.map((file) => {
                        const isSelected = audioMediaId === file.id || (!audioMediaId && file.url === audioUrl)
                        const displayName = file.description?.trim() || file.filename
                        return (
                            <Chip
                                key={file.id}
                                icon={<Audiotrack fontSize="small" />}
                                label={displayName.length > 36 ? `${displayName.slice(0, 33)}…` : displayName}
                                onClick={() => handleSelect(file.id)}
                                color={isSelected ? 'primary' : 'default'}
                                variant={isSelected ? 'filled' : 'outlined'}
                                sx={{ cursor: 'pointer' }}
                            />
                        )
                    })}
                </Box>
            )}

            {selectedMedia && (
                <Box sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        {selectedMedia.description?.trim() || selectedMedia.filename} • {formatFileSize(selectedMedia.size)}
                    </Typography>
                    <audio
                        src={selectedMedia.url}
                        controls
                        style={{ width: '100%', height: 32, display: 'block', marginTop: 4 }}
                    />
                </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {!showManual && (
                    <Chip
                        label="Ввести URL вручную"
                        onClick={() => {
                            setShowManual(true)
                            setManualUrl(audioUrl || '')
                        }}
                        variant="outlined"
                        sx={{ cursor: 'pointer' }}
                    />
                )}
                {showManual && (
                    <Chip
                        label="Выбрать из медиа"
                        onClick={() => {
                            setShowManual(false)
                        }}
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
                    label="URL аудио (вручную)"
                    value={manualUrl}
                    onChange={(e) => handleManualChange(e.target.value)}
                    placeholder="https://storage.example.com/audio.mp3"
                />
            )}
        </Stack>
    )
}
