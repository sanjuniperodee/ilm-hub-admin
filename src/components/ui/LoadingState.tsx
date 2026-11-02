import { Box, CircularProgress, Paper, Skeleton, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import { mergeSx, visuallyHidden } from './sx'

export interface LoadingStateProps {
  /**
   * Shape of the placeholder. Prefer a skeleton that matches the final layout:
   * - `spinner` — small centered spinner (dialogs, inline areas)
   * - `page` — header + cards (route-level fallback)
   * - `table` — table rows
   * - `cards` — grid of cards (stats, course tiles)
   * - `form` — label/field pairs
   * - `list` — rows with avatar + two lines
   */
  variant?: 'spinner' | 'page' | 'table' | 'cards' | 'form' | 'list'
  /** Number of rows / cards. */
  rows?: number
  /** Announced to screen readers; shown under the spinner. */
  label?: string
  /** Minimum height for the spinner variant. */
  minHeight?: number | string
  sx?: SxProps<Theme>
}

/**
 * Loading placeholder. Show it in place of the content that is loading — never a
 * blank area. Skeletons keep layout stable (no jump when data arrives).
 *
 * @example
 * if (loading) return <LoadingState variant="table" rows={8} />
 */
export function LoadingState({ variant = 'spinner', rows, label = 'Загрузка…', minHeight = 240, sx }: LoadingStateProps) {
  const sr = (
    <Box component="span" sx={visuallyHidden}>
      {label}
    </Box>
  )

  if (variant === 'spinner') {
    return (
      <Stack role="status" aria-live="polite" alignItems="center" justifyContent="center" gap={1.5} sx={mergeSx({ minHeight }, sx)}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Stack>
    )
  }

  if (variant === 'table') {
    const n = rows ?? 6
    return (
      <Paper role="status" aria-live="polite" sx={mergeSx({ overflow: 'hidden' }, sx)}>
        {sr}
        <Box sx={{ px: 2, py: 1.5, bgcolor: 'surface.sunken', borderBottom: 1, borderColor: 'divider' }}>
          <Skeleton width="40%" height={18} />
        </Box>
        {Array.from({ length: n }).map((_, i) => (
          <Stack key={i} direction="row" gap={2} alignItems="center" sx={{ px: 2, py: 1.5, borderBottom: i < n - 1 ? 1 : 0, borderColor: 'surface.sunken' }}>
            <Skeleton width="28%" height={18} />
            <Skeleton width="22%" height={18} />
            <Skeleton width="18%" height={18} />
            <Box sx={{ flex: 1 }} />
            <Skeleton variant="rounded" width={64} height={22} />
          </Stack>
        ))}
      </Paper>
    )
  }

  if (variant === 'cards') {
    const n = rows ?? 4
    return (
      <Box
        role="status"
        aria-live="polite"
        sx={mergeSx({ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }, sx)}
      >
        {sr}
        {Array.from({ length: n }).map((_, i) => (
          <Paper key={i} sx={{ p: 2.5 }}>
            <Skeleton width="50%" height={16} />
            <Skeleton width="35%" height={34} sx={{ mt: 1 }} />
          </Paper>
        ))}
      </Box>
    )
  }

  if (variant === 'form') {
    const n = rows ?? 4
    return (
      <Stack role="status" aria-live="polite" gap={2.5} sx={sx}>
        {sr}
        {Array.from({ length: n }).map((_, i) => (
          <Box key={i}>
            <Skeleton width={120} height={16} />
            <Skeleton variant="rounded" height={38} sx={{ mt: 0.75 }} />
          </Box>
        ))}
      </Stack>
    )
  }

  if (variant === 'list') {
    const n = rows ?? 5
    return (
      <Stack role="status" aria-live="polite" gap={2} sx={sx}>
        {sr}
        {Array.from({ length: n }).map((_, i) => (
          <Stack key={i} direction="row" gap={1.5} alignItems="center">
            <Skeleton variant="circular" width={32} height={32} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="45%" height={16} />
              <Skeleton width="70%" height={14} />
            </Box>
          </Stack>
        ))}
      </Stack>
    )
  }

  // page
  return (
    <Box role="status" aria-live="polite" sx={sx}>
      {sr}
      <Skeleton width={220} height={30} />
      <Skeleton width={360} height={18} sx={{ mb: 3 }} />
      <LoadingState variant="cards" rows={rows ?? 4} />
      <Paper sx={{ mt: 2, p: 2.5 }}>
        <Skeleton width="30%" height={20} />
        <Skeleton variant="rounded" height={180} sx={{ mt: 2 }} />
      </Paper>
    </Box>
  )
}
