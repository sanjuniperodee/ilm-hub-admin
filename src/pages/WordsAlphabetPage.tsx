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
  DeleteOutline,
  DragIndicator,
  Edit as EditIcon,
  Refresh,
  Save,
} from '@mui/icons-material'
import {
  getWordsAlphabet,
  createWordLetter,
  updateWordLetter,
  uploadWordLetterAudio,
  deleteWordLetterAudio,
  deleteWordLetter,
} from '../api/adminApi'
import { dialogActionsSafeAreaSx, useNarrowDialogProps } from '../hooks/useNarrowDialogProps'
import { pageTitleH4Sx } from '../utils/responsivePageSx'

interface LetterForms {
  isolated: string
  initial: string
  middle: string
  final: string
}

interface WordLetter {
  id: string
  code: string
  orderIndex: number
  arabic: string
  nameRu: string
  nameKk?: string | null
  translit?: string | null
  translitKk?: string | null
  important?: string | null
  importantKk?: string | null
  audioUrl?: string | null
  forms?: LetterForms | null
}

/** Ответ API может отдавать KK-поля в snake_case — без этого в state не попадает importantKk. */
function normalizeWordLetter(raw: Record<string, unknown>): WordLetter {
  const r = raw as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? null : String(v))
  const num = (v: unknown, fallback: number) =>
    typeof v === 'number' && !Number.isNaN(v) ? v : Number(v) || fallback
  return {
    id: str(r.id) ?? '',
    code: str(r.code) ?? '',
    orderIndex: num(r.orderIndex ?? r.order_index, 0),
    arabic: str(r.arabic) ?? '',
    nameRu: str(r.nameRu ?? r.name_ru) ?? '',
    nameKk: str(r.nameKk ?? r.name_kk),
    translit: str(r.translit),
    translitKk: str(r.translitKk ?? r.translit_kk),
    important: str(r.important),
    importantKk: str(r.importantKk ?? r.important_kk),
    audioUrl: str(r.audioUrl ?? r.audio_url),
    forms: (r.forms as LetterForms) || null,
  }
}

const defaultForms = (arabic: string): LetterForms => ({
  isolated: arabic,
  initial: arabic,
  middle: arabic,
  final: arabic,
})

/** Пустая строка → null; всегда передаём KK-поля в PATCH (не undefined), иначе JSON их выбросит. */
function trimOrNull(v: string | null | undefined): string | null {
  if (v == null) return null
  const t = String(v).trim()
  return t.length > 0 ? t : null
}

function buildWordLetterPatchBody(letter: WordLetter) {
  const forms = letter.forms
    ? {
        isolated: letter.forms.isolated || letter.arabic,
        initial: letter.forms.initial || letter.arabic,
        middle: letter.forms.middle || letter.arabic,
        final: letter.forms.final || letter.arabic,
      }
    : undefined
  return {
    nameRu: letter.nameRu,
    nameKk: trimOrNull(letter.nameKk),
    translit: trimOrNull(letter.translit),
    translitKk: trimOrNull(letter.translitKk),
    important: trimOrNull(letter.important),
    importantKk: trimOrNull(letter.importantKk),
    orderIndex: letter.orderIndex,
    ...(forms ? { forms } : {}),
  }
}

