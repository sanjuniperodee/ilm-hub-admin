import { useCallback, useRef, useState } from 'react'
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { EditNoteOutlined } from '@mui/icons-material'
import { color } from '../../../theme'

export type UnsavedChoice = 'save' | 'discard' | 'cancel'

interface AskOptions {
  /** «Перейти к блоку 4?», «Уйти со страницы?» */
  title: string
  description?: string
  /** Called on «Сохранить и продолжить»; return false to stay. */
  onSave: () => Promise<boolean>
}

/**
 * Three-way prompt for unsaved changes: save and continue / continue without saving / stay.
 * Returns true when the caller may continue.
 */
export function useUnsavedPrompt() {
  const [state, setState] = useState<AskOptions | null>(null)
  const [saving, setSaving] = useState(false)
  const resolver = useRef<((v: UnsavedChoice) => void) | null>(null)

  const ask = useCallback((options: AskOptions): Promise<UnsavedChoice> => {
    resolver.current?.('cancel')
    setState(options)
    return new Promise<UnsavedChoice>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = (choice: UnsavedChoice) => {
    resolver.current?.(choice)
    resolver.current = null
    setState(null)
  }

  const onSave = async () => {
    if (!state) return
    setSaving(true)
    try {
      const ok = await state.onSave()
      if (ok) settle('save')
    } finally {
      setSaving(false)
    }
  }

  const dialog = (
    <Dialog open={!!state} onClose={() => !saving && settle('cancel')} maxWidth="sm" fullWidth aria-labelledby="unsaved-title" aria-describedby="unsaved-desc">
      <DialogTitle id="unsaved-title">
        <Stack direction="row" gap={1.25} alignItems="center">
          <EditNoteOutlined sx={{ color: color.warning.main }} />
          {state?.title}
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography id="unsaved-desc" variant="body2" color="text.secondary">
          {state?.description ?? 'В открытом блоке есть несохранённые изменения.'}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button variant="text" color="error" onClick={() => settle('discard')} disabled={saving} sx={{ mr: 'auto' }}>
          Не сохранять
        </Button>
        <Button variant="outlined" onClick={() => settle('cancel')} disabled={saving} autoFocus>
          Остаться
        </Button>
        <Button variant="contained" onClick={() => void onSave()} disabled={saving} startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
          Сохранить и продолжить
        </Button>
      </DialogActions>
    </Dialog>
  )

  return { ask, dialog }
}
