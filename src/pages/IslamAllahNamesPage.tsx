import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, IconButton, MenuItem, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material'
import { Add, EditOutlined, Refresh, VisibilityOffOutlined } from '@mui/icons-material'
import toast from 'react-hot-toast'
import {
  getIslamAllahNames,
  createIslamAllahName,
  updateIslamAllahName,
  deleteIslamAllahName,
  uploadIslamAllahNameAudio,
} from '../api/adminApi'
import {
  ArabicText,
  DataTable,
  EmptyState,
  PageHeader,
  SearchField,
  Toolbar,
  getErrorMessage,
  useConfirm,
  visuallyHidden,
  type DataTableColumn,
} from '../components/ui'
import { AudioPlayButton, AudioUploadButton, Completeness } from './words/shared'
import { NameDrawer, nameCompleteness, type AllahName, type AllahNameForm } from './islam/names/NameDrawer'

type StatusFilter = 'all' | 'active' | 'hidden'
type GapFilter = 'all' | 'noAudio' | 'noKz'

const emptyForm = (number: number): AllahNameForm => ({
  number,
  nameAr: '',
  nameRu: '',
  nameKz: '',
  transliteration: '',
  meaningRu: '',
  meaningKz: '',
  descriptionRu: '',
  descriptionKz: '',
})

