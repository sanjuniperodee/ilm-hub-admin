import { useState } from 'react'
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material'
import { dialogActionsSafeAreaSx, useNarrowDialogProps } from '../../../hooks/useNarrowDialogProps'
import { Completeness, FieldPair } from '../shared'
import type { ThemeForm } from './model'

export interface ThemeDialogProps {
  open: boolean
  isEdit: boolean
  form: ThemeForm
  saving: boolean
  onChange: (form: ThemeForm) => void
  onClose: () => void
  onSave: () => void
}

export function ThemeDialog({ open, isEdit, form, saving, onChange, onClose, onSave }: ThemeDialogProps) {
  const narrow = useNarrowDialogProps('sm')
  const [touched, setTouched] = useState(false)
  const titleMissing = !form.titleRu.trim()

  const submit = () => {
    setTouched(true)
    if (titleMissing) return
    onSave()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      {...narrow}
      TransitionProps={{ onEnter: () => setTouched(false) }}
      aria-labelledby="theme-dialog-title"
    >
      <DialogTitle id="theme-dialog-title">{isEdit ? 'Изменить тему' : 'Новая тема'}</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ pt: 1 }}>
          <Completeness
            items={[
              { label: 'RU', done: !titleMissing },
              { label: 'KZ', done: !!form.titleKz.trim() },
            ]}
          />
          <FieldPair>
            <TextField
              label="Название (RU)"
              required
              autoFocus
              value={form.titleRu}
              onChange={(e) => onChange({ ...form, titleRu: e.target.value })}
              error={touched && titleMissing}
              helperText={touched && titleMissing ? 'Введите название темы' : 'Например «Семья» или «Еда»'}
            />
            <TextField
              label="Название (KZ)"
              value={form.titleKz}
              onChange={(e) => onChange({ ...form, titleKz: e.target.value })}
              helperText="Без перевода тема показывается на русском"
            />
          </FieldPair>
          <FieldPair>
            <TextField
              label="Эмодзи"
              value={form.emoji}
              onChange={(e) => onChange({ ...form, emoji: e.target.value })}
              inputProps={{ maxLength: 8 }}
              helperText="Иконка темы в приложении"
            />
            <TextField
              label="Порядок"
              type="number"
              value={form.orderIndex}
              onChange={(e) => onChange({ ...form, orderIndex: Number(e.target.value) })}
            />
          </FieldPair>
          <FormControlLabel
            control={<Switch checked={form.quizEnabled} onChange={(e) => onChange({ ...form, quizEnabled: e.target.checked })} />}
            label="Квиз по теме включён"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={dialogActionsSafeAreaSx}>
        <Button variant="outlined" onClick={onClose}>
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isEdit ? 'Сохранить тему' : 'Создать тему'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
