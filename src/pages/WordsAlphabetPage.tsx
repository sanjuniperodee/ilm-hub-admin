import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Box, Button, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { Add, DeleteOutline, EditOutlined, Refresh } from '@mui/icons-material'
import toast from 'react-hot-toast'
import {
  getWordsAlphabet,
  createWordLetter,
  updateWordLetter,
  uploadWordLetterAudio,
  deleteWordLetterAudio,
  deleteWordLetter,
} from '../api/adminApi'
import {
  ArabicText,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SearchField,
  Toolbar,
  getErrorMessage,
  useConfirm,
} from '../components/ui'
import { AudioPlayButton, AudioUploadButton, Completeness, DragHandle, GlyphTile, SortableList } from './words/shared'
import { LetterDrawer } from './words/alphabet/LetterDrawer'
import {
  FORM_LABELS,
  buildCreateLetterBody,
  buildWordLetterPatchBody,
  letterCompleteness,
  normalizeWordLetter,
  type LetterDraft,
  type WordLetter,
} from './words/alphabet/model'

type AudioFilter = 'all' | 'with' | 'without'
type KzFilter = 'all' | 'missing'

export default function WordsAlphabetPage() {
  const confirm = useConfirm()
  const [letters, setLetters] = useState<WordLetter[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [reordering, setReordering] = useState(false)

  const [q, setQ] = useState('')
  const [audioFilter, setAudioFilter] = useState<AudioFilter>('all')
  const [kzFilter, setKzFilter] = useState<KzFilter>('all')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editCode, setEditCode] = useState<string | null>(null)
  const editLetter = editCode ? letters.find((l) => l.code === editCode) ?? null : null

  const load = useCallback(async () => {
    setRefreshing(true)
    setLoadError(null)
    try {
      const { data } = await getWordsAlphabet()
      const list: WordLetter[] = (data.letters || [])
        .map((row: Record<string, unknown>) => normalizeWordLetter(row))
        .sort((a: WordLetter, b: WordLetter) => a.orderIndex - b.orderIndex)
      setLetters(list)
      return list
    } catch (e) {
      setLoadError(e)
      return null
    } finally {
      setRefreshing(false)
      setInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtersActive = !!q || audioFilter !== 'all' || kzFilter !== 'all'
  const resetFilters = () => {
    setQ('')
    setAudioFilter('all')
    setKzFilter('all')
  }

  const visible = useMemo(() => {
    const needle = q.toLowerCase()
    return letters.filter((l) => {
      if (audioFilter === 'with' && !l.audioUrl) return false
      if (audioFilter === 'without' && l.audioUrl) return false
      if (kzFilter === 'missing' && letterCompleteness(l)[1].done) return false
      if (!needle) return true
      return [l.code, l.arabic, l.nameRu, l.nameKk, l.translit, l.translitKk]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    })
  }, [letters, q, audioFilter, kzFilter])

  const withoutAudio = letters.filter((l) => !l.audioUrl).length
  const withoutKz = letters.filter((l) => !letterCompleteness(l)[1].done).length

  const openCreate = () => {
    setEditCode(null)
    setDrawerOpen(true)
  }
  const openEdit = (l: WordLetter) => {
    setEditCode(l.code)
    setDrawerOpen(true)
  }

  const handleCreate = async (draft: LetterDraft) => {
    setSaving(true)
    try {
      await createWordLetter(buildCreateLetterBody(draft))
      setDrawerOpen(false)
      await load()
      toast.success('Буква создана')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось создать букву'))
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (letter: WordLetter, d: LetterDraft) => {
    setSaving(true)
    try {
      const next: WordLetter = {
        ...letter,
        nameRu: d.nameRu,
        nameKk: d.nameKk,
        translit: d.translit,
        translitKk: d.translitKk,
        important: d.important,
        importantKk: d.importantKk,
        forms: d.forms,
      }
      await updateWordLetter(letter.code, buildWordLetterPatchBody(next))
      setDrawerOpen(false)
      await load()
      toast.success(`Буква ${letter.code} сохранена`)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить букву'))
    } finally {
      setSaving(false)
    }
  }

  const handleUploadAudio = async (code: string, file: File) => {
    await uploadWordLetterAudio(code, file)
    await load()
    toast.success(`Аудио для ${code} загружено`)
  }

  const handleDeleteAudio = async (code: string) => {
    const l = letters.find((x) => x.code === code)
    const ok = await confirm({
      title: 'Удалить аудио?',
      description: `Произношение буквы «${l?.nameRu ?? code}» пропадёт из приложения. Файл можно загрузить снова.`,
      confirmLabel: 'Удалить аудио',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteWordLetterAudio(code)
      await load()
      toast.success(`Аудио для ${code} удалено`)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось удалить аудио'))
    }
  }

  const handleDelete = async (l: WordLetter) => {
    const ok = await confirm({
      title: 'Удалить букву?',
      description: `Буква «${l.nameRu}» (${l.code}) и её аудио будут удалены без возможности восстановления.`,
      confirmLabel: 'Удалить букву',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteWordLetter(l.code)
      if (editCode === l.code) setDrawerOpen(false)
      await load()
      toast.success('Буква удалена')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось удалить букву'))
    }
  }

  const handleReorder = async (next: WordLetter[]) => {
    const renumbered = next.map((l, i) => ({ ...l, orderIndex: i + 1 }))
    setLetters(renumbered)
    setReordering(true)
    try {
      await Promise.all(renumbered.map((l) => updateWordLetter(l.code, { orderIndex: l.orderIndex })))
      toast.success('Порядок букв сохранён')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить порядок'))
      await load()
    } finally {
      setReordering(false)
    }
  }

  const nextOrder = letters.length ? Math.max(...letters.map((l) => l.orderIndex)) + 1 : 1

  const renderList = () => {
    if (initialLoading) return <LoadingState variant="list" rows={8} label="Загружаем алфавит…" />
    if (loadError && letters.length === 0) {
      return <ErrorState title="Не удалось загрузить алфавит" error={loadError} onRetry={load} retrying={refreshing} />
    }
    if (letters.length === 0) {
      return (
        <EmptyState
          title="В алфавите пока нет букв"
          description="Добавьте первую букву — она появится в разделе «Алфавит» приложения."
          action={
            <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
              Добавить букву
            </Button>
          }
        />
      )
    }
    if (visible.length === 0) {
      return (
        <EmptyState
          size="sm"
          title="Ничего не найдено"
          description="Измените запрос или сбросьте фильтры."
          action={<Button onClick={resetFilters}>Сбросить фильтры</Button>}
        />
      )
    }
    return (
      <SortableList
        items={visible}
        getId={(l) => l.code}
        disabled={filtersActive || reordering}
        onReorder={handleReorder}
        renderItem={(l, { handle, isDragging }) => (
          <LetterRow
            letter={l}
            dragging={isDragging}
            handle={<DragHandle handle={handle} label={`Перетащить букву ${l.nameRu}`} />}
            onOpen={() => openEdit(l)}
            onDelete={() => handleDelete(l)}
            onUploadAudio={(file) => handleUploadAudio(l.code, file)}
          />
        )}
      />
    )
  }

  return (
    <>
      <PageHeader
        title="Алфавит"
        subtitle="Буквы арабского алфавита: названия, формы в слове и аудио-произношение для приложения."
        actions={
          <>
            <Button variant="outlined" startIcon={<Refresh />} onClick={load} disabled={refreshing}>
              Обновить
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
              Добавить букву
            </Button>
          </>
        }
      />

      {letters.length > 0 && (
        <Toolbar
          hasActiveFilters={filtersActive}
          onReset={resetFilters}
          summary={
            filtersActive
              ? `Показано ${visible.length} из ${letters.length}`
              : `Всего ${letters.length}, без аудио ${withoutAudio}, без KZ ${withoutKz}`
          }
        >
          <SearchField value={q} onChange={setQ} placeholder="Название, код или буква" enableSlashShortcut />
          <TextField
            select
            size="small"
            label="Аудио"
            value={audioFilter}
            onChange={(e) => setAudioFilter(e.target.value as AudioFilter)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">Все</MenuItem>
            <MenuItem value="with">С аудио</MenuItem>
            <MenuItem value="without">Без аудио</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Казахский"
            value={kzFilter}
            onChange={(e) => setKzFilter(e.target.value as KzFilter)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="all">Все</MenuItem>
            <MenuItem value="missing">Не заполнен KZ</MenuItem>
          </TextField>
        </Toolbar>
      )}

      {letters.length > 1 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {filtersActive
            ? 'Сбросьте поиск и фильтры, чтобы менять порядок букв.'
            : 'Порядок в списке — порядок в приложении. Перетащите букву за ручку слева, чтобы переместить.'}
        </Typography>
      )}

      {renderList()}

      <LetterDrawer
        open={drawerOpen}
        letter={editLetter}
        nextOrder={nextOrder}
        saving={saving}
        onClose={() => setDrawerOpen(false)}
        onCreate={handleCreate}
        onSave={handleSave}
        onUploadAudio={handleUploadAudio}
        onDeleteAudio={handleDeleteAudio}
      />
    </>
  )
}

function LetterRow({
  letter: l,
  dragging,
  handle,
  onOpen,
  onDelete,
  onUploadAudio,
}: {
  letter: WordLetter
  dragging: boolean
  handle: ReactNode
  onOpen: () => void
  onDelete: () => void
  onUploadAudio: (file: File) => Promise<unknown>
}) {
  const forms = l.forms
  return (
    // Whole row opens the editor on click; keyboard users reach the same action via «Изменить».
    <Box
      onClick={onOpen}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.25, md: 2 },
        px: { xs: 1, sm: 1.5 },
        py: 1.25,
        borderRadius: 3,
        border: 1,
        borderColor: dragging ? 'primary.light' : 'divider',
        bgcolor: 'background.paper',
        boxShadow: dragging ? 4 : 'none',
        cursor: 'pointer',
        transition: 'background-color 120ms, border-color 120ms',
        '&:hover': { bgcolor: 'brand.bronzeSoft' },
      }}
    >
      {handle}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ width: 24, textAlign: 'right', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
        aria-label={`Порядок ${l.orderIndex}`}
      >
        {l.orderIndex}
      </Typography>
      <GlyphTile size={60}>
        <ArabicText size="xl" align="center" weight={500}>
          {l.arabic}
        </ArabicText>
      </GlyphTile>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="baseline" gap={1} flexWrap="wrap">
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {l.nameRu}
          </Typography>
          {l.nameKk && (
            <Typography variant="body2" color="text.secondary">
              {l.nameKk}
            </Typography>
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {l.code}
          {l.translit ? ` · ${l.translit}` : ''}
          {l.translitKk ? ` / ${l.translitKk}` : ''}
        </Typography>
        <Box sx={{ mt: 0.75, display: { xs: 'block', lg: 'none' } }}>
          <Completeness items={letterCompleteness(l)} />
        </Box>
      </Box>

      {forms && (
        <Stack direction="row" gap={1} sx={{ display: { xs: 'none', md: 'flex' } }} aria-label="Формы буквы">
          {FORM_LABELS.map((f) => (
            <GlyphTile key={f.key} size={40} caption={f.short} muted>
              <ArabicText size="md" align="center">
                {forms[f.key] || l.arabic}
              </ArabicText>
            </GlyphTile>
          ))}
        </Stack>
      )}

      <Box sx={{ display: { xs: 'none', lg: 'block' }, width: 190, flexShrink: 0 }}>
        <Completeness items={letterCompleteness(l)} />
      </Box>

      <Stack direction="row" alignItems="center" gap={0.5} sx={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <AudioPlayButton src={l.audioUrl} label={`буква ${l.nameRu}`} reserveSpace />
        <AudioUploadButton variant="icon" hasAudio={!!l.audioUrl} onUpload={onUploadAudio} itemLabel={l.nameRu} />
        <Tooltip title="Изменить">
          <IconButton size="small" aria-label={`Изменить букву ${l.nameRu}`} onClick={onOpen}>
            <EditOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Удалить">
          <IconButton size="small" aria-label={`Удалить букву ${l.nameRu}`} onClick={onDelete} sx={{ color: 'error.main' }}>
            <DeleteOutline fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  )
}
