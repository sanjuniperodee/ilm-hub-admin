import { useCallback, useEffect, useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import { Add, Refresh } from '@mui/icons-material'
import toast from 'react-hot-toast'
import {
  getIslamHajjSections,
  createIslamHajjSection,
  updateIslamHajjSection,
  deleteIslamHajjSection,
  getIslamHajjSectionDetails,
  createIslamHajjInstruction,
  updateIslamHajjInstruction,
  deleteIslamHajjInstruction,
  createIslamHajjPhrase,
  updateIslamHajjPhrase,
  deleteIslamHajjPhrase,
  uploadIslamHajjPhraseAudio,
  createIslamHajjChecklist,
  updateIslamHajjChecklist,
  deleteIslamHajjChecklist,
} from '../api/adminApi'
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatusChip, getErrorMessage, useConfirm } from '../components/ui'
import { DragHandle, SortableList } from './words/shared'
import { ChecklistDrawer, InstructionDrawer, PhraseDrawer, SectionDialog } from './islam/hajj/editors'
import { SectionDetail, type DetailTab } from './islam/hajj/SectionDetail'
import {
  emptyInstructionForm,
  formatItemTranslations,
  formatItems,
  instructionFormFrom,
  instructionPayload,
  parseItems,
  type ChecklistForm,
  type HajjChecklist,
  type HajjInstruction,
  type HajjPhrase,
  type HajjSection,
  type InstructionForm,
  type PhraseForm,
  type SectionDetails,
  type SectionForm,
} from './islam/hajj/model'

