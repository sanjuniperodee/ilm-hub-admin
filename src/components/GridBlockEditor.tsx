import { useState } from 'react'
import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { Add, DeleteOutline, DragIndicator, LinkOff } from '@mui/icons-material'
import toast from 'react-hot-toast'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FileDropzone, FormSection, getErrorMessage } from './ui'
import { mixedInputProps } from './lesson-editor/EditorPrimitives'

export type GridItemRow = {
  id: string
  mainRu: string
  mainKz: string
  captionRu: string
  captionKz: string
  /** Same URL in all locale payloads; one audio for all. */
  audioUrl: string
}

export function newGridItemRow(): GridItemRow {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `grid-${Date.now()}-${Math.random().toString(16).slice(2)}`
  return {
    id,
    mainRu: '',
    mainKz: '',
    captionRu: '',
    captionKz: '',
    audioUrl: '',
  }
}

type ColumnMode = '2' | '3' | '4' | 'auto'

type GridBlockEditorProps = {
  titleRu: string
  titleKz: string
  onTitleChange: (field: 'titleRu' | 'titleKz', v: string) => void
  columnMode: ColumnMode
  onColumnMode: (m: ColumnMode) => void
  showCaption: boolean
  onShowCaption: (v: boolean) => void
  interactive: boolean
  onInteractive: (v: boolean) => void
  items: GridItemRow[]
  onItemsChange: (rows: GridItemRow[]) => void
  onUploadItemAudio: (rowId: string, file: File) => Promise<void>
  /** Language being edited; main text and captions follow it. */
  lang?: 'ru' | 'kz'
  /** Show the «нужен текст / нужно аудио» hints (after a save attempt). */
  showIssues?: boolean
}

function SortableItem({
  item,
  index,
  count,
  lang,
  showCaption,
  interactive,
  showIssues,
  onUpdate,
  onRemove,
  onUploadAudioFile,
}: {
  item: GridItemRow
  index: number
  count: number
  lang: 'ru' | 'kz'
  showCaption: boolean
  interactive: boolean
  showIssues?: boolean
  onUpdate: (p: Partial<GridItemRow>) => void
  onRemove: () => void
  onUploadAudioFile: (file: File) => Promise<void>
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const [uploading, setUploading] = useState(false)
  const style = { transform: CSS.Transform.toString(transform), transition }
  const isRu = lang === 'ru'
  const mainMissing = showIssues && !(item.mainRu || '').trim()
  const audioMissing = showIssues && interactive && !(item.audioUrl || '').trim()

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        p: 1.25,
        borderRadius: 2,
        border: '1px solid',
        borderColor: isDragging ? 'primary.light' : 'divider',
        bgcolor: 'background.paper',
        position: 'relative',
        zIndex: isDragging ? 2 : undefined,
        boxShadow: isDragging ? 3 : 'none',
      }}
    >
      <Stack direction="row" alignItems="flex-start" gap={1}>
        <Tooltip title="Перетащите или нажмите пробел и используйте стрелки">
          <IconButton
            ref={setActivatorNodeRef}
            size="small"
            aria-label={`Переместить карточку ${index + 1}`}
            {...attributes}
            {...listeners}
            sx={{ cursor: 'grab', mt: 0.5, color: 'text.secondary', '&:active': { cursor: 'grabbing' } }}
          >
            <DragIndicator fontSize="small" />
          </IconButton>
        </Tooltip>
        <Stack gap={1.25} flex={1} minWidth={0}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
            <TextField
              size="small"
              fullWidth
              required={isRu}
              label={isRu ? `Карточка ${index + 1}` : `Карточка ${index + 1} (KZ)`}
              value={isRu ? item.mainRu : item.mainKz}
              onChange={(e) => onUpdate(isRu ? { mainRu: e.target.value } : { mainKz: e.target.value })}
              placeholder={isRu ? 'Буква, слог или слово' : item.mainRu || undefined}
              InputLabelProps={!isRu && item.mainRu ? { shrink: true } : undefined}
              helperText={isRu ? (mainMissing ? 'Пустые карточки не сохраняются' : undefined) : 'Если пусто — как в RU'}
              error={isRu && mainMissing}
              inputProps={{ ...mixedInputProps, style: { ...mixedInputProps.style, fontSize: 18 } }}
            />
            {showCaption && (
              <TextField
                size="small"
                fullWidth
                label={`Подпись (${isRu ? 'RU' : 'KZ'})`}
                value={isRu ? item.captionRu : item.captionKz}
                onChange={(e) => onUpdate(isRu ? { captionRu: e.target.value } : { captionKz: e.target.value })}
                placeholder={!isRu && item.captionRu ? `RU: ${item.captionRu}` : 'Например: алиф'}
                InputLabelProps={!isRu && item.captionRu ? { shrink: true } : undefined}
              />
            )}
          </Stack>
          {interactive && (
            <Box>
              {item.audioUrl ? (
                <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
                  <Box component="audio" controls preload="none" src={item.audioUrl} sx={{ height: 36, flex: 1, minWidth: 0, maxWidth: 360 }} />
                  <Tooltip title="Отвязать аудио">
                    <IconButton size="small" aria-label={`Отвязать аудио карточки ${index + 1}`} onClick={() => onUpdate({ audioUrl: '' })}>
                      <LinkOff fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ) : (
                <FileDropzone
                  compact
                  accept="audio"
                  uploading={uploading}
                  error={audioMissing ? 'Для интерактивной сетки нужно аудио у каждой карточки' : null}
                  label="Аудио произношения"
                  onFiles={async ([file]) => {
                    setUploading(true)
                    try {
                      await onUploadAudioFile(file)
                      toast.success('Аудио загружено')
                    } catch (err) {
                      toast.error(getErrorMessage(err, 'Не удалось загрузить аудио'))
                    } finally {
                      setUploading(false)
                    }
                  }}
                />
              )}
            </Box>
          )}
        </Stack>
        <Tooltip title={count > 1 ? 'Удалить карточку' : 'Очистить карточку'}>
          <IconButton size="small" aria-label={`Удалить карточку ${index + 1}`} onClick={onRemove} sx={{ mt: 0.5, '&:hover': { color: 'error.main' } }}>
            <DeleteOutline fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  )
}

