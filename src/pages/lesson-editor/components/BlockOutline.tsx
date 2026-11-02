import { useRef, useState, type KeyboardEvent } from 'react'
import {
  Box,
  ButtonBase,
  CircularProgress,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { ContentCopyOutlined, DeleteOutline, DragIndicator, MoreVert, PhoneIphoneOutlined } from '@mui/icons-material'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from './dndModifiers'
import { CSS } from '@dnd-kit/utilities'
import { color, motion } from '../../../theme'
import { getBlockDisplayTitle, getBlockTypeLabel, isSavedBlockMissingKz } from '../blockTypes'
import type { BlockType, StudioBlock } from '../types'
import { AddBlockMenu, BlockTypeIcon } from './AddBlockMenu'

export interface BlockOutlineProps {
  blocks: StudioBlock[]
  selectedId: string | null
  /** Type of the unsaved new block, shown at the end of the list. */
  newDraftType?: BlockType | null
  /** Live title of the open block (from the draft). */
  liveTitle?: string
  dirty: boolean
  reordering: boolean
  onSelect: (id: string) => void
  onAdd: (type: BlockType) => void
  onReorder: (next: StudioBlock[]) => void
  onDuplicate: (block: StudioBlock) => void
  onDelete: (block: StudioBlock) => void
  onPreview: (block: StudioBlock) => void
}

const ITEM_ATTR = 'data-outline-item'

function OutlineRow({
  block,
  index,
  selected,
  title,
  dirty,
  disabled,
  onSelect,
  onMenu,
}: {
  block: StudioBlock
  index: number
  selected: boolean
  title: string
  dirty: boolean
  disabled: boolean
  onSelect: () => void
  onMenu: (el: HTMLElement) => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: block.id, disabled })
  const missingKz = isSavedBlockMissingKz(block)
  const typeLabel = getBlockTypeLabel(block.type)
  return (
    <Box
      component="li"
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: '8px',
        bgcolor: selected ? 'brand.sand' : isDragging ? 'background.paper' : 'transparent',
        boxShadow: isDragging ? 3 : 'none',
        zIndex: isDragging ? 2 : undefined,
        transition: `background-color ${motion.fast}`,
        '&:hover': { bgcolor: selected ? 'brand.sand' : color.bronze[50] },
        '&:hover .outline-actions, &:focus-within .outline-actions': { opacity: 1 },
        '&::before': selected
          ? { content: '""', position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, borderRadius: 2, bgcolor: 'primary.main' }
          : undefined,
      }}
    >
      <Tooltip title="Перетащите, или нажмите пробел и двигайте стрелками" placement="left" enterDelay={600}>
        <IconButton
          ref={setActivatorNodeRef}
          size="small"
          aria-label={`Переместить блок ${index + 1}`}
          disabled={disabled}
          {...attributes}
          {...listeners}
          sx={{ alignSelf: 'center', ml: 0.25, width: 24, height: 32, borderRadius: '6px', color: 'text.secondary', cursor: disabled ? 'default' : 'grab', '&:active': { cursor: 'grabbing' } }}
        >
          <DragIndicator sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <ButtonBase
        {...{ [ITEM_ATTR]: '' }}
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        aria-label={`Блок ${index + 1}, ${typeLabel}: ${title || 'без текста'}${missingKz ? ', нет перевода на казахский' : ''}${dirty ? ', есть несохранённые изменения' : ''}`}
        sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left', gap: 1, py: 0.875, pr: selected ? '30px' : '4px', borderRadius: '8px', '& > [aria-hidden]': { mt: '2px' } }}
      >
        <Typography variant="caption" sx={{ width: 16, textAlign: 'right', color: 'text.secondary', fontVariantNumeric: 'tabular-nums', flexShrink: 0, alignSelf: 'flex-start', mt: '6px' }}>
          {index + 1}
        </Typography>
        <BlockTypeIcon type={block.type} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="body2"
            dir="auto"
            sx={{
              fontWeight: selected ? 600 : 500,
              color: title ? 'text.primary' : 'text.secondary',
              fontFamily: "'Montserrat', 'Noto Sans Arabic', sans-serif",
              lineHeight: 1.35,
              textAlign: 'start',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              overflowWrap: 'anywhere',
            }}
          >
            {title || 'Без текста'}
          </Typography>
          <Stack direction="row" alignItems="center" gap={0.75} sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" noWrap component="span" sx={{ lineHeight: 1.3, minWidth: 0 }}>
              {typeLabel}
            </Typography>
            {missingKz && (
              <Box
                component="span"
                title="Казахский перевод не заполнен"
                sx={{ flexShrink: 0, fontSize: 10, fontWeight: 700, lineHeight: '15px', px: 0.5, borderRadius: '4px', color: color.warning.dark, bgcolor: color.warning.soft }}
              >
                нет KZ
              </Box>
            )}
            {dirty && (
              <Box component="span" title="Есть несохранённые изменения" sx={{ flexShrink: 0, width: 7, height: 7, borderRadius: '50%', bgcolor: color.warning.main }} />
            )}
          </Stack>
        </Box>
      </ButtonBase>
      <Stack direction="row" alignItems="center" sx={{ position: 'absolute', right: 2, top: 4 }}>
        <IconButton
          className="outline-actions"
          size="small"
          aria-label={`Действия с блоком ${index + 1}`}
          aria-haspopup="menu"
          onClick={(e) => onMenu(e.currentTarget)}
          sx={{ opacity: selected ? 1 : 0, width: 28, height: 28, bgcolor: selected ? 'transparent' : color.bronze[50], '&:hover': { bgcolor: color.bronze[100] }, '@media (hover: none)': { opacity: 1 }, '&:focus-visible': { opacity: 1 } }}
        >
          <MoreVert sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>
    </Box>
  )
}

