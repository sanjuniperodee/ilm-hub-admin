import { Fragment, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
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
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { Add, Audiotrack, Checklist, Delete, Edit, ExpandLess, ExpandMore, Refresh } from '@mui/icons-material'
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
import { dialogActionsSafeAreaSx, useNarrowDialogProps } from '../hooks/useNarrowDialogProps'
import { pageTitleH4Sx } from '../utils/responsivePageSx'

interface HajjSection {
  id: string; code: string; titleRu: string; titleKz?: string | null
  emoji: string; orderIndex: number; isActive: boolean
  instructionsCount: number; phrasesCount: number; checklistsCount?: number
}
interface HajjChecklistItem {
  titleRu: string; titleKz?: string | null; isCheckedByDefault?: boolean
}
interface HajjInstruction {
  id: string; sectionId: string; stepNumber?: number | null
  titleRu: string; titleKz?: string | null
  descriptionRu?: string | null; descriptionKz?: string | null
  isHighlight: boolean; orderIndex: number
  items?: HajjChecklistItem[]
  badgeRu?: string | null; badgeKz?: string | null
  warningTitleRu?: string | null; warningTitleKz?: string | null
  warningItemsRu?: string[]; warningItemsKz?: string[]
  successTitleRu?: string | null; successTitleKz?: string | null
  successItemsRu?: string[]; successItemsKz?: string[]
}
interface HajjPhrase {
  id: string; sectionId: string; titleRu?: string | null; titleKz?: string | null; textAr: string
  transliteration?: string | null; translationRu: string
  translationKz?: string | null; audioUrl?: string | null; orderIndex: number
}
interface HajjChecklist {
  id: string; sectionId: string; titleRu: string; titleKz?: string | null
  emoji?: string | null; items: HajjChecklistItem[]; orderIndex: number; isActive: boolean
}

const formatItems = (items: HajjChecklistItem[] = []) =>
  items.map((item) => `${item.isCheckedByDefault ? '[x] ' : ''}${item.titleRu || ''}`).join('\n')

const formatItemTranslations = (items: HajjChecklistItem[] = []) =>
  items.map((item) => item.titleKz || '').join('\n')

const parseItems = (ruText: string, kzText = ''): HajjChecklistItem[] => {
  const kzLines = kzText.split('\n')
  return ruText
    .split('\n')
    .map((line, index) => {
      const trimmed = line.trim()
      if (!trimmed) return null
      const isCheckedByDefault = /^\[(x|х|v|✓)\]\s*/i.test(trimmed)
      return {
        titleRu: trimmed.replace(/^\[(x|х|v|✓)\]\s*/i, ''),
        titleKz: kzLines[index]?.trim() || null,
        isCheckedByDefault,
      }
    })
    .filter(Boolean) as HajjChecklistItem[]
}

const formatLines = (items: string[] = []) => items.join('\n')
const parseLines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean)

