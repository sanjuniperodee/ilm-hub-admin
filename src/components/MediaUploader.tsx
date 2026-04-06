import { useState, useCallback, useRef, useEffect, type ChangeEvent } from 'react'
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
    Slider,
    TextField,
} from '@mui/material'
import {
    CloudUpload,
    Delete,
    Image as ImageIcon,
    Audiotrack,
    Videocam,
    InsertDriveFile,
    PlayArrow,
    Pause,
} from '@mui/icons-material'

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
        const onTime = () => { if (!seeking) setCurrent(el.currentTime) }
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
        if (playing) { el.pause(); setPlaying(false) }
        else { el.play(); setPlaying(true) }
    }

    const handleSeekChange = (_: Event, val: number | number[]) => {
        setCurrent(val as number)
    }

    const handleSeekCommit = (_: Event | React.SyntheticEvent, val: number | number[]) => {
        const el = audioRef.current
        if (el) el.currentTime = val as number
        setSeeking(false)
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                bgcolor: 'grey.100',
                border: '1px solid',
                borderColor: 'grey.200',
                minWidth: 260,
                maxWidth: 360,
            }}
        >
            <audio ref={audioRef} src={url} preload="metadata" />

            {/* Play / Pause */}
            <IconButton
                onClick={togglePlay}
                size="small"
                sx={{
                    bgcolor: 'primary.main',
                    color: '#fff',
                    width: 32,
                    height: 32,
                    flexShrink: 0,
                    '&:hover': { bgcolor: 'primary.dark' },
                }}
            >
                {playing ? <Pause sx={{ fontSize: 18 }} /> : <PlayArrow sx={{ fontSize: 18 }} />}
            </IconButton>

            {/* Progress + time */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                <Typography
                    variant="caption"
                    noWrap
                    sx={{ color: 'text.secondary', fontSize: 10, lineHeight: 1.2, maxWidth: 200 }}
                >
                    {filename}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Slider
                        size="small"
                        value={current}
                        min={0}
                        max={duration || 1}
                        step={0.1}
                        onChange={handleSeekChange}
                        onChangeCommitted={handleSeekCommit}
                        onMouseDown={() => setSeeking(true)}
                        sx={{
                            flex: 1,
                            py: 0,
                            color: 'primary.main',
                            '& .MuiSlider-thumb': { width: 10, height: 10 },
                            '& .MuiSlider-rail': { opacity: 0.3 },
                        }}
                    />
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', whiteSpace: 'nowrap', minWidth: 60, textAlign: 'right' }}>
                        {formatTime(current)} / {formatTime(duration)}
                    </Typography>
                </Box>
            </Box>
        </Box>
    )
}

// ──────────────────────────────────────────────────────────────────────────────

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
    /** Applied to each file in the next upload batch (stored as media description). */
    const [uploadDescription, setUploadDescription] = useState('')

    const handleFileSelect = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0 || disabled) return

        setUploading(true)
        setError(null)

        const desc = uploadDescription.trim() || undefined
        for (const file of Array.from(files)) {
            try {
                const type = getMediaType(file.type)
                await onUpload(file, type, desc)
            } catch (err: any) {
                setError(err.response?.data?.message || `Failed to upload ${file.name}`)
            }
        }

        setUploading(false)
        onRefresh()
    }, [onUpload, onRefresh, disabled, uploadDescription])

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

            <TextField
                fullWidth
                size="small"
                label="Подпись для загружаемых файлов (необязательно)"
                placeholder="Будет сохранена в описании файла и показана в списке аудио"
                value={uploadDescription}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUploadDescription(e.target.value)}
                disabled={disabled}
                sx={{ mb: 2 }}
            />

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
                                primary={media.description?.trim() || media.filename}
                                secondary={`${media.type} • ${formatFileSize(media.size)}${media.description?.trim() ? ` • ${media.filename}` : ''}`}
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
                                    <AudioPlayer url={media.url} filename={media.filename} />
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