export default function IslamHajjGuidePage() {
  const confirm = useConfirm()
  const [sections, setSections] = useState<HajjSection[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailsMap, setDetailsMap] = useState<Record<string, SectionDetails>>({})
  const [detailsError, setDetailsError] = useState<Record<string, unknown>>({})
  const [reordering, setReordering] = useState(false)
  const [saving, setSaving] = useState(false)

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<HajjSection | null>(null)
  const [sectionForm, setSectionForm] = useState<SectionForm>({ code: '', titleRu: '', titleKz: '', emoji: '', orderIndex: 0 })

  const [instrDialogOpen, setInstrDialogOpen] = useState(false)
  const [editingInstr, setEditingInstr] = useState<HajjInstruction | null>(null)
  const [instrForm, setInstrForm] = useState<InstructionForm>(emptyInstructionForm(0, 0))
  const [currentSectionId, setCurrentSectionId] = useState('')

  const [phraseDialogOpen, setPhraseDialogOpen] = useState(false)
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null)
  const [phraseForm, setPhraseForm] = useState<PhraseForm>({ titleRu: '', titleKz: '', textAr: '', transliteration: '', translationRu: '', translationKz: '', orderIndex: 0 })

  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false)
  const [editingChecklist, setEditingChecklist] = useState<HajjChecklist | null>(null)
  const [checklistForm, setChecklistForm] = useState<ChecklistForm>({ titleRu: '', titleKz: '', emoji: '', itemsRu: '', itemsKz: '', orderIndex: 0, isActive: true })

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data } = await getIslamHajjSections()
      const list: HajjSection[] = data.sections || []
      setSections(list)
      setSelectedId((prev) => (prev && list.some((s) => s.id === prev) ? prev : list[0]?.id ?? null))
    } catch (e) {
      setLoadError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const loadDetails = useCallback(async (id: string) => {
    setDetailsError((prev) => ({ ...prev, [id]: null }))
    try {
      const { data } = await getIslamHajjSectionDetails(id)
      setDetailsMap((prev) => ({
        ...prev,
        [id]: {
          instructions: data.instructions || [],
          phrases: data.phrases || [],
          checklists: data.checklists || [],
        },
      }))
    } catch (e) {
      setDetailsError((prev) => ({ ...prev, [id]: e }))
    }
  }, [])

  // Details are fetched once per section when it is opened.
  useEffect(() => {
    if (selectedId && !detailsMap[selectedId]) loadDetails(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const selected = sections.find((s) => s.id === selectedId) ?? null
  const editingPhrase =
    editingPhraseId && currentSectionId ? detailsMap[currentSectionId]?.phrases.find((p) => p.id === editingPhraseId) ?? null : null

  /* ---------------- sections ---------------- */

  const openCreateSection = () => {
    setEditingSection(null)
    setSectionForm({ code: '', titleRu: '', titleKz: '', emoji: '', orderIndex: sections.length })
    setSectionDialogOpen(true)
  }
  const openEditSection = (s: HajjSection) => {
    setEditingSection(s)
    setSectionForm({ code: s.code, titleRu: s.titleRu, titleKz: s.titleKz || '', emoji: s.emoji, orderIndex: s.orderIndex })
    setSectionDialogOpen(true)
  }
  const saveSection = async () => {
    setSaving(true)
    try {
      if (editingSection) {
        await updateIslamHajjSection(editingSection.id, sectionForm)
        toast.success('Раздел сохранён')
      } else {
        await createIslamHajjSection(sectionForm)
        toast.success('Раздел создан')
      }
      setSectionDialogOpen(false)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить раздел'))
    } finally {
      setSaving(false)
    }
  }
  const handleDeleteSection = async (s: HajjSection) => {
    const ok = await confirm({
      title: 'Деактивировать раздел?',
      description: `Раздел «${s.titleRu}» со всеми инструкциями, фразами и чек-листами перестанет показываться в приложении.`,
      confirmLabel: 'Деактивировать',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteIslamHajjSection(s.id)
      toast.success('Раздел деактивирован')
      load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось деактивировать раздел'))
    }
  }

  const reorderSections = async (next: HajjSection[]) => {
    const previous = sections
    setSections(next.map((s, i) => ({ ...s, orderIndex: i })))
    setReordering(true)
    try {
      await Promise.all(next.map((s, i) => (s.orderIndex !== i ? updateIslamHajjSection(s.id, { orderIndex: i }) : null)))
      toast.success('Порядок разделов сохранён')
    } catch (e) {
      setSections(previous)
      toast.error(getErrorMessage(e, 'Не удалось сохранить порядок'))
      load()
    } finally {
      setReordering(false)
    }
  }

  /* ---------------- instructions ---------------- */

  const openCreateInstr = (sectionId: string) => {
    setCurrentSectionId(sectionId)
    setEditingInstr(null)
    const existing = detailsMap[sectionId]?.instructions || []
    setInstrForm(emptyInstructionForm(existing.length + 1, existing.length))
    setInstrDialogOpen(true)
  }
  const openEditInstr = (i: HajjInstruction) => {
    setCurrentSectionId(i.sectionId)
    setEditingInstr(i)
    setInstrForm(instructionFormFrom(i))
    setInstrDialogOpen(true)
  }
  const saveInstr = async () => {
    setSaving(true)
    try {
      const payload = instructionPayload(instrForm)
      if (editingInstr) {
        await updateIslamHajjInstruction(editingInstr.id, payload)
        toast.success('Инструкция сохранена')
      } else {
        await createIslamHajjInstruction(currentSectionId, payload)
        toast.success('Инструкция создана')
      }
      setInstrDialogOpen(false)
      await loadDetails(currentSectionId)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить инструкцию'))
    } finally {
      setSaving(false)
    }
  }
  const handleDeleteInstr = async (i: HajjInstruction) => {
    const ok = await confirm({
      title: 'Удалить инструкцию?',
      description: `Инструкция «${i.titleRu}» будет удалена без возможности восстановления.`,
      confirmLabel: 'Удалить инструкцию',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteIslamHajjInstruction(i.id)
      toast.success('Инструкция удалена')
      await loadDetails(i.sectionId)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось удалить инструкцию'))
    }
  }

  /* ---------------- phrases ---------------- */

  const openCreatePhrase = (sectionId: string) => {
    setCurrentSectionId(sectionId)
    setEditingPhraseId(null)
    const existing = detailsMap[sectionId]?.phrases || []
    setPhraseForm({ titleRu: '', titleKz: '', textAr: '', transliteration: '', translationRu: '', translationKz: '', orderIndex: existing.length })
    setPhraseDialogOpen(true)
  }
  const openEditPhrase = (p: HajjPhrase) => {
    setCurrentSectionId(p.sectionId)
    setEditingPhraseId(p.id)
    setPhraseForm({
      titleRu: p.titleRu || '',
      titleKz: p.titleKz || '',
      textAr: p.textAr,
      transliteration: p.transliteration || '',
      translationRu: p.translationRu,
      translationKz: p.translationKz || '',
      orderIndex: p.orderIndex,
    })
    setPhraseDialogOpen(true)
  }
  const savePhrase = async () => {
    setSaving(true)
    try {
      if (editingPhraseId) {
        await updateIslamHajjPhrase(editingPhraseId, phraseForm)
        toast.success('Фраза сохранена')
      } else {
        await createIslamHajjPhrase(currentSectionId, phraseForm)
        toast.success('Фраза создана')
      }
      setPhraseDialogOpen(false)
      await loadDetails(currentSectionId)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить фразу'))
    } finally {
      setSaving(false)
    }
  }
  const handleDeletePhrase = async (p: HajjPhrase) => {
    const ok = await confirm({
      title: 'Удалить фразу?',
      description: `Фраза «${p.titleRu || p.translationRu}» и её аудио будут удалены.`,
      confirmLabel: 'Удалить фразу',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteIslamHajjPhrase(p.id)
      toast.success('Фраза удалена')
      await loadDetails(p.sectionId)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось удалить фразу'))
    }
  }
  const handlePhraseAudioUpload = async (p: HajjPhrase, file: File) => {
    await uploadIslamHajjPhraseAudio(p.id, file)
    toast.success('Аудио загружено')
    await loadDetails(p.sectionId)
  }

  /* ---------------- checklists ---------------- */

  const openCreateChecklist = (sectionId: string) => {
    setCurrentSectionId(sectionId)
    setEditingChecklist(null)
    const existing = detailsMap[sectionId]?.checklists || []
    setChecklistForm({ titleRu: '', titleKz: '', emoji: '', itemsRu: '', itemsKz: '', orderIndex: existing.length, isActive: true })
    setChecklistDialogOpen(true)
  }
  const openEditChecklist = (c: HajjChecklist) => {
    setCurrentSectionId(c.sectionId)
    setEditingChecklist(c)
    setChecklistForm({
      titleRu: c.titleRu,
      titleKz: c.titleKz || '',
      emoji: c.emoji || '',
      itemsRu: formatItems(c.items),
      itemsKz: formatItemTranslations(c.items),
      orderIndex: c.orderIndex,
      isActive: c.isActive,
    })
    setChecklistDialogOpen(true)
  }
  const saveChecklist = async () => {
    setSaving(true)
    try {
      const payload = {
        titleRu: checklistForm.titleRu,
        titleKz: checklistForm.titleKz || null,
        emoji: checklistForm.emoji || null,
        items: parseItems(checklistForm.itemsRu, checklistForm.itemsKz),
        orderIndex: checklistForm.orderIndex,
        isActive: checklistForm.isActive,
      }
      if (editingChecklist) {
        await updateIslamHajjChecklist(editingChecklist.id, payload)
        toast.success('Чек-лист сохранён')
      } else {
        await createIslamHajjChecklist(currentSectionId, payload)
        toast.success('Чек-лист создан')
      }
      setChecklistDialogOpen(false)
      await loadDetails(currentSectionId)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить чек-лист'))
    } finally {
      setSaving(false)
    }
  }
  const handleDeleteChecklist = async (c: HajjChecklist) => {
    const ok = await confirm({
      title: 'Удалить чек-лист?',
      description: `Чек-лист «${c.titleRu}» и отметки пользователей по нему будут удалены.`,
      confirmLabel: 'Удалить чек-лист',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteIslamHajjChecklist(c.id)
      toast.success('Чек-лист удалён')
      await loadDetails(c.sectionId)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось удалить чек-лист'))
    }
  }

  /* ---------------- reorder inside a section ---------------- */

  const reorderItems = async (sectionId: string, tab: DetailTab, next: Array<{ id: string; orderIndex: number }>) => {
    const update =
      tab === 'instructions' ? updateIslamHajjInstruction : tab === 'phrases' ? updateIslamHajjPhrase : updateIslamHajjChecklist
    setDetailsMap((prev) => {
      const d = prev[sectionId]
      if (!d) return prev
      return { ...prev, [sectionId]: { ...d, [tab]: next.map((x, i) => ({ ...x, orderIndex: i })) } }
    })
    setReordering(true)
    try {
      await Promise.all(next.map((x, i) => (x.orderIndex !== i ? update(x.id, { orderIndex: i }) : null)))
      toast.success('Порядок сохранён')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить порядок'))
      await loadDetails(sectionId)
    } finally {
      setReordering(false)
    }
  }

  const renderSections = () => {
    if (loading && sections.length === 0) return <LoadingState variant="list" rows={5} label="Загружаем разделы…" />
    if (loadError && sections.length === 0) return <ErrorState title="Не удалось загрузить разделы" error={loadError} onRetry={load} />
    return (
      <Box sx={{ p: 0.75 }}>
        <SortableList
          items={sections}
          getId={(s) => s.id}
          disabled={reordering}
          gap={0.25}
          onReorder={reorderSections}
          renderItem={(s, { handle }) => {
            const active = s.id === selectedId
            return (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  pr: 1,
                  borderRadius: 2,
                  bgcolor: active ? 'brand.sand' : 'transparent',
                  '&:hover': { bgcolor: active ? 'brand.sand' : 'brand.bronzeSoft' },
                }}
              >
                <DragHandle handle={handle} label={`Перетащить раздел ${s.titleRu}`} />
                <Box
                  component="button"
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  aria-current={active ? 'true' : undefined}
                  sx={{
                    all: 'unset',
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    py: 1,
                    cursor: 'pointer',
                    borderRadius: 1,
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.light', outlineOffset: 2 },
                  }}
                >
                  <Box component="span" aria-hidden sx={{ fontSize: '1.25rem', width: 28, textAlign: 'center', flexShrink: 0 }}>
                    {s.emoji}
                  </Box>
                  <Box component="span" sx={{ minWidth: 0, flex: 1, display: 'block' }}>
                    <Typography component="span" variant="body1" sx={{ fontWeight: 600, display: 'block' }} noWrap>
                      {s.titleRu}
                    </Typography>
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {s.instructionsCount} инстр., {s.phrasesCount} фраз, {s.checklistsCount || 0} чек-л.
                    </Typography>
                  </Box>
                  {!s.isActive && <StatusChip status="inactive" label="Скрыт" />}
                </Box>
              </Box>
            )
          }}
        />
      </Box>
    )
  }

  const noSections = !loading && !loadError && sections.length === 0

  return (
    <>
      <PageHeader
        title="Хадж и Умра"
        subtitle="Путеводитель паломника: разделы с инструкциями, фразами и чек-листами."
        actions={
          <>
            <Button variant="outlined" startIcon={<Refresh />} onClick={load} disabled={loading}>
              Обновить
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={openCreateSection}>
              Добавить раздел
            </Button>
          </>
        }
      />

      {noSections ? (
        <SectionCard>
          <EmptyState
            title="Разделов пока нет"
            description="Раздел — этап пути: «В дороге», «В Мекке». Создайте первый или запустите seed:hajj-umrah."
            action={
              <Button variant="contained" startIcon={<Add />} onClick={openCreateSection}>
                Добавить раздел
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: '1fr', md: '300px minmax(0, 1fr)', xl: '340px minmax(0, 1fr)' },
            alignItems: 'start',
          }}
        >
          <SectionCard
            title="Разделы"
            description="Перетащите, чтобы изменить порядок"
            padding="none"
            sx={{ position: { md: 'sticky' }, top: { md: 80 } }}
          >
            {renderSections()}
          </SectionCard>
          <Stack sx={{ minWidth: 0 }}>
            {selected && (
              <SectionDetail
                section={selected}
                details={detailsMap[selected.id]}
                error={detailsError[selected.id]}
                reordering={reordering}
                onRetry={() => loadDetails(selected.id)}
                onEditSection={() => openEditSection(selected)}
                onDeleteSection={() => handleDeleteSection(selected)}
                onCreate={(tab) =>
                  tab === 'instructions' ? openCreateInstr(selected.id) : tab === 'phrases' ? openCreatePhrase(selected.id) : openCreateChecklist(selected.id)
                }
                onEditInstruction={openEditInstr}
                onDeleteInstruction={handleDeleteInstr}
                onEditPhrase={openEditPhrase}
                onDeletePhrase={handleDeletePhrase}
                onUploadPhraseAudio={handlePhraseAudioUpload}
                onEditChecklist={openEditChecklist}
                onDeleteChecklist={handleDeleteChecklist}
                onReorder={(tab, next) => reorderItems(selected.id, tab, next)}
              />
            )}
          </Stack>
        </Box>
      )}

      <SectionDialog
        open={sectionDialogOpen}
        isEdit={!!editingSection}
        form={sectionForm}
        saving={saving}
        onChange={setSectionForm}
        onClose={() => setSectionDialogOpen(false)}
        onSave={saveSection}
      />
      <InstructionDrawer
        open={instrDialogOpen}
        isEdit={!!editingInstr}
        form={instrForm}
        saving={saving}
        onChange={setInstrForm}
        onClose={() => setInstrDialogOpen(false)}
        onSave={saveInstr}
      />
      <PhraseDrawer
        open={phraseDialogOpen}
        isEdit={!!editingPhraseId}
        form={phraseForm}
        saving={saving}
        phrase={editingPhrase}
        onChange={setPhraseForm}
        onClose={() => setPhraseDialogOpen(false)}
        onSave={savePhrase}
        onUploadAudio={handlePhraseAudioUpload}
      />
      <ChecklistDrawer
        open={checklistDialogOpen}
        isEdit={!!editingChecklist}
        form={checklistForm}
        saving={saving}
        onChange={setChecklistForm}
        onClose={() => setChecklistDialogOpen(false)}
        onSave={saveChecklist}
      />
    </>
  )
}