export default function IslamHajjGuidePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sections, setSections] = useState<HajjSection[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailsMap, setDetailsMap] = useState<Record<string, { instructions: HajjInstruction[]; phrases: HajjPhrase[]; checklists: HajjChecklist[] }>>({})

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<HajjSection | null>(null)
  const [sectionForm, setSectionForm] = useState({ code: '', titleRu: '', titleKz: '', emoji: '', orderIndex: 0 })

  const [instrDialogOpen, setInstrDialogOpen] = useState(false)
  const [editingInstr, setEditingInstr] = useState<HajjInstruction | null>(null)
  const [instrForm, setInstrForm] = useState({
    stepNumber: 0,
    titleRu: '',
    titleKz: '',
    descriptionRu: '',
    descriptionKz: '',
    isHighlight: false,
    itemsRu: '',
    itemsKz: '',
    badgeRu: '',
    badgeKz: '',
    warningTitleRu: '',
    warningTitleKz: '',
    warningItemsRu: '',
    warningItemsKz: '',
    successTitleRu: '',
    successTitleKz: '',
    successItemsRu: '',
    successItemsKz: '',
    orderIndex: 0,
  })
  const [currentSectionId, setCurrentSectionId] = useState('')

  const [phraseDialogOpen, setPhraseDialogOpen] = useState(false)
  const [editingPhrase, setEditingPhrase] = useState<HajjPhrase | null>(null)
  const [phraseForm, setPhraseForm] = useState({ titleRu: '', titleKz: '', textAr: '', transliteration: '', translationRu: '', translationKz: '', orderIndex: 0 })

  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false)
  const [editingChecklist, setEditingChecklist] = useState<HajjChecklist | null>(null)
  const [checklistForm, setChecklistForm] = useState({ titleRu: '', titleKz: '', emoji: '', itemsRu: '', itemsKz: '', orderIndex: 0, isActive: true })
  const narrowFormXs = useNarrowDialogProps('xs')
  const narrowFormSm = useNarrowDialogProps('sm')
  const muiTheme = useTheme()
  const isNarrow = useMediaQuery(muiTheme.breakpoints.down('md'))

  const load = async () => {
    setLoading(true); setError('')
    try {
      const { data } = await getIslamHajjSections()
      setSections(data.sections || [])
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to load sections') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const loadDetails = async (id: string) => {
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
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to load details') }
  }

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!detailsMap[id]) await loadDetails(id)
  }

  // Section CRUD
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
    setError('')
    try {
      if (editingSection) { await updateIslamHajjSection(editingSection.id, sectionForm); setSuccess('Секция обновлена') }
      else { await createIslamHajjSection(sectionForm); setSuccess('Секция создана') }
      setSectionDialogOpen(false); load()
    } catch (e: any) { setError(e?.response?.data?.message || 'Save failed') }
  }
  const handleDeleteSection = async (id: string) => {
    if (!confirm('Деактивировать секцию?')) return
    try { await deleteIslamHajjSection(id); setSuccess('Секция деактивирована'); load() }
    catch (e: any) { setError(e?.response?.data?.message || 'Delete failed') }
  }

  // Instruction CRUD
  const openCreateInstr = (sectionId: string) => {
    setCurrentSectionId(sectionId); setEditingInstr(null)
    const existing = detailsMap[sectionId]?.instructions || []
    setInstrForm({
      stepNumber: existing.length + 1,
      titleRu: '',
      titleKz: '',
      descriptionRu: '',
      descriptionKz: '',
      isHighlight: false,
      itemsRu: '',
      itemsKz: '',
      badgeRu: '',
      badgeKz: '',
      warningTitleRu: '',
      warningTitleKz: '',
      warningItemsRu: '',
      warningItemsKz: '',
      successTitleRu: '',
      successTitleKz: '',
      successItemsRu: '',
      successItemsKz: '',
      orderIndex: existing.length,
    })
    setInstrDialogOpen(true)
  }
  const openEditInstr = (i: HajjInstruction) => {
    setCurrentSectionId(i.sectionId); setEditingInstr(i)
    setInstrForm({
      stepNumber: i.stepNumber || 0,
      titleRu: i.titleRu,
      titleKz: i.titleKz || '',
      descriptionRu: i.descriptionRu || '',
      descriptionKz: i.descriptionKz || '',
      isHighlight: i.isHighlight,
      itemsRu: formatItems(i.items),
      itemsKz: formatItemTranslations(i.items),
      badgeRu: i.badgeRu || '',
      badgeKz: i.badgeKz || '',
      warningTitleRu: i.warningTitleRu || '',
      warningTitleKz: i.warningTitleKz || '',
      warningItemsRu: formatLines(i.warningItemsRu),
      warningItemsKz: formatLines(i.warningItemsKz),
      successTitleRu: i.successTitleRu || '',
      successTitleKz: i.successTitleKz || '',
      successItemsRu: formatLines(i.successItemsRu),
      successItemsKz: formatLines(i.successItemsKz),
      orderIndex: i.orderIndex,
    })
    setInstrDialogOpen(true)
  }
  const saveInstr = async () => {
    setError('')
    try {
      const payload = {
        stepNumber: instrForm.stepNumber || null,
        titleRu: instrForm.titleRu,
        titleKz: instrForm.titleKz || null,
        descriptionRu: instrForm.descriptionRu || null,
        descriptionKz: instrForm.descriptionKz || null,
        isHighlight: instrForm.isHighlight,
        items: parseItems(instrForm.itemsRu, instrForm.itemsKz),
        badgeRu: instrForm.badgeRu || null,
        badgeKz: instrForm.badgeKz || null,
        warningTitleRu: instrForm.warningTitleRu || null,
        warningTitleKz: instrForm.warningTitleKz || null,
        warningItemsRu: parseLines(instrForm.warningItemsRu),
        warningItemsKz: parseLines(instrForm.warningItemsKz),
        successTitleRu: instrForm.successTitleRu || null,
        successTitleKz: instrForm.successTitleKz || null,
        successItemsRu: parseLines(instrForm.successItemsRu),
        successItemsKz: parseLines(instrForm.successItemsKz),
        orderIndex: instrForm.orderIndex,
      }
      if (editingInstr) { await updateIslamHajjInstruction(editingInstr.id, payload); setSuccess('Инструкция обновлена') }
      else { await createIslamHajjInstruction(currentSectionId, payload); setSuccess('Инструкция создана') }
      setInstrDialogOpen(false); await loadDetails(currentSectionId); load()
    } catch (e: any) { setError(e?.response?.data?.message || 'Save failed') }
  }
  const handleDeleteInstr = async (i: HajjInstruction) => {
    if (!confirm('Удалить инструкцию?')) return
    try { await deleteIslamHajjInstruction(i.id); setSuccess('Инструкция удалена'); await loadDetails(i.sectionId); load() }
    catch (e: any) { setError(e?.response?.data?.message || 'Delete failed') }
  }

  // Phrase CRUD
  const openCreatePhrase = (sectionId: string) => {
    setCurrentSectionId(sectionId); setEditingPhrase(null)
    const existing = detailsMap[sectionId]?.phrases || []
    setPhraseForm({ titleRu: '', titleKz: '', textAr: '', transliteration: '', translationRu: '', translationKz: '', orderIndex: existing.length })
    setPhraseDialogOpen(true)
  }
  const openEditPhrase = (p: HajjPhrase) => {
    setCurrentSectionId(p.sectionId); setEditingPhrase(p)
    setPhraseForm({ titleRu: p.titleRu || '', titleKz: p.titleKz || '', textAr: p.textAr, transliteration: p.transliteration || '', translationRu: p.translationRu, translationKz: p.translationKz || '', orderIndex: p.orderIndex })
    setPhraseDialogOpen(true)
  }
  const savePhrase = async () => {
    setError('')
    try {
      if (editingPhrase) { await updateIslamHajjPhrase(editingPhrase.id, phraseForm); setSuccess('Фраза обновлена') }
      else { await createIslamHajjPhrase(currentSectionId, phraseForm); setSuccess('Фраза создана') }
      setPhraseDialogOpen(false); await loadDetails(currentSectionId); load()
    } catch (e: any) { setError(e?.response?.data?.message || 'Save failed') }
  }
  const handleDeletePhrase = async (p: HajjPhrase) => {
    if (!confirm('Удалить фразу?')) return
    try { await deleteIslamHajjPhrase(p.id); setSuccess('Фраза удалена'); await loadDetails(p.sectionId); load() }
    catch (e: any) { setError(e?.response?.data?.message || 'Delete failed') }
  }
  const handlePhraseAudioUpload = async (id: string, sectionId: string, file: File) => {
    try { await uploadIslamHajjPhraseAudio(id, file); setSuccess('Аудио загружено'); await loadDetails(sectionId) }
    catch (e: any) { setError(e?.response?.data?.message || 'Upload failed') }
  }

  // Checklist CRUD
  const openCreateChecklist = (sectionId: string) => {
    setCurrentSectionId(sectionId); setEditingChecklist(null)
    const existing = detailsMap[sectionId]?.checklists || []
    setChecklistForm({ titleRu: '', titleKz: '', emoji: '', itemsRu: '', itemsKz: '', orderIndex: existing.length, isActive: true })
    setChecklistDialogOpen(true)
  }
  const openEditChecklist = (c: HajjChecklist) => {
    setCurrentSectionId(c.sectionId); setEditingChecklist(c)
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
    setError('')
    try {
      const payload = {
        titleRu: checklistForm.titleRu,
        titleKz: checklistForm.titleKz || null,
        emoji: checklistForm.emoji || null,
        items: parseItems(checklistForm.itemsRu, checklistForm.itemsKz),
        orderIndex: checklistForm.orderIndex,
        isActive: checklistForm.isActive,
      }
      if (editingChecklist) { await updateIslamHajjChecklist(editingChecklist.id, payload); setSuccess('Чек-лист обновлён') }
      else { await createIslamHajjChecklist(currentSectionId, payload); setSuccess('Чек-лист создан') }
      setChecklistDialogOpen(false); await loadDetails(currentSectionId); load()
    } catch (e: any) { setError(e?.response?.data?.message || 'Save failed') }
  }
  const handleDeleteChecklist = async (c: HajjChecklist) => {
    if (!confirm('Удалить чек-лист?')) return
    try { await deleteIslamHajjChecklist(c.id); setSuccess('Чек-лист удалён'); await loadDetails(c.sectionId); load() }
    catch (e: any) { setError(e?.response?.data?.message || 'Delete failed') }
  }

  const renderSectionExpanded = (s: HajjSection) => {
    const details = detailsMap[s.id]
    const instr = details?.instructions || []
    const phr = details?.phrases || []
    const checklists = details?.checklists || []
    if (isNarrow) {
      return (
        <Box sx={{ py: 1, px: { xs: 0, sm: 0.5 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} mb={1}>
            <Typography variant="subtitle2">Инструкции</Typography>
            <Button size="small" startIcon={<Add />} onClick={() => openCreateInstr(s.id)}>Добавить</Button>
          </Stack>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {instr.map((i) => (
              <Paper key={i.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">Шаг: {i.stepNumber ?? '—'}</Typography>
                      {i.isHighlight ? <Chip label="Заметка" size="small" color="warning" /> : <Chip label="Шаг" size="small" />}
                    </Stack>
                    <Typography fontWeight={600}>{i.titleRu}</Typography>
                    {i.descriptionRu ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{i.descriptionRu}</Typography> : null}
                  </Box>
                  <Stack direction="row" flexShrink={0}>
                    <IconButton size="small" onClick={() => openEditInstr(i)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteInstr(i)}><Delete fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
          <Divider sx={{ my: 1.5 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} mb={1}>
            <Typography variant="subtitle2">Фразы</Typography>
            <Button size="small" startIcon={<Add />} onClick={() => openCreatePhrase(s.id)}>Добавить</Button>
          </Stack>
          <Stack spacing={1}>
            {phr.map((p) => (
              <Paper key={p.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'Noto Sans Arabic, NotoSansArabic, serif', direction: 'rtl' }}>{p.textAr}</Typography>
                    {p.transliteration ? <Typography variant="body2" color="text.secondary">{p.transliteration}</Typography> : null}
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{p.translationRu}</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {p.audioUrl ? (
                        <Chip label="Аудио" color="success" size="small" icon={<Audiotrack />} />
                      ) : (
                        <label>
                          <input type="file" accept="audio/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhraseAudioUpload(p.id, s.id, f) }} />
                          <Chip label="Загрузить" size="small" clickable variant="outlined" icon={<Audiotrack />} />
                        </label>
                      )}
                    </Box>
                  </Box>
                  <Stack direction="row" flexShrink={0}>
                    <IconButton size="small" onClick={() => openEditPhrase(p)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeletePhrase(p)}><Delete fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
          <Divider sx={{ my: 1.5 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} mb={1}>
            <Typography variant="subtitle2">Чек-листы</Typography>
            <Button size="small" startIcon={<Add />} onClick={() => openCreateChecklist(s.id)}>Добавить</Button>
          </Stack>
          <Stack spacing={1}>
            {checklists.map((c) => (
              <Paper key={c.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" gap={1} alignItems="center">
                      {c.emoji ? <Typography>{c.emoji}</Typography> : <Checklist fontSize="small" color="action" />}
                      <Typography fontWeight={600}>{c.titleRu}</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">{c.items?.length || 0} пунктов</Typography>
                  </Box>
                  <Stack direction="row" flexShrink={0}>
                    <IconButton size="small" onClick={() => openEditChecklist(c)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteChecklist(c)}><Delete fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      )
    }
    return (
      <Box sx={{ py: 2, pl: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} mb={1}>
          <Typography variant="subtitle2">Инструкции</Typography>
          <Button size="small" startIcon={<Add />} onClick={() => openCreateInstr(s.id)} sx={{ alignSelf: 'flex-start' }}>Добавить</Button>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Шаг</TableCell>
              <TableCell>Заголовок</TableCell>
              <TableCell>Описание</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {instr.map((i) => (
              <TableRow key={i.id}>
                <TableCell>{i.stepNumber ?? '—'}</TableCell>
                <TableCell><strong>{i.titleRu}</strong></TableCell>
                <TableCell sx={{ maxWidth: 250 }}><Typography variant="body2" noWrap>{i.descriptionRu}</Typography></TableCell>
                <TableCell>{i.isHighlight ? <Chip label="Заметка" size="small" color="warning" /> : <Chip label="Шаг" size="small" />}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEditInstr(i)}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDeleteInstr(i)}><Delete fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Divider sx={{ my: 2 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} mb={1}>
          <Typography variant="subtitle2">Фразы</Typography>
          <Button size="small" startIcon={<Add />} onClick={() => openCreatePhrase(s.id)}>Добавить</Button>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Арабский</TableCell>
              <TableCell>Транслит</TableCell>
              <TableCell>Перевод</TableCell>
              <TableCell>Аудио</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {phr.map((p) => (
              <TableRow key={p.id}>
                <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" noWrap>{p.titleRu || '—'}</Typography></TableCell>
                <TableCell sx={{ fontFamily: 'NotoSansArabic, serif', direction: 'rtl', maxWidth: 200 }}>
                  <Typography variant="body2" noWrap>{p.textAr}</Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 150 }}><Typography variant="body2" noWrap>{p.transliteration}</Typography></TableCell>
                <TableCell sx={{ maxWidth: 200 }}><Typography variant="body2" noWrap>{p.translationRu}</Typography></TableCell>
                <TableCell>
                  {p.audioUrl ? (
                    <Chip label="Есть" color="success" size="small" icon={<Audiotrack />} />
                  ) : (
                    <label>
                      <input type="file" accept="audio/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) handlePhraseAudioUpload(p.id, s.id, file) }} />
                      <Chip label="Загрузить" size="small" clickable variant="outlined" icon={<Audiotrack />} />
                    </label>
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEditPhrase(p)}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDeletePhrase(p)}><Delete fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Divider sx={{ my: 2 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} mb={1}>
          <Typography variant="subtitle2">Чек-листы</Typography>
          <Button size="small" startIcon={<Add />} onClick={() => openCreateChecklist(s.id)}>Добавить</Button>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Эмодзи</TableCell>
              <TableCell>Пункты</TableCell>
              <TableCell>Порядок</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {checklists.map((c) => (
              <TableRow key={c.id}>
                <TableCell><strong>{c.titleRu}</strong></TableCell>
                <TableCell>{c.emoji || '—'}</TableCell>
                <TableCell>{c.items?.length || 0}</TableCell>
                <TableCell>{c.orderIndex}</TableCell>
                <TableCell><Chip label={c.isActive ? 'Акт.' : 'Скр.'} size="small" color={c.isActive ? 'success' : 'default'} /></TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEditChecklist(c)}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDeleteChecklist(c)}><Delete fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    )
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} mb={3}>
        <Box>
          <Typography variant="h4" sx={pageTitleH4Sx}>Хадж и Умра</Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Путеводитель: секции, инструкции, фразы, чек-листы</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, alignSelf: { xs: 'stretch', sm: 'auto' } }}>
          <Button startIcon={<Refresh />} onClick={load} disabled={loading} sx={{ width: { xs: '100%', sm: 'auto' } }}>Обновить</Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreateSection} sx={{ width: { xs: '100%', sm: 'auto' } }}>Добавить секцию</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {isNarrow ? (
        <Stack spacing={1.5}>
          {sections.map((s) => (
            <Card key={s.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="flex-start" spacing={1}>
                  <IconButton size="small" onClick={() => toggleExpand(s.id)} aria-label="Развернуть">
                    {expandedId === s.id ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                  </IconButton>
                  <Typography sx={{ fontSize: '1.35rem', lineHeight: 1 }}>{s.emoji}</Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700}>{s.titleRu}</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                      <Chip label={s.code} size="small" />
                      <Typography variant="caption" color="text.secondary">Пор. {s.orderIndex} · {s.instructionsCount} инстр. · {s.phrasesCount} фр. · {s.checklistsCount || 0} чек.</Typography>
                    </Stack>
                    <Chip label={s.isActive ? 'Активна' : 'Скрыта'} size="small" color={s.isActive ? 'success' : 'default'} sx={{ mt: 0.5 }} />
                  </Box>
                  <Stack direction="row" flexShrink={0}>
                    <IconButton size="small" onClick={() => openEditSection(s)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteSection(s.id)}><Delete fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
              </CardContent>
              <Collapse in={expandedId === s.id} unmountOnExit>
                <Box sx={{ px: 1.5, pb: 1.5, pt: 0, borderTop: 1, borderColor: 'divider' }}>{renderSectionExpanded(s)}</Box>
              </Collapse>
            </Card>
          ))}
          {sections.length === 0 && !loading && (
            <Typography color="text.secondary" py={4} textAlign="center">Нет секций</Typography>
          )}
        </Stack>
      ) : (
        <Card>
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={40} />
                  <TableCell>Эмодзи</TableCell>
                  <TableCell>Название</TableCell>
                  <TableCell>Код</TableCell>
                  <TableCell>Инструкции</TableCell>
                  <TableCell>Фразы</TableCell>
                  <TableCell>Чек-листы</TableCell>
                  <TableCell>Порядок</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sections.map((s) => (
                  <Fragment key={s.id}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton size="small" onClick={() => toggleExpand(s.id)}>
                          {expandedId === s.id ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ fontSize: '1.3rem' }}>{s.emoji}</TableCell>
                      <TableCell><strong>{s.titleRu}</strong></TableCell>
                      <TableCell><Chip label={s.code} size="small" /></TableCell>
                      <TableCell>{s.instructionsCount}</TableCell>
                      <TableCell>{s.phrasesCount}</TableCell>
                      <TableCell>{s.checklistsCount || 0}</TableCell>
                      <TableCell>{s.orderIndex}</TableCell>
                      <TableCell>
                        <Chip label={s.isActive ? 'Акт.' : 'Скр.'} size="small" color={s.isActive ? 'success' : 'default'} />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEditSection(s)}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteSection(s.id)}><Delete fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={10} sx={{ py: 0, border: expandedId === s.id ? undefined : 'none' }}>
                        <Collapse in={expandedId === s.id} unmountOnExit>
                          {renderSectionExpanded(s)}
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
                {sections.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography color="text.secondary" py={4}>Нет секций</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onClose={() => setSectionDialogOpen(false)} {...narrowFormXs}>
        <DialogTitle>{editingSection ? 'Редактировать секцию' : 'Новая секция'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField label="Код (on_road, in_mecca...)" value={sectionForm.code} onChange={(e) => setSectionForm({ ...sectionForm, code: e.target.value })} />
            <TextField label="Название (рус)" value={sectionForm.titleRu} onChange={(e) => setSectionForm({ ...sectionForm, titleRu: e.target.value })} />
            <TextField label="Название (каз)" value={sectionForm.titleKz} onChange={(e) => setSectionForm({ ...sectionForm, titleKz: e.target.value })} />
            <TextField label="Эмодзи" value={sectionForm.emoji} onChange={(e) => setSectionForm({ ...sectionForm, emoji: e.target.value })} />
            <TextField label="Порядок" type="number" value={sectionForm.orderIndex} onChange={(e) => setSectionForm({ ...sectionForm, orderIndex: +e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={() => setSectionDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={saveSection}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      {/* Instruction Dialog */}
      <Dialog open={instrDialogOpen} onClose={() => setInstrDialogOpen(false)} {...narrowFormSm}>
        <DialogTitle>{editingInstr ? 'Редактировать инструкцию' : 'Новая инструкция'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField label="Номер шага (0 = заметка)" type="number" value={instrForm.stepNumber} onChange={(e) => setInstrForm({ ...instrForm, stepNumber: +e.target.value })} />
            <TextField label="Заголовок (рус)" value={instrForm.titleRu} onChange={(e) => setInstrForm({ ...instrForm, titleRu: e.target.value })} />
            <TextField label="Заголовок (каз)" value={instrForm.titleKz} onChange={(e) => setInstrForm({ ...instrForm, titleKz: e.target.value })} />
            <TextField label="Описание (рус)" multiline rows={3} value={instrForm.descriptionRu} onChange={(e) => setInstrForm({ ...instrForm, descriptionRu: e.target.value })} />
            <TextField label="Описание (каз)" multiline rows={3} value={instrForm.descriptionKz} onChange={(e) => setInstrForm({ ...instrForm, descriptionKz: e.target.value })} />
            <TextField label="Пункты инструкции (рус), по строке; [x] = отмечено" multiline rows={4} value={instrForm.itemsRu} onChange={(e) => setInstrForm({ ...instrForm, itemsRu: e.target.value })} />
            <TextField label="Пункты инструкции (каз), по строке" multiline rows={4} value={instrForm.itemsKz} onChange={(e) => setInstrForm({ ...instrForm, itemsKz: e.target.value })} />
            <TextField label="Бейдж (рус), например Новое" value={instrForm.badgeRu} onChange={(e) => setInstrForm({ ...instrForm, badgeRu: e.target.value })} />
            <TextField label="Бейдж (каз)" value={instrForm.badgeKz} onChange={(e) => setInstrForm({ ...instrForm, badgeKz: e.target.value })} />
            <TextField label="Заголовок предупреждения (рус)" value={instrForm.warningTitleRu} onChange={(e) => setInstrForm({ ...instrForm, warningTitleRu: e.target.value })} />
            <TextField label="Заголовок предупреждения (каз)" value={instrForm.warningTitleKz} onChange={(e) => setInstrForm({ ...instrForm, warningTitleKz: e.target.value })} />
            <TextField label="Пункты предупреждения (рус), по строке" multiline rows={3} value={instrForm.warningItemsRu} onChange={(e) => setInstrForm({ ...instrForm, warningItemsRu: e.target.value })} />
            <TextField label="Пункты предупреждения (каз), по строке" multiline rows={3} value={instrForm.warningItemsKz} onChange={(e) => setInstrForm({ ...instrForm, warningItemsKz: e.target.value })} />
            <TextField label="Заголовок разрешённого (рус)" value={instrForm.successTitleRu} onChange={(e) => setInstrForm({ ...instrForm, successTitleRu: e.target.value })} />
            <TextField label="Заголовок разрешённого (каз)" value={instrForm.successTitleKz} onChange={(e) => setInstrForm({ ...instrForm, successTitleKz: e.target.value })} />
            <TextField label="Пункты разрешённого (рус), по строке" multiline rows={3} value={instrForm.successItemsRu} onChange={(e) => setInstrForm({ ...instrForm, successItemsRu: e.target.value })} />
            <TextField label="Пункты разрешённого (каз), по строке" multiline rows={3} value={instrForm.successItemsKz} onChange={(e) => setInstrForm({ ...instrForm, successItemsKz: e.target.value })} />
            <FormControlLabel
              control={<Switch checked={instrForm.isHighlight} onChange={(e) => setInstrForm({ ...instrForm, isHighlight: e.target.checked })} />}
              label="Выделенная заметка"
            />
            <TextField label="Порядок" type="number" value={instrForm.orderIndex} onChange={(e) => setInstrForm({ ...instrForm, orderIndex: +e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={() => setInstrDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={saveInstr}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      {/* Phrase Dialog */}
      <Dialog open={phraseDialogOpen} onClose={() => setPhraseDialogOpen(false)} {...narrowFormSm}>
        <DialogTitle>{editingPhrase ? 'Редактировать фразу' : 'Новая фраза'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField label="Название (рус)" value={phraseForm.titleRu} onChange={(e) => setPhraseForm({ ...phraseForm, titleRu: e.target.value })} />
            <TextField label="Название (каз)" value={phraseForm.titleKz} onChange={(e) => setPhraseForm({ ...phraseForm, titleKz: e.target.value })} />
            <TextField label="Арабский текст" multiline rows={2} value={phraseForm.textAr} onChange={(e) => setPhraseForm({ ...phraseForm, textAr: e.target.value })} inputProps={{ dir: 'rtl' }} />
            <TextField label="Транслитерация" value={phraseForm.transliteration} onChange={(e) => setPhraseForm({ ...phraseForm, transliteration: e.target.value })} />
            <TextField label="Перевод (рус)" value={phraseForm.translationRu} onChange={(e) => setPhraseForm({ ...phraseForm, translationRu: e.target.value })} />
            <TextField label="Перевод (каз)" value={phraseForm.translationKz} onChange={(e) => setPhraseForm({ ...phraseForm, translationKz: e.target.value })} />
            <TextField label="Порядок" type="number" value={phraseForm.orderIndex} onChange={(e) => setPhraseForm({ ...phraseForm, orderIndex: +e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={() => setPhraseDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={savePhrase}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      {/* Checklist Dialog */}
      <Dialog open={checklistDialogOpen} onClose={() => setChecklistDialogOpen(false)} {...narrowFormSm}>
        <DialogTitle>{editingChecklist ? 'Редактировать чек-лист' : 'Новый чек-лист'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField label="Название (рус)" value={checklistForm.titleRu} onChange={(e) => setChecklistForm({ ...checklistForm, titleRu: e.target.value })} />
            <TextField label="Название (каз)" value={checklistForm.titleKz} onChange={(e) => setChecklistForm({ ...checklistForm, titleKz: e.target.value })} />
            <TextField label="Эмодзи" value={checklistForm.emoji} onChange={(e) => setChecklistForm({ ...checklistForm, emoji: e.target.value })} />
            <TextField label="Пункты (рус), по строке; [x] = отмечено" multiline rows={6} value={checklistForm.itemsRu} onChange={(e) => setChecklistForm({ ...checklistForm, itemsRu: e.target.value })} />
            <TextField label="Пункты (каз), по строке" multiline rows={6} value={checklistForm.itemsKz} onChange={(e) => setChecklistForm({ ...checklistForm, itemsKz: e.target.value })} />
            <TextField label="Порядок" type="number" value={checklistForm.orderIndex} onChange={(e) => setChecklistForm({ ...checklistForm, orderIndex: +e.target.value })} />
            <FormControlLabel
              control={<Switch checked={checklistForm.isActive} onChange={(e) => setChecklistForm({ ...checklistForm, isActive: e.target.checked })} />}
              label="Активен"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={() => setChecklistDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={saveChecklist}>Сохранить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
