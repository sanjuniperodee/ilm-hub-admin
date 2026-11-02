import { Box, Button, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import { FilterAltOff } from '@mui/icons-material'
import type { ReactNode } from 'react'
import { mergeSx } from './sx'

export interface ToolbarProps {
  /** Left side: usually `<SearchField>` followed by filter selects. */
  children?: ReactNode
  /** Right side: secondary actions (export, view toggle, bulk actions). */
  actions?: ReactNode
  /** Shows «Сбросить» when filters are active. */
  onReset?: () => void
  /** Whether any filter differs from default (controls the reset button). */
  hasActiveFilters?: boolean
  /** Result summary, e.g. «Найдено 42». Announced politely to screen readers. */
  summary?: ReactNode
  /** Visual container: `plain` (default, sits above a table) or `card` (inside a bordered box). */
  variant?: 'plain' | 'card'
  sx?: SxProps<Theme>
}

/**
 * Filters bar for list pages. Wraps on narrow screens; filters on the left,
 * secondary actions on the right. Filter controls should be `size="small"` and
 * have visible labels (use TextField `select` with `label`).
 *
 * @example
 * <Toolbar
 *   hasActiveFilters={!!q || level !== 'all'}
 *   onReset={() => { setQ(''); setLevel('all') }}
 *   summary={`Найдено ${total}`}
 *   actions={<Button variant="outlined" startIcon={<FileDownload />}>Экспорт</Button>}
 * >
 *   <SearchField value={q} onChange={setQ} />
 *   <TextField select label="Уровень" value={level} onChange={…} sx={{ minWidth: 140 }}>…</TextField>
 * </Toolbar>
 */
export function Toolbar({ children, actions, onReset, hasActiveFilters, summary, variant = 'plain', sx }: ToolbarProps) {
  return (
    <Box
      role="toolbar"
      aria-label="Фильтры"
      sx={mergeSx(
        {
          mb: 2,
          ...(variant === 'card' && {
            p: 1.5,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
          }),
        },
        sx,
      )}
    >
      <Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap">
        {children}
        {onReset && hasActiveFilters && (
          <Button size="small" onClick={onReset} startIcon={<FilterAltOff />} sx={{ color: 'text.secondary' }}>
            Сбросить
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {summary && (
          <Typography variant="body2" color="text.secondary" aria-live="polite" sx={{ whiteSpace: 'nowrap' }}>
            {summary}
          </Typography>
        )}
        {actions && (
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            {actions}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
