/**
 * Small building blocks shared by every lesson exercise editor, so options, correct
 * answers, row actions and inline errors look and behave the same everywhere.
 */
import { Box, Button, IconButton, Stack, Tooltip, Typography, type SxProps, type Theme } from '@mui/material'
import {
  ArrowDownward,
  ArrowUpward,
  CheckBox,
  CheckBoxOutlineBlank,
  CheckCircle,
  DeleteOutline,
  ErrorOutline,
  InfoOutlined,
  RadioButtonUnchecked,
} from '@mui/icons-material'
import type { ReactNode } from 'react'
import { color } from '../../theme'
import type { ValidationIssue } from './exerciseValidation'

/** Inline validation messages under a group of fields. Icon + text — never colour alone. */
export function FieldIssues({ issues, sx }: { issues: ValidationIssue[]; sx?: SxProps<Theme> }) {
  if (!issues.length) return null
  return (
    <Stack gap={0.5} sx={sx}>
      {issues.map((issue) => (
        <Stack key={`${issue.field}-${issue.message}`} direction="row" gap={0.75} alignItems="flex-start">
          <ErrorOutline sx={{ fontSize: 16, mt: '2px', color: 'error.main' }} aria-hidden />
          <Typography variant="caption" sx={{ color: 'error.dark', fontWeight: 500 }}>
            {issue.message}
          </Typography>
        </Stack>
      ))}
    </Stack>
  )
}

/** Explains that a field group is shared by RU and KZ (Arabic, media, correct answers). */
export function SharedFieldsNote({ children = 'Общие для RU и KZ' }: { children?: ReactNode }) {
  return (
    <Stack direction="row" gap={0.5} alignItems="center" sx={{ color: 'text.secondary' }}>
      <InfoOutlined sx={{ fontSize: 15 }} aria-hidden />
      <Typography variant="caption">{children}</Typography>
    </Stack>
  )
}

/** Header of a list inside an editor: label, optional count and a right-side action. */
export function ListHeader({ title, hint, action }: { title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <Stack direction="row" alignItems="flex-end" justifyContent="space-between" gap={1} sx={{ mb: 1 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" component="p">
          {title}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary" component="p">
            {hint}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  )
}

/**
 * Marks an option as correct. `single` renders radio semantics (exactly one correct),
 * otherwise checkbox semantics. The label says «Верный» so the state is readable without colour.
 */
export function CorrectToggle({
  checked,
  onChange,
  single,
  label,
  compact,
}: {
  checked: boolean
  onChange: () => void
  single?: boolean
  /** Accessible name, e.g. «Вариант 2 — правильный». */
  label: string
  /** Icon-only (tight rows). */
  compact?: boolean
}) {
  const icon = checked ? (
    single ? <CheckCircle fontSize="small" /> : <CheckBox fontSize="small" />
  ) : single ? (
    <RadioButtonUnchecked fontSize="small" />
  ) : (
    <CheckBoxOutlineBlank fontSize="small" />
  )
  if (compact) {
    return (
      <Tooltip title={checked ? 'Правильный ответ' : 'Отметить как правильный'}>
        <IconButton
          role={single ? 'radio' : 'checkbox'}
          aria-checked={checked}
          aria-label={label}
          onClick={onChange}
          size="small"
          sx={{ color: checked ? 'success.main' : 'text.secondary', flexShrink: 0 }}
        >
          {icon}
        </IconButton>
      </Tooltip>
    )
  }
  return (
    <Button
      role={single ? 'radio' : 'checkbox'}
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      size="small"
      variant="outlined"
      startIcon={icon}
      sx={{
        flexShrink: 0,
        minWidth: 112,
        justifyContent: 'flex-start',
        color: checked ? color.success.dark : 'text.secondary',
        borderColor: checked ? color.success.main : 'divider',
        bgcolor: checked ? color.success.soft : 'transparent',
        '&:hover': {
          borderColor: checked ? color.success.main : 'surface.borderStrong',
          bgcolor: checked ? color.success.soft : 'surface.sunken',
        },
      }}
    >
      {checked ? 'Верный' : 'Неверный'}
    </Button>
  )
}

/** Move up / move down / delete for a row in an editable list. */
export function RowActions({
  index,
  count,
  onMove,
  onRemove,
  minCount = 1,
  itemLabel,
}: {
  index: number
  count: number
  onMove?: (from: number, to: number) => void
  onRemove: () => void
  /** Rows can't be removed below this count (delete is disabled with an explanation). */
  minCount?: number
  /** «вариант 2», «пару 3» — used in accessible names. */
  itemLabel: string
}) {
  const canRemove = count > minCount
  return (
    <Stack direction="row" sx={{ flexShrink: 0 }}>
      {onMove && (
        <>
          <Tooltip title="Выше">
            <span>
              <IconButton size="small" aria-label={`Переместить ${itemLabel} выше`} disabled={index === 0} onClick={() => onMove(index, index - 1)}>
                <ArrowUpward fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Ниже">
            <span>
              <IconButton
                size="small"
                aria-label={`Переместить ${itemLabel} ниже`}
                disabled={index >= count - 1}
                onClick={() => onMove(index, index + 1)}
              >
                <ArrowDownward fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </>
      )}
      <Tooltip title={canRemove ? 'Удалить' : `Должно остаться минимум ${minCount}`}>
        <span>
          <IconButton size="small" aria-label={`Удалить ${itemLabel}`} disabled={!canRemove} onClick={onRemove} sx={{ '&:hover': { color: 'error.main' } }}>
            <DeleteOutline fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  )
}

/** Bordered row used for options/pairs; `tone="correct"` highlights the correct answer. */
export function EditorRow({
  children,
  tone = 'default',
  sx,
}: {
  children: ReactNode
  tone?: 'default' | 'correct' | 'muted'
  sx?: SxProps<Theme>
}) {
  return (
    <Box
      sx={[
        {
          p: 1.25,
          border: '1px solid',
          borderColor: tone === 'correct' ? color.success.light : 'divider',
          borderLeftWidth: 3,
          borderLeftColor: tone === 'correct' ? color.success.main : tone === 'muted' ? color.neutral[300] : 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper',
          minWidth: 0,
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Box>
  )
}

/**
 * Inputs that may hold Cyrillic or Arabic (answer options, pair texts): direction follows
 * the first strong character and Arabic glyphs fall back to Noto Sans Arabic.
 */
export const mixedInputProps = {
  dir: 'auto',
  style: { fontFamily: "'Montserrat', 'Noto Sans Arabic', system-ui, sans-serif" },
} as const

/** `mixedInputProps`, with Arabic enlarged (~1.3×) when the value contains Arabic letters. */
export function mixedInputPropsFor(value: string | undefined) {
  if (!value || !/[\u0600-\u06FF]/.test(value)) return mixedInputProps
  return { ...mixedInputProps, style: { ...mixedInputProps.style, fontSize: 20, lineHeight: 1.6 } }
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = list.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
