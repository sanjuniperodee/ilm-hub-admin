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
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Add, Audiotrack, Delete, Edit, ExpandLess, ExpandMore, Refresh } from '@mui/icons-material'
import {
  getIslamSurahs,
  createIslamSurah,
  updateIslamSurah,
  deleteIslamSurah,
  getIslamSurahAyahs,
  createIslamAyah,
  updateIslamAyah,
  deleteIslamAyah,
  uploadIslamSurahAudio,
  getIslamQuranReciters,
  createIslamQuranReciter,
  updateIslamQuranReciter,
  importIslamEveryAyah,
  getIslamEveryAyahImportStatus,
  getIslamQuranCoverage,
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
  audioUrl?: string | null
  isActive: boolean
}

interface AyahItem {
  id: string
  surahId: string
  number: number
  textAr: string
  translationRu?: string | null
  translationKz?: string | null
  startTime?: number | null
}

interface ReciterItem {
  id: string
  slug: string
  displayName: string
  source?: string | null
  bitrate?: string | null
  isActive: boolean
  sortOrder: number
}

interface CoverageItem {
  surahId: string
  surahNumber: number
  surahNameRu: string
  ayahCount: number
  audioCount: number
  percent: number
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
  const [ayahForm, setAyahForm] = useState({ number: 0, textAr: '', translationRu: '', translationKz: '', startTime: '' })
  const [currentSurahId, setCurrentSurahId] = useState('')
  const [startTimeEdits, setStartTimeEdits] = useState<Record<string, string>>({})
  const [reciters, setReciters] = useState<ReciterItem[]>([])
  const [reciterForm, setReciterForm] = useState({
    slug: '',
    displayName: '',
    source: 'EveryAyah',
    bitrate: '64kbps',
    sortOrder: 0,
  })
  const [importForm, setImportForm] = useState({
    reciterSlug: '',
    fromSurah: 1,
    toSurah: 114,
    overwrite: false,
    concurrency: 4,
  })
  const [importJobId, setImportJobId] = useState('')
  const [importStatus, setImportStatus] = useState<any | null>(null)
  const [coverage, setCoverage] = useState<CoverageItem[]>([])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getIslamSurahs()
      setSurahs(data.surahs || [])
      const reciterRes = await getIslamQuranReciters()
      const recitersData = reciterRes.data.reciters || []
      setReciters(recitersData)
      if (!importForm.reciterSlug && recitersData.length > 0) {
        setImportForm((prev) => ({ ...prev, reciterSlug: recitersData[0].slug }))
      }
      const coverageRes = await getIslamQuranCoverage(importForm.reciterSlug || undefined)
      setCoverage(coverageRes.data.coverage || [])
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load surahs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!importJobId) return
    const timer = setInterval(async () => {
      try {
        const { data } = await getIslamEveryAyahImportStatus(importJobId)
        setImportStatus(data)
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(timer)
          load()
        }
      } catch (e) {
        clearInterval(timer)
      }
    }, 3000)
    return () => clearInterval(timer)
  }, [importJobId])

  useEffect(() => {
    if (!importForm.reciterSlug) return
    getIslamQuranCoverage(importForm.reciterSlug)
      .then(({ data }) => setCoverage(data.coverage || []))
      .catch(() => {})
  }, [importForm.reciterSlug])

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
    setAyahForm({ number: existing.length + 1, textAr: '', translationRu: '', translationKz: '', startTime: '' })
    setAyahDialogOpen(true)
  }

  const openEditAyah = (a: AyahItem) => {
    setCurrentSurahId(a.surahId)
    setEditingAyah(a)
    setAyahForm({
      number: a.number,
      textAr: a.textAr,
      translationRu: a.translationRu || '',
      translationKz: a.translationKz || '',
      startTime: a.startTime != null ? String(a.startTime) : '',
    })
    setAyahDialogOpen(true)
  }

  const saveAyah = async () => {
    setError('')
    const payload = {
      number: ayahForm.number,
      textAr: ayahForm.textAr,
      translationRu: ayahForm.translationRu || undefined,
      translationKz: ayahForm.translationKz || undefined,
      startTime: ayahForm.startTime ? parseFloat(ayahForm.startTime) : undefined,
    }
    try {
      if (editingAyah) {
        await updateIslamAyah(editingAyah.id, payload)
        setSuccess('Аят обновлён')
      } else {
        await createIslamAyah(currentSurahId, payload)
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

  const handleUploadSurahAudio = async (surahId: string, file: File) => {
    try {
      await uploadIslamSurahAudio(surahId, file)
      setSuccess('Аудио суры загружено (до 200 MB)')
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Ошибка загрузки аудио')
    }
  }

  const handleAyahStartTimeBlur = async (ayah: AyahItem, value: string) => {
    setStartTimeEdits((prev) => {
      const next = { ...prev }
      delete next[ayah.id]
      return next
    })
    const num = value === '' ? undefined : parseFloat(value)
    if (value !== '' && (num === undefined || isNaN(num))) return
    try {
      await updateIslamAyah(ayah.id, { startTime: num })
      setSuccess('Тайминг обновлён')
      const { data } = await getIslamSurahAyahs(ayah.surahId)
      setAyahsMap((prev) => ({ ...prev, [ayah.surahId]: data.ayahs || [] }))
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Ошибка сохранения')
    }
  }

  const handleCreateReciter = async () => {
    try {
      await createIslamQuranReciter({
        slug: reciterForm.slug.trim(),
        displayName: reciterForm.displayName.trim(),
        source: reciterForm.source.trim() || undefined,
        bitrate: reciterForm.bitrate.trim() || undefined,
        sortOrder: reciterForm.sortOrder,
        isActive: true,
      })
      setSuccess('Рецитатор создан')
      setReciterForm({ slug: '', displayName: '', source: 'EveryAyah', bitrate: '64kbps', sortOrder: 0 })
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Ошибка создания рецитатора')
    }
  }

  const handleToggleReciterActive = async (reciter: ReciterItem) => {
    try {
      await updateIslamQuranReciter(reciter.id, { isActive: !reciter.isActive })
      setReciters((prev) =>
        prev.map((r) => (r.id === reciter.id ? { ...r, isActive: !r.isActive } : r)),
      )
      setSuccess('Статус рецитатора обновлён')
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Ошибка обновления рецитатора')
    }
  }

  const handleRunImport = async () => {
    try {
      const { data } = await importIslamEveryAyah({
        reciterSlug: importForm.reciterSlug,
        fromSurah: importForm.fromSurah,
        toSurah: importForm.toSurah,
        overwrite: importForm.overwrite,
        concurrency: importForm.concurrency,
      })
      setImportJobId(data.jobId)
      setImportStatus({
        id: data.jobId,
        status: data.status,
        processed: 0,
        success: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      })
      setSuccess(`Импорт запущен (jobId: ${data.jobId})`)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Не удалось запустить импорт')
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

      <Stack spacing={2} mb={2}>
        <Card sx={{ p: 2 }}>
          <Typography variant="h6" mb={1}>Рецитаторы</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} mb={2}>
            <TextField
              label="Slug"
              size="small"
              value={reciterForm.slug}
              onChange={(e) => setReciterForm({ ...reciterForm, slug: e.target.value })}
            />
            <TextField
              label="Название"
              size="small"
              value={reciterForm.displayName}
              onChange={(e) => setReciterForm({ ...reciterForm, displayName: e.target.value })}
            />
            <TextField
              label="Источник"
              size="small"
              value={reciterForm.source}
              onChange={(e) => setReciterForm({ ...reciterForm, source: e.target.value })}
            />
            <TextField
              label="Bitrate"
              size="small"
              value={reciterForm.bitrate}
              onChange={(e) => setReciterForm({ ...reciterForm, bitrate: e.target.value })}
            />
            <Button variant="contained" onClick={handleCreateReciter}>Добавить</Button>
          </Stack>
          <Stack spacing={1}>
            {reciters.map((reciter) => (
              <Stack
                key={reciter.id}
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
                sx={{ border: '1px solid #eee', borderRadius: 1, px: 1.5, py: 1 }}
              >
                <Typography>{reciter.displayName} ({reciter.slug})</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={reciter.isActive}
                      onChange={() => handleToggleReciterActive(reciter)}
                    />
                  }
                  label={reciter.isActive ? 'Активен' : 'Отключен'}
                />
              </Stack>
            ))}
            {reciters.length === 0 && (
              <Typography color="text.secondary">Рецитаторы ещё не добавлены</Typography>
            )}
          </Stack>
        </Card>

        <Card sx={{ p: 2 }}>
          <Typography variant="h6" mb={1}>Bulk import EveryAyah</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center" mb={1}>
            <Select
              size="small"
              value={importForm.reciterSlug}
              onChange={(e) => setImportForm({ ...importForm, reciterSlug: String(e.target.value) })}
              sx={{ minWidth: 220 }}
            >
              {reciters.map((r) => (
                <MenuItem key={r.id} value={r.slug}>{r.displayName} ({r.slug})</MenuItem>
              ))}
            </Select>
            <TextField
              label="Сура от"
              size="small"
              type="number"
              value={importForm.fromSurah}
              onChange={(e) => setImportForm({ ...importForm, fromSurah: Number(e.target.value) })}
            />
            <TextField
              label="Сура до"
              size="small"
              type="number"
              value={importForm.toSurah}
              onChange={(e) => setImportForm({ ...importForm, toSurah: Number(e.target.value) })}
            />
            <TextField
              label="Concurrency"
              size="small"
              type="number"
              value={importForm.concurrency}
              onChange={(e) => setImportForm({ ...importForm, concurrency: Number(e.target.value) })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={importForm.overwrite}
                  onChange={(e) => setImportForm({ ...importForm, overwrite: e.target.checked })}
                />
              }
              label="Overwrite"
            />
            <Button
              variant="contained"
              onClick={handleRunImport}
              disabled={!importForm.reciterSlug}
            >
              Запустить импорт
            </Button>
          </Stack>

          {importStatus && (
            <Alert severity={importStatus.status === 'failed' ? 'error' : 'info'} sx={{ mb: 1 }}>
              status: {importStatus.status}, processed: {importStatus.processed}, success: {importStatus.success},
              skipped: {importStatus.skipped}, failed: {importStatus.failed}
            </Alert>
          )}

          <Typography variant="subtitle2" mb={1}>Покрытие по сурам (текущий рецитатор)</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {coverage.slice(0, 30).map((item) => (
              <Chip
                key={item.surahId}
                label={`${item.surahNumber}. ${item.surahNameRu}: ${item.percent}%`}
                color={item.percent >= 100 ? 'success' : item.percent > 0 ? 'warning' : 'default'}
                variant={item.percent >= 100 ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </Card>
      </Stack>

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
                <TableCell>Аудио</TableCell>
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
                      <label>
                        <input
                          type="file"
                          accept="audio/*"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleUploadSurahAudio(s.id, file)
                            e.target.value = ''
                          }}
                        />
                        <Chip
                          label={s.audioUrl ? 'Заменить' : 'Загрузить'}
                          color={s.audioUrl ? 'success' : 'default'}
                          size="small"
                          clickable
                          variant={s.audioUrl ? 'filled' : 'outlined'}
                          icon={<Audiotrack />}
                          component="span"
                        />
                      </label>
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
                    <TableCell colSpan={11} sx={{ py: 0, border: expandedId === s.id ? undefined : 'none' }}>
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
                                <TableCell>Начало (сек)</TableCell>
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
                                  <TableCell>
                                    <TextField
                                      size="small"
                                      type="number"
                                      inputProps={{ step: 0.1, min: 0 }}
                                      value={startTimeEdits[a.id] ?? (a.startTime != null ? String(a.startTime) : '')}
                                      onChange={(e) => setStartTimeEdits((prev) => ({ ...prev, [a.id]: e.target.value }))}
                                      onBlur={(e) => handleAyahStartTimeBlur(a, e.target.value)}
                                      sx={{ width: 80 }}
                                      placeholder="0"
                                    />
                                  </TableCell>
                                  <TableCell align="right">
                                    <IconButton size="small" onClick={() => openEditAyah(a)}><Edit fontSize="small" /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => handleDeleteAyah(a)}><Delete fontSize="small" /></IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {(ayahsMap[s.id] || []).length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={5} align="center">
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
                  <TableCell colSpan={11} align="center">
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
            <TextField label="Начало (сек)" type="number" inputProps={{ step: 0.1, min: 0 }} value={ayahForm.startTime} onChange={(e) => setAyahForm({ ...ayahForm, startTime: e.target.value })} placeholder="Время начала аята в аудио" />
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
