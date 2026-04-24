import { useRef } from 'react'
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { Add, DeleteOutline, DragIndicator } from '@mui/icons-material'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export type GridItemRow = {
  id: string
  mainRu: string
  mainKz: string
  mainAr: string
  captionRu: string
  captionKz: string
  captionAr: string
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
    mainAr: '',
    captionRu: '',
    captionKz: '',
    captionAr: '',
    audioUrl: '',
  }
}

type ColumnMode = '2' | '3' | '4' | 'auto'

type GridBlockEditorProps = {
  titleRu: string
  titleKz: string
  titleAr: string
  onTitleChange: (field: 'titleRu' | 'titleKz' | 'titleAr', v: string) => void
  columnMode: ColumnMode
  onColumnMode: (m: ColumnMode) => void
  showCaption: boolean
  onShowCaption: (v: boolean) => void
  interactive: boolean
  onInteractive: (v: boolean) => void
  items: GridItemRow[]
  onItemsChange: (rows: GridItemRow[]) => void
  blockId: string | undefined
  onUploadItemAudio: (rowId: string, file: File) => Promise<string>
}

function SortableItem({
  item,
  index,
  showCaption,
  interactive,
  onUpdate,
  onRemove,
  onUploadAudioFile,
  blockId,
}: {
  item: GridItemRow
  index: number
  showCaption: boolean
  interactive: boolean
  onUpdate: (p: Partial<GridItemRow>) => void
  onRemove: () => void
  onUploadAudioFile: (file: File) => Promise<void>
  blockId: string | undefined
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const fileRef = useRef<HTMLInputElement | null>(null)
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        opacity: isDragging ? 0.6 : 1,
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Box
          {...attributes}
          {...listeners}
          sx={{ cursor: 'grab', color: 'text.secondary', pt: 0.5, '&:active': { cursor: 'grabbing' } }}
        >
          <DragIndicator fontSize="small" />
        </Box>
        <Stack spacing={1.25} flex={1} minWidth={0}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Элемент {index + 1}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              fullWidth
              required
              label="Основной текст (RU)"
              value={item.mainRu}
              onChange={(e) => onUpdate({ mainRu: e.target.value })}
            />
            <TextField
              size="small"
              fullWidth
              label="Основной текст (KZ)"
              value={item.mainKz}
              onChange={(e) => onUpdate({ mainKz: e.target.value })}
            />
            <TextField
              size="small"
              fullWidth
              label="Основной текст (AR)"
              value={item.mainAr}
              onChange={(e) => onUpdate({ mainAr: e.target.value })}
            />
          </Stack>
          {showCaption && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                size="small"
                fullWidth
                label="Подпись (RU)"
                value={item.captionRu}
                onChange={(e) => onUpdate({ captionRu: e.target.value })}
              />
              <TextField
                size="small"
                fullWidth
                label="Подпись (KZ)"
                value={item.captionKz}
                onChange={(e) => onUpdate({ captionKz: e.target.value })}
              />
              <TextField
                size="small"
                fullWidth
                label="Подпись (AR)"
                value={item.captionAr}
                onChange={(e) => onUpdate({ captionAr: e.target.value })}
              />
            </Stack>
          )}
          {interactive && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              <TextField
                size="small"
                fullWidth
                label="URL аудио (после загрузки)"
                value={item.audioUrl}
                onChange={(e) => onUpdate({ audioUrl: e.target.value })}
                helperText="Один файл произношения на все языки"
              />
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (!f) return
                  if (!blockId) {
                    alert('Сначала сохраните блок, чтобы прикрепить аудио')
                    return
                  }
                  try {
                    await onUploadAudioFile(f)
                  } catch (err) {
                    console.error(err)
                    alert('Не удалось загрузить аудио')
                  }
                }}
              />
              <Button
                size="small"
                variant="outlined"
                disabled={!blockId}
                onClick={() => fileRef.current?.click()}
              >
                Загрузить аудио
              </Button>
            </Stack>
          )}
        </Stack>
        <IconButton size="small" color="error" onClick={onRemove} title="Удалить элемент" sx={{ flexShrink: 0 }}>
          <DeleteOutline fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  )
}

export default function GridBlockEditor({
  titleRu,
  titleKz,
  titleAr,
  onTitleChange,
  columnMode,
  onColumnMode,
  showCaption,
  onShowCaption,
  interactive,
  onInteractive,
  items,
  onItemsChange,
  blockId,
  onUploadItemAudio,
}: GridBlockEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((r) => r.id === active.id)
    const newIndex = items.findIndex((r) => r.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onItemsChange(arrayMove(items, oldIndex, newIndex))
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Сетка карточек (буквы, слова, перечисления). Центрируется в приложении; при необходимости — подписи и аудио по
        нажатию.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          size="small"
          fullWidth
          label="Заголовок (RU), необязательно"
          value={titleRu}
          onChange={(e) => onTitleChange('titleRu', e.target.value)}
        />
        <TextField
          size="small"
          fullWidth
          label="Заголовок (KZ)"
          value={titleKz}
          onChange={(e) => onTitleChange('titleKz', e.target.value)}
        />
        <TextField
          size="small"
          fullWidth
          label="Заголовок (AR)"
          value={titleAr}
          onChange={(e) => onTitleChange('titleAr', e.target.value)}
        />
      </Stack>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>Количество колонок</InputLabel>
        <Select
          label="Количество колонок"
          value={columnMode}
          onChange={(e) => onColumnMode(e.target.value as ColumnMode)}
        >
          <MenuItem value="2">2</MenuItem>
          <MenuItem value="3">3</MenuItem>
          <MenuItem value="4">4</MenuItem>
          <MenuItem value="auto">Авто</MenuItem>
        </Select>
      </FormControl>
      <FormControlLabel
        control={<Switch checked={showCaption} onChange={(_, v) => onShowCaption(v)} />}
        label="Показывать подписи"
      />
      <FormControlLabel
        control={<Switch checked={interactive} onChange={(_, v) => onInteractive(v)} />}
        label="Интерактивные карточки (аудио по нажатию)"
      />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <Stack spacing={1.5}>
            {items.map((row, i) => (
              <SortableItem
                key={row.id}
                item={row}
                index={i}
                showCaption={showCaption}
                interactive={interactive}
                blockId={blockId}
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
                  const url = await onUploadItemAudio(row.id, f)
                  const next = items.slice()
                  next[i] = { ...row, audioUrl: url }
                  onItemsChange(next)
                }}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>
      <Button
        size="small"
        startIcon={<Add />}
        onClick={() => onItemsChange([...items, newGridItemRow()])}
      >
        Добавить элемент
      </Button>
    </Stack>
  )
}
