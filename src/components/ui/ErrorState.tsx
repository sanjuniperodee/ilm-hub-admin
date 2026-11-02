import { Box, Button, CircularProgress, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import { ErrorOutline, Refresh } from '@mui/icons-material'
import { useState, type ReactNode } from 'react'
import { color } from '../../theme/tokens'
import { getErrorMessage } from './errors'
import { mergeSx } from './sx'

export interface ErrorStateProps {
  /** What failed, e.g. «Не удалось загрузить словарь». */
  title?: ReactNode
  /** Error object or message. Axios errors are converted via `getErrorMessage`. */
  error?: unknown
  /** Retry handler — shows a «Повторить» button. May return a promise. */
  onRetry?: () => void | Promise<unknown>
  /** External retrying flag (otherwise tracked from the onRetry promise). */
  retrying?: boolean
  /** Extra action next to retry. */
  action?: ReactNode
  /** `inline` — compact row for inside cards/tables; `block` — centered section. */
  variant?: 'block' | 'inline'
  sx?: SxProps<Theme>
}

/**
 * Error placeholder that says what failed and how to recover. Use in place of the
 * content that failed to load; for form-submit errors use an `<Alert>` near the form.
 *
 * @example
 * if (error) return <ErrorState title="Не удалось загрузить пользователей" error={error} onRetry={refetch} />
 */
export function ErrorState({
  title = 'Не удалось загрузить данные',
  error,
  onRetry,
  retrying,
  action,
  variant = 'block',
  sx,
}: ErrorStateProps) {
  const [busy, setBusy] = useState(false)
  const message = error != null ? getErrorMessage(error) : null
  const inline = variant === 'inline'
  const isRetrying = retrying ?? busy

  const handleRetry = async () => {
    if (!onRetry) return
    setBusy(true)
    try {
      await onRetry()
    } finally {
      setBusy(false)
    }
  }

  const retry = onRetry && (
    <Button
      variant="outlined"
      size="small"
      onClick={() => void handleRetry()}
      disabled={isRetrying}
      startIcon={isRetrying ? <CircularProgress size={14} color="inherit" /> : <Refresh />}
    >
      Повторить
    </Button>
  )

  if (inline) {
    return (
      <Stack
        role="alert"
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        gap={1.5}
        sx={mergeSx(
          {
            p: 1.5,
            pl: 2,
            borderRadius: 2,
            bgcolor: color.error.soft,
            border: `1px solid ${color.error.main}33`,
          },
          sx,
        )}
      >
        <ErrorOutline sx={{ color: 'error.main', fontSize: 20 }} aria-hidden />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" component="p" sx={{ color: color.error.dark }}>
            {title}
          </Typography>
          {message && (
            <Typography variant="body2" sx={{ color: color.error.dark }}>
              {message}
            </Typography>
          )}
        </Box>
        {retry}
        {action}
      </Stack>
    )
  }

  return (
    <Stack role="alert" alignItems="center" textAlign="center" gap={1} sx={mergeSx({ py: 7, px: 3 }, sx)}>
      <Box
        aria-hidden
        sx={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: color.error.soft,
          color: 'error.main',
          mb: 0.5,
        }}
      >
        <ErrorOutline />
      </Box>
      <Typography variant="subtitle1" component="p">
        {title}
      </Typography>
      {message && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460 }}>
          {message}
        </Typography>
      )}
      {(retry || action) && (
        <Stack direction="row" gap={1} sx={{ mt: 1.5 }}>
          {retry}
          {action}
        </Stack>
      )}
    </Stack>
  )
}
