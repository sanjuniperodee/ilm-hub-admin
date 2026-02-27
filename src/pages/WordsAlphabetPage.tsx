import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Add, Audiotrack, Delete, DragIndicator, Refresh, Save } from '@mui/icons-material'
import {
  getWordsAlphabet,
  createWordLetter,
  updateWordLetter,
  uploadWordLetterAudio,
  deleteWordLetter,
} from '../api/adminApi'

interface WordLetter {
  id: string
  code: string
  orderIndex: number
  arabic: string
  nameRu: string
  translit?: string | null
  important?: string | null
  audioUrl?: string | null
}

export default function WordsAlphabetPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [letters, setLetters] = useState<WordLetter[]>([])
  const [draggingCode, setDraggingCode] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newLetter, setNewLetter] = useState<WordLetter>({
    id: '',
    code: '',
    orderIndex: 0,
    arabic: '',
    nameRu: '',
    translit: '',
    important: '',
    audioUrl: '',
  })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getWordsAlphabet()
      const list: WordLetter[] = (data.letters || []).sort(
        (a: WordLetter, b: WordLetter) => a.orderIndex - b.orderIndex,
      )
      setLetters(list)
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка загрузки алфавита'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleFieldChange = (code: string, field: keyof WordLetter, value: any) => {
    setLetters((prev) =>
      prev.map((l) => (l.code === code ? { ...l, [field]: field === 'orderIndex' ? Number(value) || 0 : value } : l)),
    )
  }

  const handleSaveLetter = async (letter: WordLetter) => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      await updateWordLetter(letter.code, {
        nameRu: letter.nameRu,
        translit: letter.translit,
        important: letter.important,
        orderIndex: letter.orderIndex,
      })
      setSuccess(`Буква ${letter.code} обновлена`)
      await load()
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка сохранения буквы'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadAudio = async (code: string, file: File | null) => {
    if (!file) return
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      await uploadWordLetterAudio(code, file)
      setSuccess(`Аудио для ${code} загружено`)
      await load()
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка загрузки аудио'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLetter = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      await createWordLetter({
        code: newLetter.code.trim(),
        orderIndex: Number(newLetter.orderIndex) || 0,
        arabic: newLetter.arabic.trim(),
        nameRu: newLetter.nameRu.trim(),
        translit: newLetter.translit || null,
        important: newLetter.important || null,
      })
      setCreateOpen(false)
      setNewLetter({
        id: '',
        code: '',
        orderIndex: 0,
        arabic: '',
        nameRu: '',
        translit: '',
        important: '',
        audioUrl: '',
      })
      await load()
      setSuccess('Буква создана')
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка создания буквы'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLetter = async (code: string) => {
    if (!window.confirm(`Удалить букву ${code}?`)) return
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      await deleteWordLetter(code)
      await load()
      setSuccess('Буква удалена')
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка удаления буквы'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (code: string) => {
    setDraggingCode(code)
  }

  const handleDragOver = (event: React.DragEvent<HTMLTableRowElement>, targetCode: string) => {
    event.preventDefault()
    if (!draggingCode || draggingCode === targetCode) return
    const items = [...letters]
    const fromIndex = items.findIndex((l) => l.code === draggingCode)
    const toIndex = items.findIndex((l) => l.code === targetCode)
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return
    const [moved] = items.splice(fromIndex, 1)
    items.splice(toIndex, 0, moved)
    setLetters(items.map((l, i) => ({ ...l, orderIndex: i + 1 })))
  }

  const handleDrop = async () => {
    setDraggingCode(null)
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      await Promise.all(letters.map((l) => updateWordLetter(l.code, { orderIndex: l.orderIndex })))
      setSuccess('Порядок букв сохранён')
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка сохранения порядка'
      setError(msg)
      await load()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: -0.4 }}>
            Words / Алфавит
          </Typography>
          <Typography color="text.secondary">
            Управление буквами алфавита и аудио‑произношением для мобильного приложения.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={load}
            disabled={loading}
          >
            Обновить
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateOpen(true)}
          >
            Добавить букву
          </Button>
        </Stack>
      </Stack>

      {loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Загрузка...
        </Alert>
      )}
      {!!error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {!!success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }} />
                    <TableCell sx={{ width: 50 }}>№</TableCell>
                    <TableCell sx={{ width: 80 }}>Араб.</TableCell>
                    <TableCell>Название (RU)</TableCell>
                    <TableCell>Транслит</TableCell>
                    <TableCell>Важно знать</TableCell>
                    <TableCell sx={{ width: 120 }}>Аудио</TableCell>
                    <TableCell sx={{ width: 140 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {letters.map((letter, index) => (
                    <TableRow
                      key={letter.id}
                      draggable
                      onDragStart={() => handleDragStart(letter.code)}
                      onDragOver={(e) => handleDragOver(e, letter.code)}
                      onDrop={handleDrop}
                      sx={{
                        cursor: 'grab',
                        opacity: draggingCode === letter.code ? 0.5 : 1,
                        '&:active': { cursor: 'grabbing' },
                      }}
                    >
                      <TableCell sx={{ cursor: 'grab' }}>
                        <DragIndicator sx={{ color: 'text.disabled', fontSize: 20 }} />
                      </TableCell>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="h5" sx={{ textAlign: 'center' }}>
                          {letter.arabic}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          value={letter.nameRu}
                          onChange={(e) => handleFieldChange(letter.code, 'nameRu', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          value={letter.translit || ''}
                          onChange={(e) => handleFieldChange(letter.code, 'translit', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          multiline
                          minRows={2}
                          value={letter.important || ''}
                          onChange={(e) => handleFieldChange(letter.code, 'important', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Button
                            component="label"
                            size="small"
                            variant="outlined"
                            startIcon={<Audiotrack />}
                          >
                            {letter.audioUrl ? 'Заменить' : 'Загрузить'}
                            <input
                              type="file"
                              accept="audio/*"
                              hidden
                              onChange={(e) => handleUploadAudio(letter.code, e.target.files?.[0] || null)}
                            />
                          </Button>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleSaveLetter(letter)}
                        >
                          <Save fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteLetter(letter.code)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Новая буква алфавита</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Код (латиницей, уникальный)"
                value={newLetter.code}
                onChange={(e) => setNewLetter((prev) => ({ ...prev, code: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Порядок"
                type="number"
                value={newLetter.orderIndex}
                onChange={(e) =>
                  setNewLetter((prev) => ({ ...prev, orderIndex: Number(e.target.value) || 0 }))
                }
                sx={{ width: 120 }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Арабская буква"
                value={newLetter.arabic}
                onChange={(e) => setNewLetter((prev) => ({ ...prev, arabic: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Название (RU)"
                value={newLetter.nameRu}
                onChange={(e) => setNewLetter((prev) => ({ ...prev, nameRu: e.target.value }))}
                fullWidth
              />
            </Stack>
            <TextField
              label="Транслит"
              value={newLetter.translit || ''}
              onChange={(e) => setNewLetter((prev) => ({ ...prev, translit: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Важно знать"
              value={newLetter.important || ''}
              onChange={(e) => setNewLetter((prev) => ({ ...prev, important: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleCreateLetter} disabled={loading}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

