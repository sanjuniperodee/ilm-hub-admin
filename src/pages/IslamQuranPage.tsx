import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Box, Button, IconButton, LinearProgress, MenuItem, Stack, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material'
import { Add, EditOutlined, Refresh, VisibilityOffOutlined } from '@mui/icons-material'
import toast from 'react-hot-toast'
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
import {
  ArabicText,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SearchField,
  StatusChip,
  Toolbar,
  getErrorMessage,
  useConfirm,
  useShellBreadcrumbs,
  visuallyHidden,
  type DataTableColumn,
} from '../components/ui'
import { AudioPanel, SyncMonitorDialog } from './islam/quran/AudioPanel'
import { AyahDrawer, SurahDrawer } from './islam/quran/editors'
import { SurahDetail } from './islam/quran/SurahDetail'
import {
  REVELATION_LABEL,
  type AyahForm,
  type AyahItem,
  type CoverageItem,
  type EveryAyahReciterItem,
  type ReciterForm,
  type ReciterItem,
  type SurahForm,
  type SurahItem,
} from './islam/quran/model'

type QuranTab = 'surahs' | 'audio'
type TypeFilter = 'all' | 'meccan' | 'medinan'
type StatusFilter = 'all' | 'active' | 'hidden'

const emptyReciterForm = (): ReciterForm => ({ slug: '', displayName: '', source: 'EveryAyah', bitrate: '64kbps', sortOrder: 0 })

