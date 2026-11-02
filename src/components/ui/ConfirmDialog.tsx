import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ReportGmailerrorredOutlined, HelpOutline } from '@mui/icons-material'
import { createContext, useCallback, useContext, useId, useRef, useState, type ReactNode } from 'react'
import { color } from '../../theme/tokens'
import { getErrorMessage } from './errors'

export interface ConfirmOptions {
  /** Question in the form of the action: «Удалить урок?» */
  title: ReactNode
  /** Consequences, specifically: «Урок и 12 блоков будут удалены без возможности восстановления.» */
  description?: ReactNode
  /** Verb that matches the action: «Удалить», «Деактивировать», «Отправить». Default «Подтвердить». */
  confirmLabel?: string
  cancelLabel?: string
  /** Red confirm button + warning icon. Use for delete/deactivate/irreversible actions. */
  destructive?: boolean
  /**
   * Require typing this exact text to enable confirm (for very dangerous actions:
   * deleting a course, mass push). Shown as «Введите «…» для подтверждения».
   */
  confirmText?: string
}

export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean
  /**
   * Called on confirm. If it returns a promise the dialog shows a spinner, stays open
   * until it settles, and shows the error inline if it rejects.
   */
  onConfirm: () => void | Promise<unknown>
  onClose: () => void
  /** External loading flag (alternative to returning a promise). */
  loading?: boolean
}

/**
 * Confirmation dialog. Focus starts on «Отмена» for destructive actions so Enter
 * never deletes by accident. Prefer the `useConfirm()` hook for imperative use.
 *
 * @example
 * <ConfirmDialog
 *   open={!!toDelete}
 *   destructive
 *   title="Удалить слово?"
 *   description={`«${toDelete?.word}» исчезнет из словаря и всех карточек.`}
 *   confirmLabel="Удалить"
 *   onConfirm={() => deleteWord(toDelete!.id)}
 *   onClose={() => setToDelete(null)}
 * />
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  destructive = false,
  confirmText,
  onConfirm,
  onClose,
  loading,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const titleId = useId()
  const descId = useId()
  const isBusy = loading ?? busy
  const textOk = !confirmText || typed.trim() === confirmText

  const reset = () => {
    setError(null)
    setTyped('')
  }

  const handleClose = () => {
    if (isBusy) return
    onClose()
  }

  const handleConfirm = async () => {
    if (!textOk) return
    setError(null)
    try {
      const result = onConfirm()
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        setBusy(true)
        await result
      }
      onClose()
    } catch (e) {
      setError(getErrorMessage(e, 'Не удалось выполнить действие'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      TransitionProps={{ onExited: reset }}
    >
      <DialogTitle id={titleId} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, pr: 3 }}>
        <Box
          aria-hidden
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: destructive ? color.error.soft : color.bronze[50],
            color: destructive ? 'error.main' : 'primary.main',
            mt: '-4px',
          }}
        >
          {destructive ? <ReportGmailerrorredOutlined fontSize="small" /> : <HelpOutline fontSize="small" />}
        </Box>
        <Box component="span" sx={{ pt: '3px' }}>
          {title}
        </Box>
      </DialogTitle>
      {(description || confirmText || error) && (
        <DialogContent sx={{ pl: '72px' }}>
          <Stack gap={1.5}>
            {description && (
              <Typography id={descId} variant="body1" color="text.secondary" component="div">
                {description}
              </Typography>
            )}
            {confirmText && (
              <TextField
                autoFocus
                fullWidth
                label={`Введите «${confirmText}» для подтверждения`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && textOk) void handleConfirm()
                }}
                autoComplete="off"
              />
            )}
            {error && (
              <Typography role="alert" variant="body2" sx={{ color: 'error.dark' }}>
                {error}
              </Typography>
            )}
          </Stack>
        </DialogContent>
      )}
      <DialogActions>
        <Button variant="outlined" onClick={handleClose} disabled={isBusy} autoFocus={destructive && !confirmText}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          onClick={() => void handleConfirm()}
          disabled={isBusy || !textOk}
          autoFocus={!destructive && !confirmText}
          startIcon={isBusy ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 * Provides `useConfirm()`. Mounted once in App.tsx.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    resolver.current?.(false)
    setState({ ...options, open: true })
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setState((s) => (s ? { ...s, open: false } : s))
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <ConfirmDialog
          {...state}
          open={state.open}
          onConfirm={() => settle(true)}
          onClose={() => settle(false)}
        />
      )}
    </ConfirmContext.Provider>
  )
}

/**
 * Promise-based replacement for `window.confirm`.
 *
 * @example
 * const confirm = useConfirm()
 * const onDelete = async () => {
 *   if (!(await confirm({ title: 'Удалить аят?', confirmLabel: 'Удалить', destructive: true }))) return
 *   await deleteAyah(id)
 * }
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  return (
    ctx ??
    ((o: ConfirmOptions) =>
      Promise.resolve(window.confirm(typeof o.title === 'string' ? o.title : 'Подтвердите действие')))
  )
}
