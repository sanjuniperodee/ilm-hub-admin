import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
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
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Add, Delete, Edit, ExpandLess, ExpandMore, Refresh, Search } from '@mui/icons-material'
import {
  createIslamAyah,
  createIslamQuranReciter,
  createIslamSurah,
  deleteIslamAyah,
  deleteIslamSurah,
  getIslamEveryAyahReciters,
  getIslamQuranCoverage,
  getIslamQuranReciters,
  getIslamSurahAyahs,
  getIslamSurahs,
  getQuranSyncStatus,
  importIslamRecitersFromEveryAyah,
  syncQuranAudioAll,
  updateIslamAyah,
  updateIslamQuranReciter,
  updateIslamSurah,
} from '../api/adminApi'
import { dialogActionsSafeAreaSx, useNarrowDialogProps } from '../hooks/useNarrowDialogProps'

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

interface ReciterItem {
  id: string
  slug: string
  displayName: string
  source?: string | null
  bitrate?: string | null
  isActive: boolean
  sortOrder: number
}

interface EveryAyahReciterItem {
  slug: string
  displayName: string
  source?: string | null
  bitrate?: string | null
  exists: boolean
  reciterId: string | null
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

  const [reciters, setReciters] = useState<ReciterItem[]>([])
  const [everyAyahReciters, setEveryAyahReciters] = useState<EveryAyahReciterItem[]>([])
  const [selectedEveryAyahSlugs, setSelectedEveryAyahSlugs] = useState<string[]>([])
  const [everyAyahSearch, setEveryAyahSearch] = useState('')
  const [showOnlyNotAdded, setShowOnlyNotAdded] = useState(true)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [coverage, setCoverage] = useState<CoverageItem[]>([])

  const [reciterForm, setReciterForm] = useState({
    slug: '',
    displayName: '',
    source: 'EveryAyah',
    bitrate: '64kbps',
    sortOrder: 0,
  })

  const [surahDialogOpen, setSurahDialogOpen] = useState(false)
  const [editingSurah, setEditingSurah] = useState<SurahItem | null>(null)
  const [surahForm, setSurahForm] = useState({
    number: 0,
    nameAr: '',
    nameRu: '',
    nameKz: '',
    transliteration: '',
    revelationType: 'meccan' as 'meccan' | 'medinan',
    ayahCount: 0,
    juzNumber: 1,
    pageNumber: 0,
  })

  const [ayahDialogOpen, setAyahDialogOpen] = useState(false)
  const [editingAyah, setEditingAyah] = useState<AyahItem | null>(null)
  const [ayahForm, setAyahForm] = useState({
    number: 0,
    textAr: '',
    translationRu: '',
    translationKz: '',
  })
  const [currentSurahId, setCurrentSurahId] = useState('')

  const [monitorOpen, setMonitorOpen] = useState(false)
  const [syncJobId, setSyncJobId] = useState('')
  const [syncStatus, setSyncStatus] = useState<any | null>(null)
  const narrowFormMd = useNarrowDialogProps('md')
  const narrowFormSm = useNarrowDialogProps('sm')
  const themeMui = useTheme()
  const isNarrow = useMediaQuery(themeMui.breakpoints.down('md'))

  const filteredEveryAyahReciters = useMemo(() => {
    return everyAyahReciters.filter((item) => {
      if (showOnlyNotAdded && item.exists) return false
      if (!everyAyahSearch.trim()) return true
      const q = everyAyahSearch.trim().toLowerCase()
      return item.slug.toLowerCase().includes(q) || item.displayName.toLowerCase().includes(q)
    })
  }, [everyAyahReciters, showOnlyNotAdded, everyAyahSearch])