export default function IslamQuranPage() {
  const confirm = useConfirm()
  const [params, setParams] = useSearchParams()
  const tab: QuranTab = params.get('tab') === 'audio' ? 'audio' : 'surahs'
  const selectedSurahId = params.get('surah')

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)

  const [surahs, setSurahs] = useState<SurahItem[]>([])
  const [ayahsMap, setAyahsMap] = useState<Record<string, AyahItem[]>>({})
  const [ayahsError, setAyahsError] = useState<Record<string, unknown>>({})

  const [reciters, setReciters] = useState<ReciterItem[]>([])
  const [everyAyahReciters, setEveryAyahReciters] = useState<EveryAyahReciterItem[]>([])
  const [selectedEveryAyahSlugs, setSelectedEveryAyahSlugs] = useState<string[]>([])
  const [everyAyahSearch, setEveryAyahSearch] = useState('')
  const [showOnlyNotAdded, setShowOnlyNotAdded] = useState(true)
  const [togglingReciterId, setTogglingReciterId] = useState<string | null>(null)

  const [coverage, setCoverage] = useState<CoverageItem[]>([])
  const [reciterForm, setReciterForm] = useState<ReciterForm>(emptyReciterForm())

  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [surahDialogOpen, setSurahDialogOpen] = useState(false)
  const [editingSurah, setEditingSurah] = useState<SurahItem | null>(null)
  const [surahForm, setSurahForm] = useState<SurahForm>({
    number: 0,
    nameAr: '',
    nameRu: '',
    nameKz: '',
    transliteration: '',
    revelationType: 'meccan',
    ayahCount: 0,
    juzNumber: 1,
    pageNumber: 0,
  })

  const [ayahDialogOpen, setAyahDialogOpen] = useState(false)
  const [editingAyah, setEditingAyah] = useState<AyahItem | null>(null)
  const [ayahForm, setAyahForm] = useState<AyahForm>({ number: 0, textAr: '', translationRu: '', translationKz: '' })
  const [currentSurahId, setCurrentSurahId] = useState('')
  const [saving, setSaving] = useState(false)

  const [monitorOpen, setMonitorOpen] = useState(false)
  const [syncJobId, setSyncJobId] = useState('')
  const [syncStatus, setSyncStatus] = useState<any | null>(null)
  const [syncStarting, setSyncStarting] = useState(false)

  const filteredEveryAyahReciters = useMemo(() => {
    return everyAyahReciters.filter((item) => {
      if (showOnlyNotAdded && item.exists) return false
      if (!everyAyahSearch.trim()) return true
      const needle = everyAyahSearch.trim().toLowerCase()
      return item.slug.toLowerCase().includes(needle) || item.displayName.toLowerCase().includes(needle)
    })
  }, [everyAyahReciters, showOnlyNotAdded, everyAyahSearch])

  const coverageReadyCount = useMemo(() => coverage.filter((item) => item.percent >= 100).length, [coverage])
  const coverageBySurah = useMemo(() => new Map(coverage.map((c) => [c.surahId, c])), [coverage])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
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
    } catch (e) {
      setLoadError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

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
  }, [syncJobId, load])

  const loadAyahs = useCallback(async (surahId: string) => {
    setAyahsError((prev) => ({ ...prev, [surahId]: null }))
    try {
      const { data } = await getIslamSurahAyahs(surahId)
      setAyahsMap((prev) => ({ ...prev, [surahId]: data.ayahs || [] }))
    } catch (e) {
      setAyahsError((prev) => ({ ...prev, [surahId]: e }))
    }
  }, [])

  // Ayahs are fetched once per surah when it is opened.
  useEffect(() => {
    if (selectedSurahId && !ayahsMap[selectedSurahId]) loadAyahs(selectedSurahId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSurahId])

  const selectedSurah = selectedSurahId ? surahs.find((s) => s.id === selectedSurahId) ?? null : null

  useShellBreadcrumbs(
    selectedSurah
      ? [{ label: 'Коран', to: '/islam-quran' }, { label: `${selectedSurah.number}. ${selectedSurah.nameRu}` }]
      : null,
  )

  const setTab = (next: QuranTab) => setParams(next === 'audio' ? { tab: 'audio' } : {})
  const openSurah = (s: SurahItem) => setParams({ surah: s.id })

  /* ---------------- surahs ---------------- */

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
    setSaving(true)
    try {
      if (editingSurah) {
        await updateIslamSurah(editingSurah.id, surahForm)
        toast.success('Сура сохранена')
      } else {
        await createIslamSurah(surahForm)
        toast.success('Сура создана')
      }
      setSurahDialogOpen(false)
      await load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить суру'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSurah = async (s: SurahItem) => {
    const ok = await confirm({
      title: 'Деактивировать суру?',
      description: `Сура ${s.number} «${s.nameRu}» перестанет показываться в приложении. Аяты сохранятся.`,
      confirmLabel: 'Деактивировать',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteIslamSurah(s.id)
      toast.success('Сура деактивирована')
      await load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось деактивировать суру'))
    }
  }

  /* ---------------- ayahs ---------------- */

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
    const payload = {
      number: ayahForm.number,
      textAr: ayahForm.textAr,
      translationRu: ayahForm.translationRu || undefined,
      translationKz: ayahForm.translationKz || undefined,
    }
    setSaving(true)
    try {
      if (editingAyah) {
        await updateIslamAyah(editingAyah.id, payload)
        toast.success('Аят сохранён')
      } else {
        await createIslamAyah(currentSurahId, payload)
        toast.success('Аят создан')
      }
      setAyahDialogOpen(false)
      const { data } = await getIslamSurahAyahs(currentSurahId)
      setAyahsMap((prev) => ({ ...prev, [currentSurahId]: data.ayahs || [] }))
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить аят'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAyah = async (a: AyahItem) => {
    const surah = surahs.find((s) => s.id === a.surahId)
    const ok = await confirm({
      title: 'Удалить аят?',
      description: `Аят ${a.number}${surah ? ` исчезнет из суры «${surah.nameRu}»` : ' будет удалён'}. Это действие нельзя отменить.`,
      confirmLabel: 'Удалить аят',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteIslamAyah(a.id)
      toast.success('Аят удалён')
      const { data } = await getIslamSurahAyahs(a.surahId)
      setAyahsMap((prev) => ({ ...prev, [a.surahId]: data.ayahs || [] }))
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось удалить аят'))
    }
  }

  /* ---------------- audio & reciters ---------------- */

  const handleSyncAudioAll = async () => {
    setSyncStarting(true)
    try {
      const { data } = await syncQuranAudioAll({ overwrite: false, concurrency: 4, fromSurah: 1, toSurah: 114 })
      setSyncJobId(data.jobId)
      setSyncStatus(data)
      setMonitorOpen(true)
      toast.success('Синхронизация аудио запущена')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось запустить синхронизацию аудио'))
    } finally {
      setSyncStarting(false)
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
      toast.success(`Чтецы импортированы: новых ${data.created}, обновлено ${data.updated}`)
      setSelectedEveryAyahSlugs([])
      await load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось импортировать чтецов'))
    }
  }

  const handleToggleReciterActive = async (reciter: ReciterItem) => {
    setTogglingReciterId(reciter.id)
    try {
      await updateIslamQuranReciter(reciter.id, { isActive: !reciter.isActive })
      setReciters((prev) => prev.map((r) => (r.id === reciter.id ? { ...r, isActive: !r.isActive } : r)))
      toast.success(reciter.isActive ? 'Чтец отключён' : 'Чтец включён')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось обновить чтеца'))
    } finally {
      setTogglingReciterId(null)
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
      toast.success('Чтец добавлен')
      setReciterForm(emptyReciterForm())
      await load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось добавить чтеца'))
    }
  }

  /* ---------------- surah list ---------------- */

  const filtersActive = !!q || typeFilter !== 'all' || statusFilter !== 'all'
  const resetFilters = () => {
    setQ('')
    setTypeFilter('all')
    setStatusFilter('all')
  }

  const visibleSurahs = useMemo(() => {
    const needle = q.toLowerCase()
    return surahs.filter((s) => {
      if (typeFilter !== 'all' && s.revelationType !== typeFilter) return false
      if (statusFilter === 'active' && !s.isActive) return false
      if (statusFilter === 'hidden' && s.isActive) return false
      if (!needle) return true
      return (
        String(s.number) === needle ||
        [s.nameAr, s.nameRu, s.nameKz, s.transliteration].some((v) => v && v.toLowerCase().includes(needle))
      )
    })
  }, [surahs, q, typeFilter, statusFilter])

  const surahColumns: DataTableColumn<SurahItem>[] = [
    {
      id: 'nameAr',
      header: 'Сура',
      minWidth: 120,
      render: (s) => (
        <ArabicText size="md" weight={500}>
          {s.nameAr}
        </ArabicText>
      ),
    },
    { id: 'number', header: '№', align: 'right', sortable: true, width: 64 },
    {
      id: 'nameRu',
      header: 'Название',
      sortable: true,
      minWidth: 200,
      render: (s) => (
        <Box>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {s.nameRu}
            </Typography>
            {!s.isActive && <StatusChip status="inactive" label="Скрыта" />}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {s.transliteration}
            {s.nameKz ? `, ${s.nameKz}` : ''}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'revelationType',
      header: 'Тип',
      sortable: true,
      hideBelow: 'sm',
      nowrap: true,
      render: (s) => (
        <StatusChip tone={s.revelationType === 'meccan' ? 'brand' : 'info'} label={REVELATION_LABEL[s.revelationType]} hideDot />
      ),
    },
    { id: 'ayahCount', header: 'Аятов', align: 'right', sortable: true, width: 80 },
    { id: 'juzNumber', header: 'Джуз', align: 'right', sortable: true, hideBelow: 'md', width: 80 },
    {
      id: 'coverage',
      header: 'Аудио',
      hideBelow: 'lg',
      minWidth: 140,
      sortable: true,
      sortValue: (s) => coverageBySurah.get(s.id)?.percent ?? -1,
      render: (s) => {
        const c = coverageBySurah.get(s.id)
        if (!c) return <Typography variant="body2" color="text.secondary">—</Typography>
        return (
          <Stack direction="row" alignItems="center" gap={1}>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, c.percent)}
              color={c.percent >= 100 ? 'success' : 'primary'}
              aria-label={`Аудио ${Math.round(c.percent)}%`}
              sx={{ flex: 1, height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption" sx={{ width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(c.percent)}%
            </Typography>
          </Stack>
        )
      },
    },
    {
      id: 'actions',
      header: <Box component="span" sx={visuallyHidden}>Действия</Box>,
      align: 'right',
      width: 96,
      render: (s) => (
        <Stack direction="row" justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Изменить суру">
            <IconButton size="small" aria-label={`Изменить суру ${s.nameRu}`} onClick={() => openEditSurah(s)}>
              <EditOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Деактивировать">
            <IconButton size="small" aria-label={`Деактивировать суру ${s.nameRu}`} onClick={() => handleDeleteSurah(s)} sx={{ color: 'error.main' }}>
              <VisibilityOffOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  const drawers = (
    <>
      <SyncMonitorDialog open={monitorOpen} onClose={() => setMonitorOpen(false)} syncStatus={syncStatus} syncJobId={syncJobId} />
      <SurahDrawer
        open={surahDialogOpen}
        isEdit={!!editingSurah}
        form={surahForm}
        saving={saving}
        onChange={setSurahForm}
        onClose={() => setSurahDialogOpen(false)}
        onSave={saveSurah}
      />
      <AyahDrawer
        open={ayahDialogOpen}
        isEdit={!!editingAyah}
        form={ayahForm}
        saving={saving}
        surah={surahs.find((s) => s.id === currentSurahId) ?? null}
        onChange={setAyahForm}
        onClose={() => setAyahDialogOpen(false)}
        onSave={saveAyah}
      />
    </>
  )

  /* ---------------- surah detail view ---------------- */

  if (selectedSurahId) {
    return (
      <>
        <PageHeader
          backTo="/islam-quran"
          backLabel="Все суры"
          title={selectedSurah ? `${selectedSurah.number}. ${selectedSurah.nameRu}` : 'Сура'}
          subtitle={selectedSurah ? `${selectedSurah.transliteration}, аяты с переводами` : undefined}
          actions={
            selectedSurah && (
              <>
                <Button variant="outlined" startIcon={<EditOutlined />} onClick={() => openEditSurah(selectedSurah)}>
                  Изменить суру
                </Button>
                <Button variant="contained" startIcon={<Add />} onClick={() => openCreateAyah(selectedSurah.id)}>
                  Добавить аят
                </Button>
              </>
            )
          }
        />
        {loading && !selectedSurah ? (
          <LoadingState variant="page" label="Загружаем суру…" />
        ) : loadError && !selectedSurah ? (
          <ErrorState title="Не удалось загрузить суру" error={loadError} onRetry={load} />
        ) : !selectedSurah ? (
          <EmptyState
            title="Сура не найдена"
            description="Возможно, её удалили или ссылка устарела."
            action={<Button onClick={() => setParams({})}>Ко всем сурам</Button>}
          />
        ) : (
          <SurahDetail
            surah={selectedSurah}
            ayahs={ayahsMap[selectedSurah.id]}
            ayahsError={ayahsError[selectedSurah.id]}
            coverage={coverageBySurah.get(selectedSurah.id)}
            onRetry={() => loadAyahs(selectedSurah.id)}
            onCreateAyah={() => openCreateAyah(selectedSurah.id)}
            onEditAyah={openEditAyah}
            onDeleteAyah={handleDeleteAyah}
          />
        )}
        {drawers}
      </>
    )
  }

  /* ---------------- list view ---------------- */

  return (
    <>
      <PageHeader
        title="Коран"
        subtitle="Суры и аяты с переводами, чтецы и синхронизация аудио."
        disableGutterBottom
        actions={
          <>
            <Button variant="outlined" startIcon={<Refresh />} onClick={load} disabled={loading}>
              Обновить
            </Button>
            {tab === 'surahs' && (
              <Button variant="contained" startIcon={<Add />} onClick={openCreateSurah}>
                Добавить суру
              </Button>
            )}
          </>
        }
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="Разделы Корана">
          <Tab value="surahs" label={`Суры${surahs.length ? ` (${surahs.length})` : ''}`} />
          <Tab value="audio" label="Чтецы и аудио" />
        </Tabs>
      </PageHeader>

      <Box sx={{ mt: 2.5 }}>
        {tab === 'surahs' ? (
          <>
            <Toolbar
              hasActiveFilters={filtersActive}
              onReset={resetFilters}
              summary={surahs.length ? (filtersActive ? `Показано ${visibleSurahs.length} из ${surahs.length}` : `Всего ${surahs.length}`) : undefined}
            >
              <SearchField value={q} onChange={setQ} placeholder="Номер или название суры" enableSlashShortcut sx={{ minWidth: { sm: 280 } }} />
              <TextField select size="small" label="Тип" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)} sx={{ minWidth: 160 }}>
                <MenuItem value="all">Все</MenuItem>
                <MenuItem value="meccan">{REVELATION_LABEL.meccan}</MenuItem>
                <MenuItem value="medinan">{REVELATION_LABEL.medinan}</MenuItem>
              </TextField>
              <TextField select size="small" label="Статус" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} sx={{ minWidth: 150 }}>
                <MenuItem value="all">Все</MenuItem>
                <MenuItem value="active">Показываются</MenuItem>
                <MenuItem value="hidden">Скрытые</MenuItem>
              </TextField>
            </Toolbar>
            <DataTable
              aria-label="Суры"
              columns={surahColumns}
              rows={visibleSurahs}
              getRowId={(s) => s.id}
              loading={loading}
              error={loadError}
              onRetry={load}
              onRowClick={openSurah}
              defaultSort={{ by: 'number', direction: 'asc' }}
              pagination
              initialRowsPerPage={50}
              rowsPerPageOptions={[25, 50, 114]}
              emptyState={
                filtersActive ? (
                  <EmptyState
                    size="sm"
                    title="Ничего не найдено"
                    description="Измените запрос или сбросьте фильтры."
                    action={<Button onClick={resetFilters}>Сбросить фильтры</Button>}
                  />
                ) : (
                  <EmptyState
                    size="sm"
                    title="Сур пока нет"
                    description="Добавьте суру вручную или загрузите Коран скриптом импорта."
                    action={
                      <Button variant="contained" startIcon={<Add />} onClick={openCreateSurah}>
                        Добавить суру
                      </Button>
                    }
                  />
                )
              }
            />
            {surahs.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                Нажмите на суру, чтобы открыть её аяты.
              </Typography>
            )}
          </>
        ) : loadError && !reciters.length && !coverage.length ? (
          <ErrorState title="Не удалось загрузить данные Корана" error={loadError} onRetry={load} />
        ) : (
          <AudioPanel
            surahsCount={surahs.length}
            reciters={reciters}
            coverage={coverage}
            coverageReadyCount={coverageReadyCount}
            loading={loading}
            syncStatus={syncStatus}
            syncStarting={syncStarting}
            onSync={handleSyncAudioAll}
            onOpenMonitor={() => setMonitorOpen(true)}
            everyAyahSearch={everyAyahSearch}
            onEveryAyahSearch={setEveryAyahSearch}
            showOnlyNotAdded={showOnlyNotAdded}
            onShowOnlyNotAdded={setShowOnlyNotAdded}
            filteredEveryAyahReciters={filteredEveryAyahReciters}
            totalEveryAyah={everyAyahReciters.length}
            selectedSlugs={selectedEveryAyahSlugs}
            onSelectedSlugs={setSelectedEveryAyahSlugs}
            onImportSelected={handleImportSelectedEveryAyahReciters}
            reciterForm={reciterForm}
            onReciterForm={setReciterForm}
            onCreateReciter={handleCreateReciter}
            onToggleReciter={handleToggleReciterActive}
            togglingReciterId={togglingReciterId}
          />
        )}
      </Box>

      {drawers}
    </>
  )
}
