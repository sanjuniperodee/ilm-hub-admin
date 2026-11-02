import { useCallback, useEffect, useState } from 'react'
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { Add, DeleteOutline, EditOutlined, Refresh } from '@mui/icons-material'
import toast from 'react-hot-toast'
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
  deleteWordsDictionaryEntryAudio,
} from '../api/adminApi'
import {
  ArabicText,
  DataTable,
  EmptyState,
  PageHeader,
  SearchField,
  StatusChip,
  Toolbar,
  getErrorMessage,
  useConfirm,
  visuallyHidden,
  type DataTableColumn,
} from '../components/ui'
import { AudioPlayButton, Completeness } from './words/shared'
import { EntryDrawer } from './words/dictionary/EntryDrawer'
import { entryCompleteness, newEntry, type DictionaryEntry, type DictionaryExample } from './words/dictionary/model'

export default function WordsDictionaryPage() {
  const confirm = useConfirm()
  const [entries, setEntries] = useState<DictionaryEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [q, setQ] = useState('')
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<unknown>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<DictionaryEntry | null>(null)
  const [saving, setSaving] = useState(false)
  const [reorderingExamples, setReorderingExamples] = useState(false)
  const [addingExample, setAddingExample] = useState(false)

  const load = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const query = q.trim()
      const { data } = await getWordsDictionary({
        page: page + 1,
        limit: rowsPerPage,
        ...(query ? { q: query } : {}),
      })
      const list: DictionaryEntry[] = (data.data || data.entries || []).sort((a: DictionaryEntry, b: DictionaryEntry) =>
        a.arabic.localeCompare(b.arabic),
      )
      setEntries(list)
      setTotal(data.total ?? list.length)
    } catch (e) {
      setListError(e)
    } finally {
      setListLoading(false)
    }
  }, [page, rowsPerPage, q])

  useEffect(() => {
    load()
  }, [load])

  const openCreateDialog = () => {
    setEditingEntry(newEntry())
    setEditOpen(true)
  }

  const openEditDialog = async (id: string) => {
    setEditingEntry(null)
    setEditOpen(true)
    try {
      const { data } = await getWordsDictionaryEntry(id)
      const entry: DictionaryEntry = {
        ...data,
        examples: (data.examples || []).sort((a: any, b: any) => a.orderIndex - b.orderIndex),
      }
      setEditingEntry(entry)
    } catch (e) {
      setEditOpen(false)
      toast.error(getErrorMessage(e, 'Не удалось загрузить слово'))
    }
  }

  const closeEditor = () => setEditOpen(false)

  const handleSaveEntry = async () => {
    if (!editingEntry) return
    const { id } = editingEntry
    const entryPayload = {
      arabic: editingEntry.arabic,
      arabicPlural: editingEntry.arabicPlural?.trim() ? editingEntry.arabicPlural.trim() : null,
      translit: editingEntry.translit ?? null,
      translationRu: editingEntry.translationRu,
      translationKz: editingEntry.translationKz?.trim() ? editingEntry.translationKz : null,
      noteRu: editingEntry.noteRu ?? null,
      isActive: editingEntry.isActive,
    }
    setSaving(true)
    try {
      if (!id) {
        await createWordsDictionaryEntry(entryPayload)
      } else {
        // Auto-save all examples before updating the entry
        if (editingEntry.examples?.length) {
          await Promise.all(
            editingEntry.examples
              .filter((ex) => ex.id)
              .map((ex) =>
                updateWordsDictionaryExample(ex.id, {
                  arabicSentence: ex.arabicSentence,
                  translationRu: ex.translationRu,
                  translationKz: ex.translationKz ?? null,
                  orderIndex: ex.orderIndex,
                }),
              ),
          )
        }
        await updateWordsDictionaryEntry(id, entryPayload)
      }
      setEditOpen(false)
      await load()
      toast.success('Слово сохранено')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить слово'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEntry = async (entry: DictionaryEntry) => {
    const ok = await confirm({
      title: 'Удалить слово?',
      description: `Слово «${entry.translationRu}» и все его примеры будут удалены без возможности восстановления.`,
      confirmLabel: 'Удалить слово',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteWordsDictionaryEntry(entry.id)
      if (editingEntry?.id === entry.id) setEditOpen(false)
      await load()
      toast.success('Слово удалено')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось удалить слово'))
    }
  }

  const handleEntryFieldChange = (field: keyof DictionaryEntry, value: unknown) => {
    setEditingEntry((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleUploadEntryAudio = async (file: File) => {
    if (!editingEntry || !editingEntry.id) return
    const entryId = editingEntry.id
    const { data } = await uploadWordsDictionaryEntryAudio(entryId, file)
    setEditingEntry((prev) => (prev ? { ...prev, audioUrl: data.audioUrl } : prev))
    setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, audioUrl: data.audioUrl } : e)))
    toast.success('Аудио для слова загружено')
  }

  const handleDeleteEntryAudio = async () => {
    if (!editingEntry?.id) return
    const entryId = editingEntry.id
    const ok = await confirm({
      title: 'Удалить аудио?',
      description: `Произношение слова «${editingEntry.translationRu}» пропадёт из приложения.`,
      confirmLabel: 'Удалить аудио',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteWordsDictionaryEntryAudio(entryId)
      setEditingEntry((prev) => (prev ? { ...prev, audioUrl: null } : prev))
      setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, audioUrl: null } : e)))
      toast.success('Аудио удалено')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось удалить аудио'))
    }
  }

  const handleAddExample = async () => {
    if (!editingEntry || !editingEntry.id) return
    const orderIndex = editingEntry.examples?.length || 0
    setAddingExample(true)
    try {
      const { data } = await createWordsDictionaryExample(editingEntry.id, {
        arabicSentence: 'مثال',
        translationRu: 'Новый пример',
        translationKz: null,
        orderIndex,
      })
      setEditingEntry((prev) => (prev ? { ...prev, examples: [...(prev.examples || []), data] } : prev))
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось добавить пример'))
    } finally {
      setAddingExample(false)
    }
  }

  const handleExampleFieldChange = (id: string, field: keyof DictionaryExample, value: unknown) => {
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
      await updateWordsDictionaryExample(example.id, {
        arabicSentence: example.arabicSentence,
        translationRu: example.translationRu,
        translationKz: example.translationKz ?? null,
        orderIndex: example.orderIndex,
      })
      toast.success('Пример сохранён')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить пример'))
    }
  }

  const handleDeleteExample = async (example: DictionaryExample) => {
    if (!editingEntry) return
    const ok = await confirm({
      title: 'Удалить пример?',
      description: `«${example.translationRu}» и его аудио будут удалены.`,
      confirmLabel: 'Удалить пример',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteWordsDictionaryExample(example.id)
      setEditingEntry((prev) =>
        prev ? { ...prev, examples: (prev.examples || []).filter((ex) => ex.id !== example.id) } : prev,
      )
      toast.success('Пример удалён')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось удалить пример'))
    }
  }

  const handleUploadExampleAudio = async (exampleId: string, file: File) => {
    const { data } = await uploadWordsDictionaryExampleAudio(exampleId, file)
    setEditingEntry((prev) =>
      prev
        ? {
            ...prev,
            examples: (prev.examples || []).map((ex) => (ex.id === exampleId ? { ...ex, audioUrl: data.audioUrl } : ex)),
          }
        : prev,
    )
    toast.success('Аудио для примера загружено')
  }

  const handleReorderExamples = async (examplesOverride?: DictionaryExample[]) => {
    if (!editingEntry || !editingEntry.id) return
    const previous = editingEntry.examples ?? []
    const current = examplesOverride ?? previous
    if (current.length === 0) return
    // Show the new order immediately; roll back if the server rejects it.
    setEditingEntry((prev) => (prev ? { ...prev, examples: current } : prev))
    setReorderingExamples(true)
    try {
      await reorderWordsDictionaryExamples(editingEntry.id, current.map((ex) => ex.id))
      setEditingEntry((prev) =>
        prev ? { ...prev, examples: current.map((ex, index) => ({ ...ex, orderIndex: index })) } : prev,
      )
      toast.success('Порядок примеров сохранён')
    } catch (e) {
      setEditingEntry((prev) => (prev ? { ...prev, examples: previous } : prev))
      toast.error(getErrorMessage(e, 'Не удалось сохранить порядок'))
    } finally {
      setReorderingExamples(false)
    }
  }

  const columns: DataTableColumn<DictionaryEntry>[] = [
    {
      id: 'arabic',
      header: 'Слово',
      sortable: true,
      minWidth: 160,
      render: (e) => (
        <Box>
          <ArabicText size="md" weight={500} component="div">
            {e.arabic}
          </ArabicText>
          {e.arabicPlural?.trim() && (
            <Stack direction="row" gap={0.75} alignItems="baseline" justifyContent="flex-end">
              <ArabicText size="sm" muted>
                {e.arabicPlural}
              </ArabicText>
              <Typography variant="caption" color="text.secondary">
                мн.
              </Typography>
            </Stack>
          )}
        </Box>
      ),
    },
    {
      id: 'translit',
      header: 'Транскрипция',
      sortable: true,
      hideBelow: 'sm',
      render: (e) => e.translit || <Typography variant="body2" color="text.secondary">—</Typography>,
    },
    {
      id: 'translationRu',
      header: 'Перевод',
      sortable: true,
      minWidth: 200,
      render: (e) => (
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {e.translationRu}
          </Typography>
          {e.translationKz?.trim() ? (
            <Typography variant="body2" color="text.secondary">
              {e.translationKz}
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ color: 'warning.dark' }}>
              Нет перевода KZ
            </Typography>
          )}
          {e.noteRu?.trim() && (
            <Typography variant="caption" color="text.secondary" component="p">
              {e.noteRu}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'completeness',
      header: 'Заполнено',
      hideBelow: 'md',
      minWidth: 250,
      render: (e) => <Completeness items={entryCompleteness(e)} />,
    },
    {
      id: 'examples',
      header: 'Примеры',
      align: 'right',
      hideBelow: 'lg',
      sortable: true,
      sortValue: (e) => e.examples?.length ?? 0,
      render: (e) => e.examples?.length ?? 0,
    },
    {
      id: 'audio',
      header: 'Аудио',
      width: 72,
      render: (e) =>
        e.audioUrl ? (
          <AudioPlayButton src={e.audioUrl} label={e.translationRu} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            нет
          </Typography>
        ),
    },
    {
      id: 'isActive',
      header: 'Статус',
      hideBelow: 'lg',
      nowrap: true,
      render: (e) => <StatusChip status={e.isActive ? 'active' : 'inactive'} label={e.isActive ? 'Показывается' : 'Скрыто'} />,
    },
    {
      id: 'actions',
      header: <Box component="span" sx={visuallyHidden}>Действия</Box>,
      align: 'right',
      width: 96,
      render: (e) => (
        <Stack direction="row" justifyContent="flex-end" onClick={(ev) => ev.stopPropagation()}>
          <Tooltip title="Изменить">
            <IconButton size="small" aria-label={`Изменить слово ${e.translationRu}`} onClick={() => openEditDialog(e.id)}>
              <EditOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Удалить">
            <IconButton
              size="small"
              aria-label={`Удалить слово ${e.translationRu}`}
              onClick={() => handleDeleteEntry(e)}
              sx={{ color: 'error.main' }}
            >
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Словарь"
        subtitle="Слова с переводами, примерами и аудио для приложения."
        actions={
          <>
            <Button variant="outlined" startIcon={<Refresh />} onClick={load} disabled={listLoading}>
              Обновить
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
              Добавить слово
            </Button>
          </>
        }
      />

      <Toolbar
        hasActiveFilters={!!q}
        onReset={() => {
          setQ('')
          setPage(0)
        }}
        summary={!listLoading || entries.length ? (q ? `Найдено ${total}` : `Всего ${total}`) : undefined}
      >
        <SearchField
          value={q}
          onChange={(v) => {
            setQ(v)
            setPage(0)
          }}
          debounceMs={400}
          placeholder="Русский перевод или транскрипция"
          enableSlashShortcut
          sx={{ minWidth: { sm: 380 } }}
        />
      </Toolbar>

      <DataTable
        aria-label="Словарь"
        columns={columns}
        rows={entries}
        getRowId={(e) => e.id}
        loading={listLoading}
        error={listError}
        onRetry={load}
        onRowClick={(e) => openEditDialog(e.id)}
        selectedRowId={editOpen ? editingEntry?.id : null}
        rowsPerPageOptions={[25, 50, 100, 200]}
        pagination={{
          page,
          rowsPerPage,
          total,
          onPageChange: setPage,
          onRowsPerPageChange: setRowsPerPage,
        }}
        emptyState={
          q ? (
            <EmptyState
              size="sm"
              title="Ничего не найдено"
              description="Попробуйте другой перевод или транскрипцию."
              action={
                <Button
                  onClick={() => {
                    setQ('')
                    setPage(0)
                  }}
                >
                  Сбросить поиск
                </Button>
              }
            />
          ) : (
            <EmptyState
              size="sm"
              title="В словаре пока нет слов"
              description="Добавьте первое слово — его можно будет использовать в уроках и карточках."
              action={
                <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
                  Добавить слово
                </Button>
              }
            />
          )
        }
      />

      <EntryDrawer
        open={editOpen}
        entry={editingEntry}
        saving={saving}
        reorderingExamples={reorderingExamples}
        addingExample={addingExample}
        onClose={closeEditor}
        onChange={handleEntryFieldChange}
        onSave={handleSaveEntry}
        onUploadAudio={handleUploadEntryAudio}
        onDeleteAudio={handleDeleteEntryAudio}
        onAddExample={handleAddExample}
        onExampleChange={handleExampleFieldChange}
        onSaveExample={handleSaveExample}
        onDeleteExample={handleDeleteExample}
        onUploadExampleAudio={handleUploadExampleAudio}
        onReorderExamples={handleReorderExamples}
      />
    </>
  )
}
