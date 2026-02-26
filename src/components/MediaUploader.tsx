import { useState, useCallback } from 'react'
import {
    Box,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    CircularProgress,
    Alert,
    Paper,
} from '@mui/material'
import {
    CloudUpload,
    Delete,
    Image as ImageIcon,
    Audiotrack,
    Videocam,
    InsertDriveFile,
} from '@mui/icons-material'

interface MediaFile {
    id: string
    type: 'image' | 'audio' | 'video'
    url: string
    filename: string
    mimeType: string
    size: number
    description?: string
}

interface MediaUploaderProps {
    blockId: string
    mediaFiles: MediaFile[]
    onUpload: (file: File, type: 'image' | 'audio' | 'video') => Promise<void>
    onDelete: (mediaFileId: string) => Promise<void>
    onRefresh: () => void
    disabled?: boolean
}

const getMediaType = (mimeType: string): 'image' | 'audio' | 'video' => {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.startsWith('video/')) return 'video'
    return 'image' // default
}

const getMediaIcon = (type: string) => {
    switch (type) {
        case 'image': return <ImageIcon />
        case 'audio': return <Audiotrack />
        case 'video': return <Videocam />
        default: return <InsertDriveFile />
    }
}

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MediaUploader({
    mediaFiles,
    onUpload,
    onDelete,
    onRefresh,
    disabled = false,
}: MediaUploaderProps) {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [dragOver, setDragOver] = useState(false)

    const handleFileSelect = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0 || disabled) return

        setUploading(true)
        setError(null)

        for (const file of Array.from(files)) {
            try {
                const type = getMediaType(file.type)
                await onUpload(file, type)
            } catch (err: any) {
                setError(err.response?.data?.message || `Failed to upload ${file.name}`)
            }
        }

        setUploading(false)
        onRefresh()
    }, [onUpload, onRefresh, disabled])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        handleFileSelect(e.dataTransfer.files)
    }, [handleFileSelect])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(true)
    }, [])

    const handleDragLeave = useCallback(() => {
        setDragOver(false)
    }, [])

    const handleDelete = async (mediaFileId: string) => {
        if (disabled) return
        try {
            await onDelete(mediaFileId)
            onRefresh()
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete media')
        }
    }

    return (
        <Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Drop zone */}
            <Paper
                sx={{
                    p: 3,
                    mb: 2,
                    textAlign: 'center',
                    border: '2px dashed',
                    borderColor: dragOver ? 'primary.main' : 'grey.300',
                    bgcolor: dragOver ? 'action.hover' : 'background.paper',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                    transition: 'all 0.2s',
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => {
                    if (disabled) return
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.multiple = true
                    input.accept = 'image/*,audio/*,video/*'
                    input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files)
                    input.click()
                }}
            >
                {uploading ? (
                    <CircularProgress size={40} />
                ) : (
                    <>
                        <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                        <Typography variant="body1" color="textSecondary">
                            Перетащите файлы сюда или нажмите для выбора
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            Поддерживаемые форматы: изображения, аудио, видео
                        </Typography>
                    </>
                )}
            </Paper>

            {/* Media list */}
            {mediaFiles.length > 0 && (
                <List dense>
                    {mediaFiles.map((media) => (
                        <ListItem key={media.id}>
                            <ListItemIcon>
                                {getMediaIcon(media.type)}
                            </ListItemIcon>
                            <ListItemText
                                primary={media.filename}
                                secondary={`${media.type} • ${formatFileSize(media.size)}`}
                            />
                            {media.type === 'image' && (
                                <Box sx={{ mr: 2 }}>
                                    <img
                                        src={media.url}
                                        alt={media.filename}
                                        style={{ height: 40, width: 40, objectFit: 'cover', borderRadius: 4 }}
                                    />
                                </Box>
                            )}
                            {media.type === 'audio' && (
                                <Box sx={{ mr: 2 }}>
                                    <audio src={media.url} controls style={{ height: 32, width: 150 }} />
                                </Box>
                            )}
                            <ListItemSecondaryAction>
                                <IconButton
                                    edge="end"
                                    onClick={() => handleDelete(media.id)}
                                    disabled={disabled}
                                    color="error"
                                    size="small"
                                >
                                    <Delete />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List>
            )}

            {mediaFiles.length === 0 && !uploading && (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                    Медиа файлы не загружены
                </Typography>
            )}
        </Box>
    )
}
