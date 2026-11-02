import { useState } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Typography } from '@mui/material'
import { SyncAltOutlined } from '@mui/icons-material'
import { migrateRichTextBlocks, type RichTextMigrationProgress } from '../richtext/migrateRichTextBlocks'
import { getErrorMessage } from './ui'
import { useNarrowDialogProps } from '../hooks/useNarrowDialogProps'

/** Admin tool: converts legacy lesson HTML into the structured IlmDoc format. */
export default function RichTextMigrationButton() {
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [progress, setProgress] = useState<RichTextMigrationProgress | null>(null)
  const [error, setError] = useState('')
  const dialogProps = useNarrowDialogProps('sm')

  const run = async () => {
    setRunning(true)
    setDone(false)
    setError('')
    try {
      await migrateRichTextBlocks(setProgress)
      setDone(true)
    } catch (e) {
      setError(getErrorMessage(e, 'Не удалось выполнить конвертацию'))
    } finally {
      setRunning(false)
    }
  }

  const pct = progress && progress.total > 0 ? (progress.processed / progress.total) * 100 : 0

  return (
    <>
      <Button variant="outlined" startIcon={<SyncAltOutlined />} onClick={() => setOpen(true)}>
        Формат уроков
      </Button>
      <Dialog open={open} onClose={() => !running && setOpen(false)} {...dialogProps} aria-labelledby="richtext-migration-title">
        <DialogTitle id="richtext-migration-title">Перевести тексты уроков в новый формат</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Приложение показывает тексты уроков из структурированного формата. Новые и отредактированные блоки
            сохраняются в нём автоматически, а эта операция один раз переводит все старые блоки. Запускать
            повторно безопасно — уже переведённые блоки пропускаются.
          </Typography>
          {progress && (
            <>
              <LinearProgress variant="determinate" value={pct} sx={{ mb: 1 }} aria-label="Прогресс конвертации" />
              <Typography variant="body2" role="status" aria-live="polite">
                Обработано {progress.processed} из {progress.total}, обновлено {progress.updated}
                {progress.failed > 0 ? `, с ошибкой ${progress.failed}` : ''}
              </Typography>
            </>
          )}
          {done && !error && (
            <Alert severity={progress && progress.failed > 0 ? 'warning' : 'success'} sx={{ mt: 2 }}>
              {progress && progress.failed > 0
                ? 'Готово, но часть блоков не удалось обновить. Запустите ещё раз — обработаются только они.'
                : 'Готово. Все блоки в новом формате.'}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setOpen(false)} disabled={running}>
            Закрыть
          </Button>
          <Button variant="contained" onClick={run} disabled={running}>
            {running ? 'Переводим…' : 'Запустить'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
