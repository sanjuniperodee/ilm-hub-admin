import type { ReactNode } from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import { DragIndicator } from '@mui/icons-material'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface SortableHandle {
  attributes: DraggableAttributes
  listeners: ReturnType<typeof useSortable>['listeners']
  setActivatorNodeRef: (el: HTMLElement | null) => void
  disabled: boolean
}

export interface SortableRenderState {
  index: number
  isDragging: boolean
  handle: SortableHandle
}

export interface SortableListProps<T> {
  items: T[]
  getId: (item: T) => string
  /** Receives the new order after a drop (pointer or keyboard). */
  onReorder: (next: T[]) => void
  renderItem: (item: T, state: SortableRenderState) => ReactNode
  /** Disable dragging (while saving, or when a filter hides part of the list). */
  disabled?: boolean
  /** Gap between items, theme spacing units. */
  gap?: number
}

const announcements = {
  onDragStart: () => 'Элемент поднят. Стрелками вверх и вниз выберите место, пробел — отпустить, Escape — отменить.',
  onDragOver: ({ over }: { over: { id: string | number } | null }) => (over ? 'Элемент перемещён.' : 'Элемент вне списка.'),
  onDragEnd: ({ over }: { over: { id: string | number } | null }) => (over ? 'Элемент отпущен, порядок изменён.' : 'Элемент отпущен.'),
  onDragCancel: () => 'Перемещение отменено.',
}

/**
 * Vertical list with drag-and-drop ordering (mouse, touch and keyboard via dnd-kit).
 * Drag starts only from the handle, so inputs inside items stay usable.
 */
export function SortableList<T>({ items, getId, onReorder, renderItem, disabled, gap = 1 }: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = items.map(getId)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove(items, from, to))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: 'Чтобы изменить порядок, нажмите пробел на ручке, двигайте стрелками и снова нажмите пробел.',
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap }}>
          {items.map((item, index) => (
            <SortableRow key={getId(item)} id={getId(item)} index={index} disabled={!!disabled}>
              {(state) => renderItem(item, state)}
            </SortableRow>
          ))}
        </Box>
      </SortableContext>
    </DndContext>
  )
}

function SortableRow({
  id,
  index,
  disabled,
  children,
}: {
  id: string
  index: number
  disabled: boolean
  children: (state: SortableRenderState) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })
  return (
    <Box
      component="li"
      ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 2 : 'auto',
        opacity: isDragging ? 0.85 : 1,
      }}
    >
      {children({ index, isDragging, handle: { attributes, listeners, setActivatorNodeRef, disabled } })}
    </Box>
  )
}

/** The grip button that starts dragging. Keyboard: Space to lift, arrows to move. */
export function DragHandle({ handle, label = 'Перетащить, чтобы изменить порядок' }: { handle: SortableHandle; label?: string }) {
  if (handle.disabled) {
    return (
      <Tooltip title="Сортировка недоступна, пока включён поиск или фильтр">
        <Box sx={{ display: 'flex', p: 0.75, color: 'action.disabled' }} aria-hidden>
          <DragIndicator fontSize="small" />
        </Box>
      </Tooltip>
    )
  }
  return (
    <IconButton
      ref={handle.setActivatorNodeRef}
      size="small"
      aria-label={label}
      {...handle.attributes}
      {...handle.listeners}
      onClick={(e) => e.stopPropagation()}
      sx={{ cursor: 'grab', color: 'text.secondary', touchAction: 'none', '&:active': { cursor: 'grabbing' } }}
    >
      <DragIndicator fontSize="small" />
    </IconButton>
  )
}
