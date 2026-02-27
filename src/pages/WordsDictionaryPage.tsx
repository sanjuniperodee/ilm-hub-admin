import { useEffect, useRef, useState } from 'react'
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
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Add,
  Audiotrack,
  Delete,
  DragIndicator,
  Edit as EditIcon,
  Refresh,
  Save,
} from '@mui/icons-material'
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
  const [deleteConfirm, setDeleteConfirm] = useState<DictionaryEntry | null>(null)
  const [draggingExampleId, setDraggingExampleId] = useState<string | null>(null)
  const pendingExamplesRef = useRef<DictionaryExample[] | null>(null)

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

  const handleDeleteEntry = async () => {
    if (!deleteConfirm) return
    const id = deleteConfirm.id
    setDeleteConfirm(null)
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
        prev ? { ...prev, examples: [...(prev.examples || []), data] } : prev,
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
        prev ? { ...prev, examples: (prev.examples || []).filter((ex) => ex.id !== id) } : prev,
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

  const handleReorderExamples = async (examplesOverride?: DictionaryExample[]) => {
    if (!editingEntry || !editingEntry.id) return
    const current = examplesOverride ?? editingEntry.examples ?? []
    if (current.length === 0) return
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      await reorderWordsDictionaryExamples(editingEntry.id, current.map((ex) => ex.id))
      setEditingEntry((prev) =>
        prev ? { ...prev, examples: current.map((ex, index) => ({ ...ex, orderIndex: index })) } : prev,
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

  const handleExampleDragStart = (id: string) => setDraggingExampleId(id)

  const handleExampleDragOver = (event: React.DragEvent, targetId: string) => {
    event.preventDefault()
    if (!editingEntry || !editingEntry.examples || !draggingExampleId || draggingExampleId === targetId) return
    const examples = [...editingEntry.examples]
    const fromIndex = examples.findIndex((ex) => ex.id === draggingExampleId)
    const toIndex = examples.findIndex((ex) => ex.id === targetId)
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return
    const [moved] = examples.splice(fromIndex, 1)
    examples.splice(toIndex, 0, moved)
    pendingExamplesRef.current = examples
    setEditingEntry((prev) => (prev ? { ...prev, examples } : prev))
  }

  const handleExampleDrop = async () => {
    setDraggingExampleId(null)
    const pending = pendingExamplesRef.current
    pendingExamplesRef.current = null
    if (pending && editingEntry?.id) {
      await handleReorderExamples(pending)
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: -0.4 }}>
            Словарь
          </Typography>
          <Typography color="text.secondary">
            Слова с переводами, примерами и аудио для приложения.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={load} disabled={loading}>
            Обновить
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
            Добавить слово
          </Button>
        </Stack>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!!success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          {entries.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Нет слов. Добавьте первое слово в словарь.
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
                Добавить слово
              </Button>
            </Box>
          ) : (
            <Stack spacing={1}>
              {entries.map((entry) => (
                <Card
                  key={entry.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
                  }}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 2,
                          bgcolor: 'action.hover',
                          flexShrink: 0,
                        }}
                      >
                        <Typography variant="h5" sx={{ fontFamily: 'serif' }}>
                          {entry.arabic}
                        </Typography>
                      </Box>
                      <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.25}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {entry.translationRu}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {entry.translit && (
                            <Typography variant="body2" color="text.secondary">
                              {entry.translit}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {entry.examples?.length ?? 0} примеров
                          </Typography>
                        </Stack>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Tooltip title={entry.audioUrl ? 'Есть аудио' : 'Нет аудио'}>
                          <Audiotrack
                            sx={{
                              fontSize: 20,
                              color: entry.audioUrl ? 'success.main' : 'text.disabled',
                            }}
                          />
                        </Tooltip>
                        <Tooltip title="Редактировать">
                          <IconButton size="small" onClick={() => openEditDialog(entry.id)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить">
                          <IconButton size="small" color="error" onClick={() => setDeleteConfirm(entry)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingEntry?.id ? 'Редактирование слова' : 'Новое слово'}</DialogTitle>
        {editingEntry && (
          <DialogContent>
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
                multiline
                minRows={2}
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

              {editingEntry.id && (
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Примеры
                    </Typography>
                    <Button size="small" variant="outlined" startIcon={<Add />} onClick={handleAddExample}>
                      Добавить пример
                    </Button>
                  </Stack>
                  <Stack spacing={1}>
                    {(editingEntry.examples || []).map((ex) => (
                      <Card
                        key={ex.id}
                        variant="outlined"
                        sx={{
                          borderRadius: 1.5,
                          cursor: 'grab',
                          opacity: draggingExampleId === ex.id ? 0.5 : 1,
                          '&:active': { cursor: 'grabbing' },
                        }}
                        draggable
                        onDragStart={() => handleExampleDragStart(ex.id)}
                        onDragOver={(e) => handleExampleDragOver(e, ex.id)}
                        onDrop={handleExampleDrop}
                      >
                        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                          <Stack direction="row" alignItems="flex-start" spacing={1}>
                            <Box
                              sx={{
                                width: 32,
                                display: 'flex',
                                justifyContent: 'center',
                                color: 'text.disabled',
                                flexShrink: 0,
                                pointerEvents: 'none',
                              }}
                            >
                              <DragIndicator sx={{ fontSize: 18 }} />
                            </Box>
                            <Stack sx={{ flex: 1 }} spacing={1}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Арабское предложение"
                                value={ex.arabicSentence}
                                onChange={(e) =>
                                  handleExampleFieldChange(ex.id, 'arabicSentence', e.target.value)
                                }
                              />
                              <TextField
                                fullWidth
                                size="small"
                                label="Перевод (RU)"
                                value={ex.translationRu}
                                onChange={(e) =>
                                  handleExampleFieldChange(ex.id, 'translationRu', e.target.value)
                                }
                              />
                            </Stack>
                            <Stack direction="row" spacing={0.5}>
                              <Button
                                component="label"
                                size="small"
                                variant="text"
                                sx={{ minWidth: 0, p: 1 }}
                              >
                                <Audiotrack
                                  sx={{
                                    fontSize: 18,
                                    color: ex.audioUrl ? 'success.main' : 'text.disabled',
                                  }}
                                />
                                <input
                                  type="file"
                                  accept="audio/*"
                                  hidden
                                  onChange={(e) =>
                                    handleUploadExampleAudio(ex.id, e.target.files?.[0] || null)
                                  }
                                />
                              </Button>
                              <IconButton size="small" onClick={() => handleSaveExample(ex)}>
                                <Save fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDeleteExample(ex.id)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                  {(editingEntry.examples?.length ?? 0) > 0 && (
                    <Button
                      size="small"
                      variant="text"
                      sx={{ mt: 1 }}
                      onClick={() => handleReorderExamples()}
                    >
                      Сохранить порядок примеров
                    </Button>
                  )}
                </Box>
              )}
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSaveEntry} disabled={loading}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Удалить слово?</DialogTitle>
        <DialogContent>
          {deleteConfirm && (
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                }}
              >
                <Typography variant="h5" sx={{ fontFamily: 'serif' }}>
                  {deleteConfirm.arabic}
                </Typography>
              </Box>
              <Typography>
                Удалить слово «{deleteConfirm.translationRu}» и все его примеры? Это действие нельзя отменить.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Отмена</Button>
          <Button variant="contained" color="error" onClick={handleDeleteEntry} disabled={loading}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