export function BlockOutline({
  blocks,
  selectedId,
  newDraftType,
  liveTitle,
  dirty,
  reordering,
  onSelect,
  onAdd,
  onReorder,
  onDuplicate,
  onDelete,
  onPreview,
}: BlockOutlineProps) {
  const listRef = useRef<HTMLUListElement | null>(null)
  const [menu, setMenu] = useState<{ el: HTMLElement; block: StudioBlock } | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const positionOf = (id: string | number) => blocks.findIndex((b) => b.id === id) + 1
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Блок ${positionOf(active.id)} поднят. Стрелки вверх и вниз — переместить, пробел — оставить, Escape — отменить.`,
    onDragOver: ({ over }) => (over ? `Позиция ${positionOf(over.id)} из ${blocks.length}.` : 'Вне списка.'),
    onDragEnd: ({ over }) => (over ? `Блок перемещён на позицию ${positionOf(over.id)}.` : 'Перемещение отменено.'),
    onDragCancel: () => 'Перемещение отменено.',
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = blocks.findIndex((b) => b.id === active.id)
    const to = blocks.findIndex((b) => b.id === over.id)
    if (from < 0 || to < 0) return
    onReorder(arrayMove(blocks, from, to))
  }

  const onListKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>(`[${ITEM_ATTR}]`) ?? [])
    const idx = items.findIndex((el) => el === document.activeElement)
    if (idx < 0) return
    e.preventDefault()
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : Math.min(items.length - 1, Math.max(0, idx + (e.key === 'ArrowDown' ? 1 : -1)))
    items[next]?.focus()
  }

  return (
    <Box component="nav" aria-label="Блоки урока" sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
        <Box>
          <Typography variant="subtitle2" component="h2">
            Блоки
          </Typography>
          <Typography variant="caption" color="text.secondary" component="p" aria-live="polite">
            {reordering ? 'Сохраняем порядок…' : blocks.length ? `${blocks.length} в порядке показа` : 'Пока пусто'}
          </Typography>
        </Box>
        {reordering && <CircularProgress size={16} aria-label="Сохраняем порядок" />}
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 0.75, pb: 1 }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          modifiers={[restrictToVerticalAxis]}
          accessibility={{
            announcements,
            screenReaderInstructions: { draggable: 'Чтобы переместить блок, нажмите пробел, затем стрелки вверх и вниз. Пробел — оставить, Escape — отменить.' },
          }}
        >
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <Box component="ul" ref={listRef} onKeyDown={onListKeyDown} sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {blocks.map((b, i) => {
                const selected = selectedId === b.id
                return (
                  <OutlineRow
                    key={b.id}
                    block={b}
                    index={i}
                    selected={selected}
                    title={selected && liveTitle !== undefined ? liveTitle : getBlockDisplayTitle(b)}
                    dirty={selected && dirty}
                    disabled={reordering}
                    onSelect={() => onSelect(b.id)}
                    onMenu={(el) => setMenu({ el, block: b })}
                  />
                )
              })}
              {newDraftType && (
                <Box
                  component="li"
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.875,
                    pl: 4.25,
                    pr: 1,
                    borderRadius: '8px',
                    bgcolor: 'brand.sand',
                    border: '1px dashed',
                    borderColor: color.bronze[300],
                    '&::before': { content: '""', position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, borderRadius: 2, bgcolor: 'primary.main' },
                  }}
                  aria-current="true"
                >
                  <Typography variant="caption" sx={{ width: 18, textAlign: 'right', color: 'text.secondary' }}>
                    {blocks.length + 1}
                  </Typography>
                  <BlockTypeIcon type={newDraftType} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap dir="auto" sx={{ fontWeight: 600 }}>
                      {liveTitle || 'Новый блок'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="p">
                      {getBlockTypeLabel(newDraftType)}, не сохранён
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </SortableContext>
        </DndContext>
      </Box>

      <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <AddBlockMenu onPick={onAdd} buttonProps={{ fullWidth: true, variant: 'outlined' }} />
      </Box>

      <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            if (menu) onPreview(menu.block)
            setMenu(null)
          }}
        >
          <ListItemIcon>
            <PhoneIphoneOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Открыть предпросмотр" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menu) onDuplicate(menu.block)
            setMenu(null)
          }}
        >
          <ListItemIcon>
            <ContentCopyOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Дублировать" secondary="Копия встанет следом" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menu) onDelete(menu.block)
            setMenu(null)
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteOutline fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText primary="Удалить блок" />
        </MenuItem>
      </Menu>
    </Box>
  )
}
