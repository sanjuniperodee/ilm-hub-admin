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
import { Add, Audiotrack, Edit, Refresh, Save, Star, StarBorder } from '@mui/icons-material'
import {
  createWordsDictionaryEntry,
  createWordsDictionaryExample,
  deleteWordsDictionaryEntry,
  deleteWordsDictionaryExample,
  getWordsDictionary,
  getWordsDictionaryEntry,
  reorderWordsDictionaryExamples,
  updateWordsDictionaryEntry,
  updateWordsDictionaryExample,
  uploadWordsDictionaryEntryAudio,
  uploadWordsDictionaryExampleAudio,
} from '../api/adminApi'

interface DictionaryExample {
  id: string
  arabicSentence: string
  translationRu: string
  orderIndex: number
  audioUrl?: string | null
}

interface DictionaryEntry {
  id: string
  arabic: string
  translit?: string | null
  translationRu: string
  noteRu?: string | null
  isActive: boolean
  audioUrl?: string | null
  examples?: DictionaryExample[]
}

export default function WordsDictionaryPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [entries, setEntries] = useState<DictionaryEntry[]>([])

  const [editOpen, setEditOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<DictionaryEntry | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getWordsDictionary()
      const list: DictionaryEntry[] = (data.entries || []).sort((a: DictionaryEntry, b: DictionaryEntry) =>
        a.arabic.localeCompare(b.arabic),
      )
      setEntries(list)
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка загрузки словаря'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreateDialog = () => {
    setEditingEntry({
      id: '',
      arabic: '',
      translit: '',
      translationRu: '',
      noteRu: '',
      isActive: true,
      audioUrl: null,
      examples: [],
    })
    setEditOpen(true)
  }

  const openEditDialog = async (id: string) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getWordsDictionaryEntry(id)
      const entry: DictionaryEntry = {
        ...data,
        examples: (data.examples || []).sort((a: any, b: any) => a.orderIndex - b.orderIndex),
      }
      setEditingEntry(entry)
      setEditOpen(true)
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка загрузки слова'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEntry = async () => {
    if (!editingEntry) return
    const { id, ...payload } = editingEntry
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      if (!id) {
        await createWordsDictionaryEntry(payload)
      } else {
        await updateWordsDictionaryEntry(id, payload)
      }
      setEditOpen(false)
      await load()
      setSuccess('Слово сохранено')
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка сохранения слова'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm('Удалить это слово и все его примеры?')) return
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      await deleteWordsDictionaryEntry(id)
      await load()
      setSuccess('Слово удалено')
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка удаления слова'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleEntryFieldChange = (field: keyof DictionaryEntry, value: any) => {
    setEditingEntry((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleUploadEntryAudio = async (file: File | null) => {
    if (!editingEntry || !file || !editingEntry.id) return
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      const { data } = await uploadWordsDictionaryEntryAudio(editingEntry.id, file)
      setEditingEntry((prev) => (prev ? { ...prev, audioUrl: data.audioUrl } : prev))
      setSuccess('Аудио для слова загружено')
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка загрузки аудио слова'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleAddExample = async () => {
    if (!editingEntry || !editingEntry.id) return
    const orderIndex = editingEntry.examples?.length || 0
    try {
      const { data } = await createWordsDictionaryExample(editingEntry.id, {
        arabicSentence: '',
        translationRu: '',
        orderIndex,
      })
      setEditingEntry((prev) =>
        prev
          ? {
              ...prev,
              examples: [...(prev.examples || []), data],
            }
          : prev,
      )
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка добавления примера'
      setError(msg)
    }
  }

  const handleExampleFieldChange = (id: string, field: keyof DictionaryExample, value: any) => {
    setEditingEntry((prev) =>
      prev
        ? {
            ...prev,
            examples: (prev.examples || []).map((ex) =>
              ex.id === id ? { ...ex, [field]: field === 'orderIndex' ? Number(value) || 0 : value } : ex,
            ),
          }
        : prev,
    )
  }

  const handleSaveExample = async (example: DictionaryExample) => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      await updateWordsDictionaryExample(example.id, {
        arabicSentence: example.arabicSentence,
        translationRu: example.translationRu,
        orderIndex: example.orderIndex,
      })
      setSuccess('Пример сохранён')
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка сохранения примера'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteExample = async (id: string) => {
    if (!editingEntry) return
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      await deleteWordsDictionaryExample(id)
      setEditingEntry((prev) =>
        prev
          ? {
              ...prev,
              examples: (prev.examples || []).filter((ex) => ex.id !== id),
            }
          : prev,
      )
      setSuccess('Пример удалён')
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка удаления примера'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadExampleAudio = async (exampleId: string, file: File | null) => {
    if (!file) return
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      const { data } = await uploadWordsDictionaryExampleAudio(exampleId, file)
      setEditingEntry((prev) =>
        prev
          ? {
              ...prev,
              examples: (prev.examples || []).map((ex) =>
                ex.id === exampleId ? { ...ex, audioUrl: data.audioUrl } : ex,
              ),
            }
          : prev,
      )
      setSuccess('Аудио для примера загружено')
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка загрузки аудио примера'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleReorderExamples = async () => {
    if (!editingEntry || !editingEntry.id || !editingEntry.examples) return
    const sorted = [...editingEntry.examples].sort((a, b) => a.orderIndex - b.orderIndex)
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      await reorderWordsDictionaryExamples(
        editingEntry.id,
        sorted.map((ex) => ex.id),
      )
      setEditingEntry((prev) =>
        prev
          ? {
              ...prev,
              examples: sorted.map((ex, index) => ({ ...ex, orderIndex: index })),
            }
          : prev,
      )
      setSuccess('Порядок примеров сохранён')
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка сохранения порядка'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: -0.4 }}>
            Words / Dictionary
          </Typography>
          <Typography color="text.secondary">
            Управление словами словаря, примерами и аудио для мобильного приложения.
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
            onClick={openCreateDialog}
          >
            Добавить слово
          </Button>
        </Stack>
      </Stack>

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
                    <TableCell>Арабское</TableCell>
                    <TableCell>Транслит</TableCell>
                    <TableCell>Перевод (RU)</TableCell>
                    <TableCell>Заметка</TableCell>
                    <TableCell align="center">Примеры</TableCell>
                    <TableCell align="center">Аудио</TableCell>
                    <TableCell align="right" sx={{ width: 120 }}>
                      Действия
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>{entry.arabic}</Typography>
                      </TableCell>
                      <TableCell>{entry.translit}</TableCell>
                      <TableCell>{entry.translationRu}</TableCell>
                      <TableCell>{entry.noteRu}</TableCell>
                      <TableCell align="center">{(entry as any).examples?.length ?? 0}</TableCell>
                      <TableCell align="center">
                        {entry.audioUrl ? (
                          <Star sx={{ fontSize: 18, color: 'goldenrod' }} />
                        ) : (
                          <StarBorder sx={{ fontSize: 18, color: 'text.disabled' }} />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEditDialog(entry.id)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteEntry(entry.id)}>
                          <Save sx={{ opacity: 0 }} />
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

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingEntry?.id ? 'Редактирование слова' : 'Новое слово'}</DialogTitle>
        <DialogContent>
          {editingEntry && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="Арабское"
                  value={editingEntry.arabic}
                  onChange={(e) => handleEntryFieldChange('arabic', e.target.value)}
                />
                <TextField
                  fullWidth
                  label="Транслит"
                  value={editingEntry.translit || ''}
                  onChange={(e) => handleEntryFieldChange('translit', e.target.value)}
                />
              </Stack>
              <TextField
                fullWidth
                label="Перевод (RU)"
                value={editingEntry.translationRu}
                onChange={(e) => handleEntryFieldChange('translationRu', e.target.value)}
              />
              <TextField
                fullWidth
                label="Заметка"
                value={editingEntry.noteRu || ''}
                onChange={(e) => handleEntryFieldChange('noteRu', e.target.value)}
              />

              {editingEntry.id && (
                <Button
                  component="label"
                  size="small"
                  variant="outlined"
                  startIcon={<Audiotrack />}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {editingEntry.audioUrl ? 'Заменить аудио слова' : 'Загрузить аудио слова'}
                  <input
                    type="file"
                    accept="audio/*"
                    hidden
                    onChange={(e) => handleUploadEntryAudio(e.target.files?.[0] || null)}
                  />
                </Button>
              )}

              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1">Примеры</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={handleAddExample}>
                      Добавить пример
                    </Button>
                    <Button size="small" variant="outlined" onClick={handleReorderExamples}>
                      Пересчитать порядок
                    </Button>
                  </Stack>
                </Stack>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 60 }}>№</TableCell>
                      <TableCell>Арабское предложение</TableCell>
                      <TableCell>Перевод (RU)</TableCell>
                      <TableCell sx={{ width: 140 }} align="center">
                        Аудио
                      </TableCell>
                      <TableCell sx={{ width: 80 }} align="right">
                        Действия
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(editingEntry.examples || []).map((ex) => (
                      <TableRow key={ex.id}>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={ex.orderIndex}
                            onChange={(e) => handleExampleFieldChange(ex.id, 'orderIndex', e.target.value)}
                            sx={{ width: 70 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            value={ex.arabicSentence}
                            onChange={(e) => handleExampleFieldChange(ex.id, 'arabicSentence', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            value={ex.translationRu}
                            onChange={(e) => handleExampleFieldChange(ex.id, 'translationRu', e.target.value)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            component="label"
                            size="small"
                            variant="outlined"
                            startIcon={<Audiotrack />}
                          >
                            {ex.audioUrl ? 'Заменить' : 'Загрузить'}
                            <input
                              type="file"
                              accept="audio/*"
                              hidden
                              onChange={(e) => handleUploadExampleAudio(ex.id, e.target.files?.[0] || null)}
                            />
                          </Button>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleSaveExample(ex)}>
                            <Save fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteExample(ex.id)}>
                            <Save sx={{ opacity: 0 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSaveEntry} disabled={loading}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