export default function WordsAlphabetPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [letters, setLetters] = useState<WordLetter[]>([])
  const [draggingCode, setDraggingCode] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editLetter, setEditLetter] = useState<WordLetter | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<WordLetter | null>(null)
  const editNameKkInputRef = useRef<HTMLInputElement | null>(null)
  const editImportantKkInputRef = useRef<HTMLInputElement | null>(null)
  const [newLetter, setNewLetter] = useState({
    code: '',
    orderIndex: 0,
    arabic: '',
    nameRu: '',
    nameKk: '',
    translit: '',
    translitKk: '',
    important: '',
    importantKk: '',
    forms: { isolated: '', initial: '', middle: '', final: '' } as LetterForms,
  })
  const narrowFormDialog = useNarrowDialogProps('sm')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getWordsAlphabet()
      const list: WordLetter[] = (data.letters || [])
        .map((row: Record<string, unknown>) => normalizeWordLetter(row))
        .sort((a: WordLetter, b: WordLetter) => a.orderIndex - b.orderIndex)
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

  const flushEditKkFieldsFromDom = (base: WordLetter): WordLetter => ({
    ...base,
    nameKk: editNameKkInputRef.current?.value ?? base.nameKk ?? '',
    importantKk: editImportantKkInputRef.current?.value ?? base.importantKk ?? '',
  })

  const handleSaveLetter = async (letter: WordLetter) => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      await updateWordLetter(letter.code, buildWordLetterPatchBody(letter))
      setSuccess(`Буква ${letter.code} обновлена`)
      setEditLetter(null)
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

  const handleDeleteAudio = async (code: string) => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      await deleteWordLetterAudio(code)
      setSuccess(`Аудио для ${code} удалено`)
      await load()
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] ||
        e?.response?.data?.message ||
        e?.message ||
        'Ошибка удаления аудио'
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
        nameKk: trimOrNull(newLetter.nameKk),
        translit: trimOrNull(newLetter.translit),
        translitKk: trimOrNull(newLetter.translitKk),
        important: trimOrNull(newLetter.important),
        importantKk: trimOrNull(newLetter.importantKk),
        forms: {
          isolated: newLetter.forms.isolated.trim() || newLetter.arabic.trim(),
          initial: newLetter.forms.initial.trim() || newLetter.arabic.trim(),
          middle: newLetter.forms.middle.trim() || newLetter.arabic.trim(),
          final: newLetter.forms.final.trim() || newLetter.arabic.trim(),
        },
      })
      setCreateOpen(false)
      setNewLetter({
        code: '',
        orderIndex: 0,
        arabic: '',
        nameRu: '',
        nameKk: '',
        translit: '',
        translitKk: '',
        important: '',
        importantKk: '',
        forms: { isolated: '', initial: '', middle: '', final: '' },
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

  const handleDeleteLetter = async () => {
    if (!deleteConfirm) return
    const code = deleteConfirm.code
    setDeleteConfirm(null)
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

  const handleDragOver = (event: React.DragEvent, targetCode: string) => {
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
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={pageTitleH4Sx}>
            Алфавит
          </Typography>
          <Typography color="text.secondary">
            Буквы арабского алфавита и аудио-произношение для приложения.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignSelf: 'stretch' }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={load} disabled={loading} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Обновить
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Добавить букву
          </Button>
        </Stack>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!!success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          {letters.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Нет букв. Добавьте первую букву алфавита.
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
                Добавить букву
              </Button>
            </Box>
          ) : (
            <Stack spacing={1}>
              {letters.map((letter) => (
                <Card
                  key={letter.id}
                  variant="outlined"
                  draggable
                  onDragStart={() => handleDragStart(letter.code)}
                  onDragOver={(e) => handleDragOver(e, letter.code)}
                  onDrop={handleDrop}
                  sx={{
                    borderRadius: 2,
                    cursor: 'grab',
                    opacity: draggingCode === letter.code ? 0.5 : 1,
                    '&:active': { cursor: 'grabbing' },
                    transition: 'opacity 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    },
                  }}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: 40,
                          display: 'flex',
                          justifyContent: 'center',
                          cursor: 'grab',
                          color: 'text.disabled',
                        }}
                      >
                        <DragIndicator sx={{ fontSize: 20 }} />
                      </Box>
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
                        <Typography variant="h4" sx={{ fontFamily: 'serif' }}>
                          {letter.arabic}
                        </Typography>
                      </Box>
                      <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.25}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {letter.nameRu}
                          {letter.nameKk ? (
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                              ({letter.nameKk})
                            </Typography>
                          ) : null}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            {letter.code}
                          </Typography>
                          {letter.translit && (
                            <Typography variant="body2" color="text.secondary">
                              • {letter.translit}
                              {letter.translitKk ? ` · ${letter.translitKk}` : ''}
                            </Typography>
                          )}
                        </Stack>
                        {letter.importantKk ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              mt: 0.5,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                            title={letter.importantKk}
                          >
                            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                              Интересно (KK):{' '}
                            </Box>
                            {letter.importantKk}
                          </Typography>
                        ) : null}
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Tooltip title={letter.audioUrl ? 'Заменить аудио' : 'Загрузить аудио'}>
                          <Button
                            component="label"
                            size="small"
                            variant={letter.audioUrl ? 'outlined' : 'text'}
                            sx={{ minWidth: 0, p: 1 }}
                          >
                            <Audiotrack
                              sx={{
                                fontSize: 20,
                                color: letter.audioUrl ? 'success.main' : 'text.disabled',
                              }}
                            />
                            <input
                              type="file"
                              accept="audio/*"
                              hidden
                              onChange={(e) =>
                                handleUploadAudio(letter.code, e.target.files?.[0] || null)
                              }
                            />
                          </Button>
                        </Tooltip>
                        {letter.audioUrl ? (
                          <Tooltip title="Удалить аудио">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleDeleteAudio(letter.code)}
                              disabled={loading}
                            >
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                        <Tooltip title="Редактировать">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setEditLetter({
                                ...letter,
                                forms: letter.forms || defaultForms(letter.arabic),
                              })
                            }
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteConfirm(letter)}
                          >
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} {...narrowFormDialog}>
        <DialogTitle>Новая буква алфавита</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
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
                sx={{ minWidth: 80 }}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
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
              label="Название (KK)"
              value={newLetter.nameKk}
              onChange={(e) => setNewLetter((prev) => ({ ...prev, nameKk: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Транслит / произношение (RU)"
              value={newLetter.translit || ''}
              onChange={(e) => setNewLetter((prev) => ({ ...prev, translit: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Транслит / произношение (KK)"
              value={newLetter.translitKk || ''}
              onChange={(e) => setNewLetter((prev) => ({ ...prev, translitKk: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Интересно знать (RU)"
              value={newLetter.important || ''}
              onChange={(e) => setNewLetter((prev) => ({ ...prev, important: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Интересно знать (KK)"
              value={newLetter.importantKk || ''}
              onChange={(e) => setNewLetter((prev) => ({ ...prev, importantKk: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
              Формы буквы (позиция в слове)
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <TextField
                label="Изолированная"
                value={newLetter.forms.isolated}
                onChange={(e) =>
                  setNewLetter((prev) => ({
                    ...prev,
                    forms: { ...prev.forms, isolated: e.target.value },
                  }))
                }
                size="small"
                sx={{ minWidth: 100 }}
                placeholder={newLetter.arabic || 'ا'}
              />
              <TextField
                label="В начале"
                value={newLetter.forms.initial}
                onChange={(e) =>
                  setNewLetter((prev) => ({
                    ...prev,
                    forms: { ...prev.forms, initial: e.target.value },
                  }))
                }
                size="small"
                sx={{ minWidth: 100 }}
                placeholder={newLetter.arabic || 'ا'}
              />
              <TextField
                label="В середине"
                value={newLetter.forms.middle}
                onChange={(e) =>
                  setNewLetter((prev) => ({
                    ...prev,
                    forms: { ...prev.forms, middle: e.target.value },
                  }))
                }
                size="small"
                sx={{ minWidth: 100 }}
                placeholder="ـا"
              />
              <TextField
                label="В конце"
                value={newLetter.forms.final}
                onChange={(e) =>
                  setNewLetter((prev) => ({
                    ...prev,
                    forms: { ...prev.forms, final: e.target.value },
                  }))
                }
                size="small"
                sx={{ minWidth: 100 }}
                placeholder="ـا"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={() => setCreateOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleCreateLetter} disabled={loading}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editLetter} onClose={() => setEditLetter(null)} {...narrowFormDialog}>
        <DialogTitle>Редактировать букву {editLetter?.code}</DialogTitle>
        {editLetter && (
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography variant="h3" sx={{ fontFamily: 'serif' }}>
                    {editLetter.arabic}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Код: {editLetter.code} • Порядок: {editLetter.orderIndex}
                </Typography>
              </Stack>
              <TextField
                label="Название (RU)"
                value={editLetter.nameRu}
                onChange={(e) =>
                  setEditLetter((prev) => (prev ? { ...prev, nameRu: e.target.value } : null))
                }
                fullWidth
              />
              <TextField
                label="Название (KK)"
                inputRef={editNameKkInputRef}
                value={editLetter.nameKk || ''}
                onChange={(e) =>
                  setEditLetter((prev) => (prev ? { ...prev, nameKk: e.target.value } : null))
                }
                onCompositionEnd={(e) => {
                  const v = (e.target as HTMLInputElement).value
                  setEditLetter((prev) => (prev ? { ...prev, nameKk: v } : null))
                }}
                fullWidth
              />
              <TextField
                label="Транслит / произношение (RU)"
                value={editLetter.translit || ''}
                onChange={(e) =>
                  setEditLetter((prev) => (prev ? { ...prev, translit: e.target.value } : null))
                }
                fullWidth
              />
              <TextField
                label="Транслит / произношение (KK)"
                value={editLetter.translitKk || ''}
                onChange={(e) =>
                  setEditLetter((prev) => (prev ? { ...prev, translitKk: e.target.value } : null))
                }
                fullWidth
              />
              <TextField
                label="Интересно знать (RU)"
                value={editLetter.important || ''}
                onChange={(e) =>
                  setEditLetter((prev) => (prev ? { ...prev, important: e.target.value } : null))
                }
                fullWidth
                multiline
                minRows={3}
              />
              <TextField
                label="Интересно знать (KK)"
                inputRef={editImportantKkInputRef}
                value={editLetter.importantKk || ''}
                onChange={(e) =>
                  setEditLetter((prev) => (prev ? { ...prev, importantKk: e.target.value } : null))
                }
                onCompositionEnd={(e) => {
                  const v = (e.target as HTMLInputElement).value
                  setEditLetter((prev) => (prev ? { ...prev, importantKk: v } : null))
                }}
                fullWidth
                multiline
                minRows={3}
              />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                Формы буквы (позиция в слове)
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap sx={{ '& > *': { minWidth: 80 } }}>
                <TextField
                  label="Изолированная"
                  value={editLetter.forms?.isolated ?? ''}
                  onChange={(e) =>
                    setEditLetter((prev) =>
                      prev
                        ? {
                            ...prev,
                            forms: {
                              ...(prev.forms || defaultForms(prev.arabic)),
                              isolated: e.target.value,
                            },
                          }
                        : null,
                    )
                  }
                  size="small"
                  sx={{ minWidth: 100 }}
                />
                <TextField
                  label="В начале"
                  value={editLetter.forms?.initial ?? ''}
                  onChange={(e) =>
                    setEditLetter((prev) =>
                      prev
                        ? {
                            ...prev,
                            forms: {
                              ...(prev.forms || defaultForms(prev.arabic)),
                              initial: e.target.value,
                            },
                          }
                        : null,
                    )
                  }
                  size="small"
                  sx={{ minWidth: 100 }}
                />
                <TextField
                  label="В середине"
                  value={editLetter.forms?.middle ?? ''}
                  onChange={(e) =>
                    setEditLetter((prev) =>
                      prev
                        ? {
                            ...prev,
                            forms: {
                              ...(prev.forms || defaultForms(prev.arabic)),
                              middle: e.target.value,
                            },
                          }
                        : null,
                    )
                  }
                  size="small"
                  sx={{ minWidth: 100 }}
                />
                <TextField
                  label="В конце"
                  value={editLetter.forms?.final ?? ''}
                  onChange={(e) =>
                    setEditLetter((prev) =>
                      prev
                        ? {
                            ...prev,
                            forms: {
                              ...(prev.forms || defaultForms(prev.arabic)),
                              final: e.target.value,
                            },
                          }
                        : null,
                    )
                  }
                  size="small"
                  sx={{ minWidth: 100 }}
                />
              </Stack>
            </Stack>
          </DialogContent>
        )}
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={() => setEditLetter(null)}>Отмена</Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={() => editLetter && handleSaveLetter(flushEditKkFieldsFromDom(editLetter))}
            disabled={loading}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>Удалить букву?</DialogTitle>
        <DialogContent>
          {deleteConfirm && (
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mt: 1 }}>
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
                <Typography variant="h4" sx={{ fontFamily: 'serif' }}>
                  {deleteConfirm.arabic}
                </Typography>
              </Box>
              <Typography>
                Удалить букву «{deleteConfirm.nameRu}» ({deleteConfirm.code})? Это действие нельзя отменить.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Отмена</Button>
          <Button variant="contained" color="error" onClick={handleDeleteLetter} disabled={loading}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
