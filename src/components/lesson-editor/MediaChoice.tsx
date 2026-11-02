/**
 * Pick one uploaded media file (image thumbnails or audio chips). Used by Match Pairs,
 * Image ↔ Word and the test question media pickers. Selection is a toggle: picking the
 * selected file again clears it.
 */
import { Box, ButtonBase, Chip, Stack, Tooltip, Typography } from '@mui/material'
import { Audiotrack, Check } from '@mui/icons-material'
import { color, motion, radius } from '../../theme'

export interface MediaChoiceFile {
  id: string
  url: string
  type: string
  filename?: string
  description?: string
}

export function mediaDisplayName(f: MediaChoiceFile): string {
  const d = f.description?.trim()
  if (d) return d
  const n = f.filename?.trim()
  if (n) return n
  return f.id.slice(0, 8)
}

export function MediaChoice({
  files,
  selectedId,
  onSelect,
  kind,
  emptyText,
  label,
}: {
  files: MediaChoiceFile[]
  selectedId?: string
  onSelect: (mediaId: string) => void
  kind: 'image' | 'audio'
  /** Shown when there is nothing to pick yet. */
  emptyText?: string
  /** Accessible group name, e.g. «Картинка для пары 2». */
  label: string
}) {
  if (files.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary" component="p">
        {emptyText ?? (kind === 'image' ? 'Загрузите изображения в разделе «Медиа блока».' : 'Загрузите аудио в разделе «Медиа блока».')}
      </Typography>
    )
  }
  const selected = files.find((f) => f.id === selectedId)
  return (
    <Box>
      <Box role="group" aria-label={label} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {files.map((file) => {
          const isSelected = selectedId === file.id
          const name = mediaDisplayName(file)
          if (kind === 'image') {
            return (
              <Tooltip key={file.id} title={name} enterDelay={400}>
                <ButtonBase
                  aria-pressed={isSelected}
                  aria-label={`${name}${isSelected ? ' — выбрано' : ''}`}
                  onClick={() => onSelect(file.id)}
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: `${radius.md}px`,
                    overflow: 'hidden',
                    position: 'relative',
                    border: '2px solid',
                    borderColor: isSelected ? color.success.main : color.neutral[200],
                    transition: `border-color ${motion.fast}`,
                    '&:hover': { borderColor: isSelected ? color.success.main : color.bronze[500] },
                    '&.Mui-focusVisible': { outline: `2px solid ${color.bronze[500]}`, outlineOffset: 2 },
                  }}
                >
                  <Box
                    component="img"
                    src={file.url}
                    alt=""
                    loading="lazy"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {isSelected && (
                    <Box
                      aria-hidden
                      sx={{
                        position: 'absolute',
                        top: 3,
                        right: 3,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        bgcolor: color.success.main,
                        color: 'common.white',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Check sx={{ fontSize: 13 }} />
                    </Box>
                  )}
                </ButtonBase>
              </Tooltip>
            )
          }
          const short = name.length > 36 ? `${name.slice(0, 33)}…` : name
          return (
            <Tooltip key={file.id} title={name} enterDelay={400}>
              <Chip
                icon={isSelected ? <Check fontSize="small" /> : <Audiotrack fontSize="small" />}
                label={short}
                aria-pressed={isSelected}
                onClick={() => onSelect(file.id)}
                variant="outlined"
                sx={{
                  maxWidth: 240,
                  borderColor: isSelected ? color.success.main : 'divider',
                  bgcolor: isSelected ? color.success.soft : 'background.paper',
                  color: isSelected ? color.success.dark : 'text.primary',
                  fontWeight: isSelected ? 600 : 500,
                  '& .MuiChip-icon': { color: isSelected ? color.success.dark : 'text.secondary' },
                }}
              />
            </Tooltip>
          )
        })}
      </Box>
      <Stack direction="row" sx={{ mt: 0.5 }}>
        <Typography variant="caption" color={selected ? 'success.dark' : 'text.secondary'}>
          {selected ? `Выбрано: ${mediaDisplayName(selected)}` : 'Ничего не выбрано'}
        </Typography>
      </Stack>
    </Box>
  )
}