export default function IslamAllahNamesPage() {
  const confirm = useConfirm()
  const [names, setNames] = useState<AllahName[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [gapFilter, setGapFilter] = useState<GapFilter>('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AllahNameForm>(emptyForm(1))
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const editing = editingId ? names.find((n) => n.id === editingId) ?? null : null

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data } = await getIslamAllahNames()
      setNames(data.names || [])
    } catch (e) {
      setLoadError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtersActive = !!q || statusFilter !== 'all' || gapFilter !== 'all'
  const resetFilters = () => {
    setQ('')
    setStatusFilter('all')
    setGapFilter('all')
  }

  const visible = useMemo(() => {
    const needle = q.toLowerCase()
    return names.filter((n) => {
      if (statusFilter === 'active' && !n.isActive) return false
      if (statusFilter === 'hidden' && n.isActive) return false
      if (gapFilter === 'noAudio' && n.audioUrl) return false
      if (gapFilter === 'noKz' && nameCompleteness(n)[1].done) return false
      if (!needle) return true
      return (
        String(n.number) === needle ||
        [n.nameAr, n.nameRu, n.nameKz, n.transliteration, n.meaningRu].some((v) => v && v.toLowerCase().includes(needle))
      )
    })
  }, [names, q, statusFilter, gapFilter])

  const noAudio = names.filter((n) => !n.audioUrl).length

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm((names.length || 0) + 1))
    setDialogOpen(true)
  }

  const openEdit = (n: AllahName) => {
    setEditingId(n.id)
    setForm({
      number: n.number,
      nameAr: n.nameAr,
      nameRu: n.nameRu,
      nameKz: n.nameKz || '',
      transliteration: n.transliteration,
      meaningRu: n.meaningRu,
      meaningKz: n.meaningKz || '',
      descriptionRu: n.descriptionRu || '',
      descriptionKz: n.descriptionKz || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingId) {
        await updateIslamAllahName(editingId, form)
        toast.success('Имя сохранено')
      } else {
        await createIslamAllahName(form)
        toast.success('Имя создано')
      }
      setDialogOpen(false)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить имя'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (n: AllahName) => {
    const ok = await confirm({
      title: 'Деактивировать имя?',
      description: `«${n.nameRu}» (№${n.number}) перестанет показываться в приложении.`,
      confirmLabel: 'Деактивировать',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteIslamAllahName(n.id)
      toast.success('Имя деактивировано')
      load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось деактивировать имя'))
    }
  }

  const handleAudioUpload = async (id: string, file: File) => {
    await uploadIslamAllahNameAudio(id, file)
    toast.success('Аудио загружено')
    await load()
  }

  const handleToggleActive = async (n: AllahName) => {
    setTogglingId(n.id)
    try {
      await updateIslamAllahName(n.id, { isActive: !n.isActive })
      toast.success(n.isActive ? 'Имя скрыто' : 'Имя показывается')
      await load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось изменить статус'))
    } finally {
      setTogglingId(null)
    }
  }

  const columns: DataTableColumn<AllahName>[] = [
    {
      id: 'nameAr',
      header: 'Имя',
      minWidth: 130,
      render: (n) => (
        <ArabicText size="lg" weight={500}>
          {n.nameAr}
        </ArabicText>
      ),
    },
    {
      id: 'number',
      header: '№',
      align: 'right',
      sortable: true,
      width: 64,
    },
    {
      id: 'nameRu',
      header: 'Название',
      sortable: true,
      minWidth: 180,
      render: (n) => (
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {n.nameRu}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {n.transliteration}
            {n.nameKz ? `, ${n.nameKz}` : ''}
          </Typography>
          <Box sx={{ mt: 0.75 }}>
            <Completeness items={nameCompleteness(n)} />
          </Box>
        </Box>
      ),
    },
    {
      id: 'meaningRu',
      header: 'Значение',
      hideBelow: 'md',
      minWidth: 180,
      render: (n) => <Typography variant="body2">{n.meaningRu}</Typography>,
    },
    {
      id: 'audio',
      header: 'Аудио',
      nowrap: true,
      render: (n) => (
        <Stack direction="row" alignItems="center" gap={0.5} onClick={(e) => e.stopPropagation()}>
          <AudioPlayButton src={n.audioUrl} label={n.nameRu} reserveSpace />
          <AudioUploadButton variant="icon" hasAudio={!!n.audioUrl} onUpload={(f) => handleAudioUpload(n.id, f)} itemLabel={n.nameRu} />
        </Stack>
      ),
    },
    {
      id: 'isActive',
      header: 'В приложении',
      nowrap: true,
      sortable: true,
      render: (n) => (
        <Stack direction="row" alignItems="center" gap={0.5} onClick={(e) => e.stopPropagation()}>
          <Switch
            size="small"
            checked={n.isActive}
            disabled={togglingId === n.id}
            onChange={() => handleToggleActive(n)}
            inputProps={{ 'aria-label': `Показывать имя ${n.nameRu} в приложении` }}
          />
          <Typography variant="body2" color={n.isActive ? 'text.primary' : 'text.secondary'}>
            {n.isActive ? 'Да' : 'Скрыто'}
          </Typography>
        </Stack>
      ),
    },
    {
      id: 'actions',
      header: <Box component="span" sx={visuallyHidden}>Действия</Box>,
      align: 'right',
      width: 96,
      render: (n) => (
        <Stack direction="row" justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Изменить">
            <IconButton size="small" aria-label={`Изменить имя ${n.nameRu}`} onClick={() => openEdit(n)}>
              <EditOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Деактивировать">
            <IconButton size="small" aria-label={`Деактивировать имя ${n.nameRu}`} onClick={() => handleDelete(n)} sx={{ color: 'error.main' }}>
              <VisibilityOffOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="99 имён Аллаха"
        subtitle="Имена Всевышнего: арабское написание, значение, описание и аудио."
        actions={
          <>
            <Button variant="outlined" startIcon={<Refresh />} onClick={load} disabled={loading}>
              Обновить
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
              Добавить имя
            </Button>
          </>
        }
      />

      <Toolbar
        hasActiveFilters={filtersActive}
        onReset={resetFilters}
        summary={
          names.length
            ? filtersActive
              ? `Показано ${visible.length} из ${names.length}`
              : `Всего ${names.length}, без аудио ${noAudio}`
            : undefined
        }
      >
        <SearchField value={q} onChange={setQ} placeholder="Номер, имя, транслит или значение" enableSlashShortcut sx={{ minWidth: { sm: 300 } }} />
        <TextField select size="small" label="Статус" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} sx={{ minWidth: 150 }}>
          <MenuItem value="all">Все</MenuItem>
          <MenuItem value="active">Показываются</MenuItem>
          <MenuItem value="hidden">Скрытые</MenuItem>
        </TextField>
        <TextField select size="small" label="Пробелы" value={gapFilter} onChange={(e) => setGapFilter(e.target.value as GapFilter)} sx={{ minWidth: 170 }}>
          <MenuItem value="all">Все</MenuItem>
          <MenuItem value="noAudio">Без аудио</MenuItem>
          <MenuItem value="noKz">Не заполнен KZ</MenuItem>
        </TextField>
      </Toolbar>

      <DataTable
        aria-label="99 имён Аллаха"
        columns={columns}
        rows={visible}
        getRowId={(n) => n.id}
        loading={loading}
        error={loadError}
        onRetry={load}
        onRowClick={openEdit}
        selectedRowId={dialogOpen ? editingId : null}
        defaultSort={{ by: 'number', direction: 'asc' }}
        pagination
        rowsPerPageOptions={[25, 50, 100]}
        initialRowsPerPage={100}
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
              title="Имён пока нет"
              description="Добавьте имя вручную или заполните список seed-скриптом seed:islam-content."
              action={
                <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
                  Добавить имя
                </Button>
              }
            />
          )
        }
      />

      <NameDrawer
        open={dialogOpen}
        editing={editing}
        form={form}
        saving={saving}
        onChange={setForm}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        onUploadAudio={handleAudioUpload}
      />
    </>
  )
}