export default function GridBlockEditor({
  titleRu,
  titleKz,
  onTitleChange,
  columnMode,
  onColumnMode,
  showCaption,
  onShowCaption,
  interactive,
  onInteractive,
  items,
  onItemsChange,
  onUploadItemAudio,
  lang = 'ru',
  showIssues,
}: GridBlockEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((r) => r.id === active.id)
    const newIndex = items.findIndex((r) => r.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onItemsChange(arrayMove(items, oldIndex, newIndex))
  }

  const isRu = lang === 'ru'
  const filled = items.filter((r) => r.mainRu.trim()).length

  return (
    <>
      <FormSection title="Сетка" description="Центрируется в приложении. Подходит для букв, слогов и коротких слов." divider={false}>
        <TextField
          fullWidth
          label={`Заголовок (${isRu ? 'RU' : 'KZ'}), необязательно`}
          value={isRu ? titleRu : titleKz}
          onChange={(e) => onTitleChange(isRu ? 'titleRu' : 'titleKz', e.target.value)}
          placeholder={!isRu && titleRu ? `RU: ${titleRu}` : 'Например: Буквы-близнецы'}
          InputLabelProps={!isRu && titleRu ? { shrink: true } : undefined}
        />
        <Box>
          <Typography variant="subtitle2" component="p" id="grid-columns-label" sx={{ mb: 0.75 }}>
            Колонки
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={columnMode}
            onChange={(_, v) => v && onColumnMode(v as ColumnMode)}
            aria-labelledby="grid-columns-label"
            sx={{ '& .MuiToggleButton-root': { px: 2, textTransform: 'none' } }}
          >
            <ToggleButton value="2">2</ToggleButton>
            <ToggleButton value="3">3</ToggleButton>
            <ToggleButton value="4">4</ToggleButton>
            <ToggleButton value="auto">Авто</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Stack>
          <FormControlLabel control={<Switch checked={showCaption} onChange={(_, v) => onShowCaption(v)} />} label="Подписи под карточками" />
          <FormControlLabel
            control={<Switch checked={interactive} onChange={(_, v) => onInteractive(v)} />}
            label={
              <Box>
                <Typography variant="body1">Аудио по нажатию</Typography>
                <Typography variant="caption" color="text.secondary">
                  У каждой карточки должна быть своя запись
                </Typography>
              </Box>
            }
            sx={{ alignItems: 'flex-start', '& .MuiSwitch-root': { mt: -0.5 } }}
          />
        </Stack>
      </FormSection>

      <FormSection
        title="Карточки"
        description={
          <>
            {filled} из {items.length} заполнено. Порядок меняется перетаскиванием.
            {!isRu && ' Основной текст в KZ можно не заполнять — возьмётся из RU.'}
          </>
        }
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <Stack gap={1}>
              {items.map((row, i) => (
                <SortableItem
                  key={row.id}
                  item={row}
                  index={i}
                  count={items.length}
                  lang={lang}
                  showCaption={showCaption}
                  interactive={interactive}
                  showIssues={showIssues}
                  onUpdate={(p) => {
                    const next = items.slice()
                    next[i] = { ...row, ...p }
                    onItemsChange(next)
                  }}
                  onRemove={() => {
                    if (items.length <= 1) {
                      onItemsChange([newGridItemRow()])
                      return
                    }
                    onItemsChange(items.filter((_, j) => j !== i))
                  }}
                  onUploadAudioFile={async (f) => {
                    await onUploadItemAudio(row.id, f)
                  }}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
        <Box>
          <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => onItemsChange([...items, newGridItemRow()])}>
            Добавить карточку
          </Button>
        </Box>
        {interactive && (
          <Typography variant="caption" color="text.secondary">
            Если блок ещё не сохранён, он сохранится автоматически при первой загрузке аудио.
          </Typography>
        )}
      </FormSection>
    </>
  )
}
