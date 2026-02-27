import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Add, Delete, Edit, ExpandLess, ExpandMore, Refresh } from '@mui/icons-material'
import {
  getIslamSurahs,
  createIslamSurah,
  updateIslamSurah,
  deleteIslamSurah,
  getIslamSurahAyahs,
  createIslamAyah,
  updateIslamAyah,
  deleteIslamAyah,
} from '../api/adminApi'

interface SurahItem {
  id: string
  number: number
  nameAr: string
  nameRu: string
  nameKz?: string | null
  transliteration: string
  revelationType: 'meccan' | 'medinan'
  ayahCount: number
  juzNumber: number
  pageNumber?: number | null
  isActive: boolean
}

interface AyahItem {
  id: string
  surahId: string
  number: number
  textAr: string
  translationRu?: string | null
  translationKz?: string | null
}

export default function IslamQuranPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [surahs, setSurahs] = useState<SurahItem[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [ayahsMap, setAyahsMap] = useState<Record<string, AyahItem[]>>({})

  const [surahDialogOpen, setSurahDialogOpen] = useState(false)
  const [editingSurah, setEditingSurah] = useState<SurahItem | null>(null)
  const [surahForm, setSurahForm] = useState({
    number: 0, nameAr: '', nameRu: '', nameKz: '', transliteration: '',
    revelationType: 'meccan' as 'meccan' | 'medinan', ayahCount: 0, juzNumber: 1, pageNumber: 0,
  })

  const [ayahDialogOpen, setAyahDialogOpen] = useState(false)
  const [editingAyah, setEditingAyah] = useState<AyahItem | null>(null)
  const [ayahForm, setAyahForm] = useState({ number: 0, textAr: '', translationRu: '', translationKz: '' })
  const [currentSurahId, setCurrentSurahId] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getIslamSurahs()
      setSurahs(data.surahs || [])
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load surahs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (!ayahsMap[id]) {
      try {
        const { data } = await getIslamSurahAyahs(id)
        setAyahsMap((prev) => ({ ...prev, [id]: data.ayahs || [] }))
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load ayahs')
      }
    }
  }

  const openCreateSurah = () => {
    setEditingSurah(null)
    setSurahForm({ number: surahs.length + 1, nameAr: '', nameRu: '', nameKz: '', transliteration: '', revelationType: 'meccan', ayahCount: 0, juzNumber: 1, pageNumber: 0 })
    setSurahDialogOpen(true)
  }

  const openEditSurah = (s: SurahItem) => {
    setEditingSurah(s)
    setSurahForm({ number: s.number, nameAr: s.nameAr, nameRu: s.nameRu, nameKz: s.nameKz || '', transliteration: s.transliteration, revelationType: s.revelationType, ayahCount: s.ayahCount, juzNumber: s.juzNumber, pageNumber: s.pageNumber || 0 })
    setSurahDialogOpen(true)
  }

  const saveSurah = async () => {
    setError('')
    try {
      if (editingSurah) {
        await updateIslamSurah(editingSurah.id, surahForm)
        setSuccess('Сура обновлена')
      } else {
        await createIslamSurah(surahForm)
        setSuccess('Сура создана')
      }
      setSurahDialogOpen(false)
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Save failed')
    }
  }

  const handleDeleteSurah = async (id: string) => {
    if (!confirm('Деактивировать суру?')) return
    try {
      await deleteIslamSurah(id)
      setSuccess('Сура деактивирована')
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Delete failed')
    }
  }

  const openCreateAyah = (surahId: string) => {
    setCurrentSurahId(surahId)
    setEditingAyah(null)
    const existing = ayahsMap[surahId] || []
    setAyahForm({ number: existing.length + 1, textAr: '', translationRu: '', translationKz: '' })
    setAyahDialogOpen(true)
  }

  const openEditAyah = (a: AyahItem) => {
    setCurrentSurahId(a.surahId)
    setEditingAyah(a)
    setAyahForm({ number: a.number, textAr: a.textAr, translationRu: a.translationRu || '', translationKz: a.translationKz || '' })
    setAyahDialogOpen(true)
  }

  const saveAyah = async () => {
    setError('')
    try {
      if (editingAyah) {
        await updateIslamAyah(editingAyah.id, ayahForm)
        setSuccess('Аят обновлён')
      } else {
        await createIslamAyah(currentSurahId, ayahForm)
        setSuccess('Аят создан')
      }
      setAyahDialogOpen(false)
      const { data } = await getIslamSurahAyahs(currentSurahId)
      setAyahsMap((prev) => ({ ...prev, [currentSurahId]: data.ayahs || [] }))
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Save failed')
    }
  }

  const handleDeleteAyah = async (a: AyahItem) => {
    if (!confirm('Удалить аят?')) return
    try {
      await deleteIslamAyah(a.id)
      setSuccess('Аят удалён')
      const { data } = await getIslamSurahAyahs(a.surahId)
      setAyahsMap((prev) => ({ ...prev, [a.surahId]: data.ayahs || [] }))
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Delete failed')
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Коран</Typography>
          <Typography variant="subtitle1">Управление сурами и аятами</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Refresh />} onClick={load} disabled={loading}>Обновить</Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreateSurah}>Добавить суру</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={40} />
                <TableCell>#</TableCell>
                <TableCell>Арабский</TableCell>
                <TableCell>Русский</TableCell>
                <TableCell>Транслит</TableCell>
                <TableCell>Джуз</TableCell>
                <TableCell>Аяты</TableCell>
                <TableCell>Тип</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {surahs.map((s) => (
                <>
                  <TableRow key={s.id} hover>
                    <TableCell>
                      <IconButton size="small" onClick={() => toggleExpand(s.id)}>
                        {expandedId === s.id ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{s.number}</TableCell>
                    <TableCell sx={{ fontFamily: 'NotoSansArabic, serif' }}>{s.nameAr}</TableCell>
                    <TableCell><strong>{s.nameRu}</strong></TableCell>
                    <TableCell>{s.transliteration}</TableCell>
                    <TableCell>{s.juzNumber}</TableCell>
                    <TableCell>{s.ayahCount}</TableCell>
                    <TableCell>
                      <Chip label={s.revelationType === 'meccan' ? 'Мекк.' : 'Медин.'} size="small" color={s.revelationType === 'meccan' ? 'primary' : 'warning'} />
                    </TableCell>
                    <TableCell>
                      <Chip label={s.isActive ? 'Акт.' : 'Скр.'} size="small" color={s.isActive ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEditSurah(s)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteSurah(s.id)}><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow key={s.id + '-expand'}>
                    <TableCell colSpan={10} sx={{ py: 0, border: expandedId === s.id ? undefined : 'none' }}>
                      <Collapse in={expandedId === s.id} unmountOnExit>
                        <Box sx={{ py: 2, pl: 4 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="subtitle2">Аяты суры {s.nameRu}</Typography>
                            <Button size="small" startIcon={<Add />} onClick={() => openCreateAyah(s.id)}>Добавить аят</Button>
                          </Stack>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>#</TableCell>
                                <TableCell>Арабский текст</TableCell>
                                <TableCell>Перевод (рус)</TableCell>
                                <TableCell align="right">Действия</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(ayahsMap[s.id] || []).map((a) => (
                                <TableRow key={a.id}>
                                  <TableCell>{a.number}</TableCell>
                                  <TableCell sx={{ fontFamily: 'NotoSansArabic, serif', direction: 'rtl', maxWidth: 300 }}>
                                    <Typography variant="body2" noWrap>{a.textAr}</Typography>
                                  </TableCell>
                                  <TableCell sx={{ maxWidth: 300 }}>
                                    <Typography variant="body2" noWrap>{a.translationRu}</Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <IconButton size="small" onClick={() => openEditAyah(a)}><Edit fontSize="small" /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => handleDeleteAyah(a)}><Delete fontSize="small" /></IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {(ayahsMap[s.id] || []).length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={4} align="center">
                                    <Typography color="text.secondary" py={2}>Нет аятов</Typography>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))}
              {surahs.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography color="text.secondary" py={4}>Нет сур</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Surah Dialog */}
      <Dialog open={surahDialogOpen} onClose={() => setSurahDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSurah ? 'Редактировать суру' : 'Новая сура'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Номер" type="number" value={surahForm.number} onChange={(e) => setSurahForm({ ...surahForm, number: +e.target.value })} />
            <TextField label="Арабский" value={surahForm.nameAr} onChange={(e) => setSurahForm({ ...surahForm, nameAr: e.target.value })} />
            <TextField label="Русский" value={surahForm.nameRu} onChange={(e) => setSurahForm({ ...surahForm, nameRu: e.target.value })} />
            <TextField label="Казахский" value={surahForm.nameKz} onChange={(e) => setSurahForm({ ...surahForm, nameKz: e.target.value })} />
            <TextField label="Транслитерация" value={surahForm.transliteration} onChange={(e) => setSurahForm({ ...surahForm, transliteration: e.target.value })} />
            <Select value={surahForm.revelationType} onChange={(e) => setSurahForm({ ...surahForm, revelationType: e.target.value as any })} size="small">
              <MenuItem value="meccan">Мекканская</MenuItem>
              <MenuItem value="medinan">Мединская</MenuItem>
            </Select>
            <TextField label="Кол-во аятов" type="number" value={surahForm.ayahCount} onChange={(e) => setSurahForm({ ...surahForm, ayahCount: +e.target.value })} />
            <TextField label="Джуз" type="number" value={surahForm.juzNumber} onChange={(e) => setSurahForm({ ...surahForm, juzNumber: +e.target.value })} />
            <TextField label="Страница" type="number" value={surahForm.pageNumber} onChange={(e) => setSurahForm({ ...surahForm, pageNumber: +e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSurahDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={saveSurah}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      {/* Ayah Dialog */}
      <Dialog open={ayahDialogOpen} onClose={() => setAyahDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingAyah ? 'Редактировать аят' : 'Новый аят'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Номер аята" type="number" value={ayahForm.number} onChange={(e) => setAyahForm({ ...ayahForm, number: +e.target.value })} />
            <TextField label="Арабский текст" multiline rows={3} value={ayahForm.textAr} onChange={(e) => setAyahForm({ ...ayahForm, textAr: e.target.value })} inputProps={{ dir: 'rtl' }} />
            <TextField label="Перевод (рус)" multiline rows={2} value={ayahForm.translationRu} onChange={(e) => setAyahForm({ ...ayahForm, translationRu: e.target.value })} />
            <TextField label="Перевод (каз)" multiline rows={2} value={ayahForm.translationKz} onChange={(e) => setAyahForm({ ...ayahForm, translationKz: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAyahDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={saveAyah}>Сохранить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