  const coverageReadyCount = useMemo(
    () => coverage.filter((item) => item.percent >= 100).length,
    [coverage],
  )

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [surahsRes, recitersRes, everyAyahRes, coverageRes] = await Promise.all([
        getIslamSurahs(),
        getIslamQuranReciters(),
        getIslamEveryAyahReciters(),
        getIslamQuranCoverage(),
      ])
      setSurahs(surahsRes.data.surahs || [])
      setReciters(recitersRes.data.reciters || [])
      setEveryAyahReciters(everyAyahRes.data.reciters || [])
      setCoverage(coverageRes.data.coverage || [])
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load Quran data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!syncJobId) return
    const timer = setInterval(async () => {
      try {
        const { data } = await getQuranSyncStatus(syncJobId)
        setSyncStatus(data)
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(timer)
          load()
        }
      } catch {
        clearInterval(timer)
      }
    }, 2500)
    return () => clearInterval(timer)
  }, [syncJobId])

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
    setSurahForm({
      number: surahs.length + 1,
      nameAr: '',
      nameRu: '',
      nameKz: '',
      transliteration: '',
      revelationType: 'meccan',
      ayahCount: 0,
      juzNumber: 1,
      pageNumber: 0,
    })
    setSurahDialogOpen(true)
  }

  const openEditSurah = (s: SurahItem) => {
    setEditingSurah(s)
    setSurahForm({
      number: s.number,
      nameAr: s.nameAr,
      nameRu: s.nameRu,
      nameKz: s.nameKz || '',
      transliteration: s.transliteration,
      revelationType: s.revelationType,
      ayahCount: s.ayahCount,
      juzNumber: s.juzNumber,
      pageNumber: s.pageNumber || 0,
    })
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
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Save failed')
    }
  }

  const handleDeleteSurah = async (id: string) => {
    if (!confirm('Деактивировать суру?')) return
    try {
      await deleteIslamSurah(id)
      setSuccess('Сура деактивирована')
      await load()
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
    setAyahForm({
      number: a.number,
      textAr: a.textAr,
      translationRu: a.translationRu || '',
      translationKz: a.translationKz || '',
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

  const handleSyncAudioAll = async () => {
    try {
      const { data } = await syncQuranAudioAll({ overwrite: false, concurrency: 4, fromSurah: 1, toSurah: 114 })
      setSyncJobId(data.jobId)
      setSyncStatus(data)
      setMonitorOpen(true)
      setSuccess(`Синхронизация аудио запущена: ${data.jobId}`)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Не удалось запустить синхронизацию аудио')
    }
  }

  const handleImportSelectedEveryAyahReciters = async () => {
    if (selectedEveryAyahSlugs.length === 0) return
    try {
      const { data } = await importIslamRecitersFromEveryAyah({
        slugs: selectedEveryAyahSlugs,
        activate: true,
        overwriteMetadata: true,
      })
      setSuccess(`Импорт рецитаторов: created ${data.created}, updated ${data.updated}`)
      setSelectedEveryAyahSlugs([])
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Не удалось импортировать рецитаторов')
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

  const renderSurahAyahs = (s: SurahItem) => {
    const ayahs = ayahsMap[s.id] || []
    const header = (
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} mb={1}>
        <Typography variant="subtitle2">Аяты суры {s.nameRu}</Typography>
        <Button size="small" startIcon={<Add />} onClick={() => openCreateAyah(s.id)}>Добавить аят</Button>
      </Stack>
    )
    if (isNarrow) {
      return (
        <Box sx={{ py: 1, px: { xs: 0, sm: 0.5 } }}>
          {header}
          <Stack spacing={1}>
            {ayahs.map((a) => (
              <Paper key={a.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">#{a.number}</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'NotoSansArabic, serif', direction: 'rtl' }}>{a.textAr}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{a.translationRu || '—'}</Typography>
                  </Box>
                  <Stack direction="row" flexShrink={0}>
                    <IconButton size="small" onClick={() => openEditAyah(a)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteAyah(a)}><Delete fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
              </Paper>
            ))}
            {ayahs.length === 0 && (
              <Typography color="text.secondary" py={2} textAlign="center">Нет аятов</Typography>
            )}
          </Stack>
        </Box>
      )
    }
    return (
      <Box sx={{ py: 2, pl: 4 }}>
        {header}
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
            {ayahs.map((a) => (
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
            {ayahs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="text.secondary" py={2}>Нет аятов</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    )
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} mb={2}>
        <Box>
          <Typography variant="h4" sx={{ fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>Коран</Typography>
          <Typography variant="subtitle1">Суры и one-click синхронизация аудио</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button startIcon={<Refresh />} onClick={load} disabled={loading}>
            Обновить
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreateSurah}>
            Добавить суру
          </Button>
        </Stack>
      </Stack>

      {loading && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">Обновление данных...</Typography>
        </Stack>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Button variant="contained" onClick={handleSyncAudioAll}>
            Синхронизировать аяты (аудио)
          </Button>
          <Button variant="outlined" onClick={() => setMonitorOpen(true)}>
            Мониторинг статуса
          </Button>
          <Box sx={{ flex: 1 }} />
          <Chip label={`Сур: ${surahs.length}`} />
          <Chip label={`Рецитаторов: ${reciters.length}`} />
          <Chip label={`Покрытие 100%: ${coverageReadyCount}/${coverage.length}`} color="success" variant="outlined" />
        </Stack>
      </Card>

      <Accordion expanded={advancedOpen} onChange={(_, expanded) => setAdvancedOpen(expanded)} sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography fontWeight={600}>Расширенные настройки (опционально)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            Для ручного контроля рецитаторов. Основной флоу работает без этого.
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} mb={1}>
            <OutlinedInput
              size="small"
              value={everyAyahSearch}
              onChange={(e) => setEveryAyahSearch(e.target.value)}
              placeholder="Поиск в каталоге EveryAyah"
              startAdornment={<InputAdornment position="start"><Search fontSize="small" /></InputAdornment>}
              sx={{ width: { xs: '100%', md: 'auto' }, minWidth: { xs: 0, md: 260 } }}
            />
            <FormControlLabel
              control={<Switch checked={showOnlyNotAdded} onChange={(e) => setShowOnlyNotAdded(e.target.checked)} />}
              label="Только не добавленные"
            />
            <Button variant="text" onClick={() => setSelectedEveryAyahSlugs(filteredEveryAyahReciters.map((r) => r.slug))}>
              Выбрать все
            </Button>
            <Button variant="text" onClick={() => setSelectedEveryAyahSlugs([])}>
              Очистить
            </Button>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} mb={2}>
            <Select
              multiple
              size="small"
              value={selectedEveryAyahSlugs}
              onChange={(e) => setSelectedEveryAyahSlugs(typeof e.target.value === 'string' ? e.target.value.split(',') : (e.target.value as string[]))}
              sx={{ width: { xs: '100%', md: 'auto' }, minWidth: { xs: 0, md: 260 } }}
              displayEmpty
              renderValue={(selected) => (Array.isArray(selected) && selected.length > 0 ? `Выбрано: ${selected.length}` : 'Выберите рецитаторов')}
            >
              {filteredEveryAyahReciters.map((item) => (
                <MenuItem key={item.slug} value={item.slug}>
                  <Checkbox checked={selectedEveryAyahSlugs.includes(item.slug)} size="small" />
                  <ListItemText primary={`${item.displayName} (${item.slug})`} secondary={item.exists ? 'Уже добавлен' : item.bitrate || undefined} />
                </MenuItem>
              ))}
            </Select>
            <Button variant="outlined" onClick={handleImportSelectedEveryAyahReciters} disabled={selectedEveryAyahSlugs.length === 0}>
              Импортировать выбранные
            </Button>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <TextField size="small" label="Slug" value={reciterForm.slug} onChange={(e) => setReciterForm({ ...reciterForm, slug: e.target.value })} />
            <TextField size="small" label="Название" value={reciterForm.displayName} onChange={(e) => setReciterForm({ ...reciterForm, displayName: e.target.value })} />
            <TextField size="small" label="Источник" value={reciterForm.source} onChange={(e) => setReciterForm({ ...reciterForm, source: e.target.value })} />
            <TextField size="small" label="Bitrate" value={reciterForm.bitrate} onChange={(e) => setReciterForm({ ...reciterForm, bitrate: e.target.value })} />
            <Button variant="contained" onClick={handleCreateReciter}>Добавить</Button>
          </Stack>
          <Stack spacing={1} mt={2}>
            {reciters.map((reciter) => (
              <Stack key={reciter.id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={1} sx={{ border: '1px solid #eee', borderRadius: 1, px: 1.5, py: 1 }}>
                <Typography>{reciter.displayName} ({reciter.slug})</Typography>
                <FormControlLabel
                  control={<Switch checked={reciter.isActive} onChange={() => handleToggleReciterActive(reciter)} />}
                  label={reciter.isActive ? 'Активен' : 'Отключен'}
                />
              </Stack>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {isNarrow ? (
        <Stack spacing={1.5}>
          {surahs.map((s) => (
            <Card key={s.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="flex-start" spacing={1}>
                  <IconButton size="small" onClick={() => toggleExpand(s.id)} aria-label="Развернуть">
                    {expandedId === s.id ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                  </IconButton>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {s.number}. {s.nameRu}
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'NotoSansArabic, serif', mt: 0.25 }}>{s.nameAr}</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                      <Chip label={s.revelationType === 'meccan' ? 'Мекк.' : 'Медин.'} size="small" color={s.revelationType === 'meccan' ? 'primary' : 'warning'} />
                      <Chip label={s.isActive ? 'Активна' : 'Скрыта'} size="small" color={s.isActive ? 'success' : 'default'} />
                      <Typography variant="caption" color="text.secondary">Джуз {s.juzNumber} · {s.ayahCount} аят.</Typography>
                    </Stack>
                  </Box>
                  <Stack direction="row" flexShrink={0}>
                    <IconButton size="small" onClick={() => openEditSurah(s)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteSurah(s.id)}><Delete fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
              </CardContent>
              <Collapse in={expandedId === s.id} unmountOnExit>
                <Box sx={{ px: 1.5, pb: 1.5, pt: 0, borderTop: 1, borderColor: 'divider' }}>{renderSurahAyahs(s)}</Box>
              </Collapse>
            </Card>
          ))}
          {surahs.length === 0 && !loading && (
            <Typography color="text.secondary" py={4} textAlign="center">Нет сур</Typography>
          )}
        </Stack>
      ) : (
        <Card>
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
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
                  <Fragment key={s.id}>
                    <TableRow hover>
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
                    <TableRow>
                      <TableCell colSpan={10} sx={{ py: 0, border: expandedId === s.id ? undefined : 'none' }}>
                        <Collapse in={expandedId === s.id} unmountOnExit>
                          {renderSurahAyahs(s)}
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
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
      )}

      <Dialog open={monitorOpen} onClose={() => setMonitorOpen(false)} {...narrowFormMd}>
        <DialogTitle>Мониторинг синхронизации</DialogTitle>
        <DialogContent dividers>
          {!syncStatus && (
            <Typography color="text.secondary">Пока нет активной синхронизации.</Typography>
          )}
          {syncStatus && (
            <Stack spacing={1.5}>
              <Typography><strong>Job ID:</strong> {syncStatus.id || syncJobId}</Typography>
              <Typography><strong>Тип:</strong> {syncStatus.type || syncStatus.mode || '-'}</Typography>
              <Typography><strong>Статус:</strong> {syncStatus.status}</Typography>
              {typeof syncStatus.processed === 'number' && (
                <Typography>
                  <strong>Прогресс:</strong> processed {syncStatus.processed}, success {syncStatus.success}, skipped {syncStatus.skipped}, failed {syncStatus.failed}
                </Typography>
              )}
              {Array.isArray(syncStatus.reciters) && (
                <Box>
                  <Typography fontWeight={600} mb={1}>Прогресс по рецитаторам</Typography>
                  <Stack spacing={1}>
                    {syncStatus.reciters.slice(0, 20).map((r: any) => (
                      <Stack key={r.reciterId || r.reciterSlug} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                        <Typography>{r.reciterDisplayName || r.reciterSlug}</Typography>
                        <Typography color="text.secondary">
                          {r.status}: {r.success}/{r.processed} (fail {r.failed})
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
              {Array.isArray(syncStatus.errors) && syncStatus.errors.length > 0 && (
                <Box>
                  <Typography fontWeight={600} mb={1}>Последние ошибки</Typography>
                  <Stack spacing={0.5}>
                    {syncStatus.errors.slice(0, 20).map((e: any, idx: number) => (
                      <Typography key={idx} variant="body2" color="error">
                        {e.surahNumber ? `${e.surahNumber}:${e.ayahNumber} ` : ''}{e.message || e.reason}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={() => setMonitorOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={surahDialogOpen} onClose={() => setSurahDialogOpen(false)} {...narrowFormSm}>
        <DialogTitle>{editingSurah ? 'Редактировать суру' : 'Новая сура'}</DialogTitle>
        <DialogContent dividers>
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
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={() => setSurahDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={saveSurah}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={ayahDialogOpen} onClose={() => setAyahDialogOpen(false)} {...narrowFormSm}>
        <DialogTitle>{editingAyah ? 'Редактировать аят' : 'Новый аят'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField label="Номер аята" type="number" value={ayahForm.number} onChange={(e) => setAyahForm({ ...ayahForm, number: +e.target.value })} />
            <TextField label="Арабский текст" multiline rows={3} value={ayahForm.textAr} onChange={(e) => setAyahForm({ ...ayahForm, textAr: e.target.value })} inputProps={{ dir: 'rtl' }} />
            <TextField label="Перевод (рус)" multiline rows={2} value={ayahForm.translationRu} onChange={(e) => setAyahForm({ ...ayahForm, translationRu: e.target.value })} />
            <TextField label="Перевод (каз)" multiline rows={2} value={ayahForm.translationKz} onChange={(e) => setAyahForm({ ...ayahForm, translationKz: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={() => setAyahDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={saveAyah}>Сохранить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
