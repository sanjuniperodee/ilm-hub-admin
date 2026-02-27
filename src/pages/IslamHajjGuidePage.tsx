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
  Divider,
  IconButton,
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
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { Add, Audiotrack, Delete, Edit, ExpandLess, ExpandMore, Refresh } from '@mui/icons-material'
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
} from '../api/adminApi'

interface HajjSection {
  id: string; code: string; titleRu: string; titleKz?: string | null
  emoji: string; orderIndex: number; isActive: boolean
  instructionsCount: number; phrasesCount: number
}
interface HajjInstruction {
  id: string; sectionId: string; stepNumber?: number | null
  titleRu: string; titleKz?: string | null
  descriptionRu?: string | null; descriptionKz?: string | null
  isHighlight: boolean; orderIndex: number
}
interface HajjPhrase {
  id: string; sectionId: string; textAr: string
  transliteration?: string | null; translationRu: string
  translationKz?: string | null; audioUrl?: string | null; orderIndex: number
}

export default function IslamHajjGuidePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sections, setSections] = useState<HajjSection[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailsMap, setDetailsMap] = useState<Record<string, { instructions: HajjInstruction[]; phrases: HajjPhrase[] }>>({})

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<HajjSection | null>(null)
  const [sectionForm, setSectionForm] = useState({ code: '', titleRu: '', titleKz: '', emoji: '', orderIndex: 0 })

  const [instrDialogOpen, setInstrDialogOpen] = useState(false)
  const [editingInstr, setEditingInstr] = useState<HajjInstruction | null>(null)
  const [instrForm, setInstrForm] = useState({ stepNumber: 0, titleRu: '', titleKz: '', descriptionRu: '', descriptionKz: '', isHighlight: false, orderIndex: 0 })
  const [currentSectionId, setCurrentSectionId] = useState('')

  const [phraseDialogOpen, setPhraseDialogOpen] = useState(false)
  const [editingPhrase, setEditingPhrase] = useState<HajjPhrase | null>(null)
  const [phraseForm, setPhraseForm] = useState({ textAr: '', transliteration: '', translationRu: '', translationKz: '', orderIndex: 0 })

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
      setDetailsMap((prev) => ({ ...prev, [id]: { instructions: data.instructions || [], phrases: data.phrases || [] } }))
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
    setInstrForm({ stepNumber: existing.length + 1, titleRu: '', titleKz: '', descriptionRu: '', descriptionKz: '', isHighlight: false, orderIndex: existing.length })
    setInstrDialogOpen(true)
  }
  const openEditInstr = (i: HajjInstruction) => {
    setCurrentSectionId(i.sectionId); setEditingInstr(i)
    setInstrForm({ stepNumber: i.stepNumber || 0, titleRu: i.titleRu, titleKz: i.titleKz || '', descriptionRu: i.descriptionRu || '', descriptionKz: i.descriptionKz || '', isHighlight: i.isHighlight, orderIndex: i.orderIndex })
    setInstrDialogOpen(true)
  }
  const saveInstr = async () => {
    setError('')
    try {
      const payload = { ...instrForm, stepNumber: instrForm.stepNumber || null }
      if (editingInstr) { await updateIslamHajjInstruction(editingInstr.id, payload); setSuccess('Инструкция обновлена') }
      else { await createIslamHajjInstruction(currentSectionId, payload); setSuccess('Инструкция создана') }
      setInstrDialogOpen(false); await loadDetails(currentSectionId)
    } catch (e: any) { setError(e?.response?.data?.message || 'Save failed') }
  }
  const handleDeleteInstr = async (i: HajjInstruction) => {
    if (!confirm('Удалить инструкцию?')) return
    try { await deleteIslamHajjInstruction(i.id); setSuccess('Инструкция удалена'); await loadDetails(i.sectionId) }
    catch (e: any) { setError(e?.response?.data?.message || 'Delete failed') }
  }

  // Phrase CRUD
  const openCreatePhrase = (sectionId: string) => {
    setCurrentSectionId(sectionId); setEditingPhrase(null)
    const existing = detailsMap[sectionId]?.phrases || []
    setPhraseForm({ textAr: '', transliteration: '', translationRu: '', translationKz: '', orderIndex: existing.length })
    setPhraseDialogOpen(true)
  }
  const openEditPhrase = (p: HajjPhrase) => {
    setCurrentSectionId(p.sectionId); setEditingPhrase(p)
    setPhraseForm({ textAr: p.textAr, transliteration: p.transliteration || '', translationRu: p.translationRu, translationKz: p.translationKz || '', orderIndex: p.orderIndex })
    setPhraseDialogOpen(true)
  }
  const savePhrase = async () => {
    setError('')
    try {
      if (editingPhrase) { await updateIslamHajjPhrase(editingPhrase.id, phraseForm); setSuccess('Фраза обновлена') }
      else { await createIslamHajjPhrase(currentSectionId, phraseForm); setSuccess('Фраза создана') }
      setPhraseDialogOpen(false); await loadDetails(currentSectionId)
    } catch (e: any) { setError(e?.response?.data?.message || 'Save failed') }
  }
  const handleDeletePhrase = async (p: HajjPhrase) => {
    if (!confirm('Удалить фразу?')) return
    try { await deleteIslamHajjPhrase(p.id); setSuccess('Фраза удалена'); await loadDetails(p.sectionId) }
    catch (e: any) { setError(e?.response?.data?.message || 'Delete failed') }
  }
  const handlePhraseAudioUpload = async (id: string, sectionId: string, file: File) => {
    try { await uploadIslamHajjPhraseAudio(id, file); setSuccess('Аудио загружено'); await loadDetails(sectionId) }
    catch (e: any) { setError(e?.response?.data?.message || 'Upload failed') }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Хадж и Умра</Typography>
          <Typography variant="subtitle1">Путеводитель: секции, инструкции, фразы</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Refresh />} onClick={load} disabled={loading}>Обновить</Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreateSection}>Добавить секцию</Button>
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
                <TableCell>Эмодзи</TableCell>
                <TableCell>Название</TableCell>
                <TableCell>Код</TableCell>
                <TableCell>Инструкции</TableCell>
                <TableCell>Фразы</TableCell>
                <TableCell>Порядок</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sections.map((s) => {
                const details = detailsMap[s.id]
                return (
                  <>
                    <TableRow key={s.id} hover>
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
                      <TableCell>{s.orderIndex}</TableCell>
                      <TableCell>
                        <Chip label={s.isActive ? 'Акт.' : 'Скр.'} size="small" color={s.isActive ? 'success' : 'default'} />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEditSection(s)}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteSection(s.id)}><Delete fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow key={s.id + '-expand'}>
                      <TableCell colSpan={9} sx={{ py: 0, border: expandedId === s.id ? undefined : 'none' }}>
                        <Collapse in={expandedId === s.id} unmountOnExit>
                          <Box sx={{ py: 2, pl: 4 }}>
                            {/* Instructions */}
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                              <Typography variant="subtitle2">Инструкции</Typography>
                              <Button size="small" startIcon={<Add />} onClick={() => openCreateInstr(s.id)}>Добавить</Button>
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
                                {(details?.instructions || []).map((i) => (
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

                            {/* Phrases */}
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                              <Typography variant="subtitle2">Фразы</Typography>
                              <Button size="small" startIcon={<Add />} onClick={() => openCreatePhrase(s.id)}>Добавить</Button>
                            </Stack>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Арабский</TableCell>
                                  <TableCell>Транслит</TableCell>
                                  <TableCell>Перевод</TableCell>
                                  <TableCell>Аудио</TableCell>
                                  <TableCell align="right">Действия</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {(details?.phrases || []).map((p) => (
                                  <TableRow key={p.id}>
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
                                          <input type="file" accept="audio/*" hidden onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) handlePhraseAudioUpload(p.id, s.id, file)
                                          }} />
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
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </>
                )
              })}
              {sections.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography color="text.secondary" py={4}>Нет секций</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onClose={() => setSectionDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingSection ? 'Редактировать секцию' : 'Новая секция'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Код (on_road, in_mecca...)" value={sectionForm.code} onChange={(e) => setSectionForm({ ...sectionForm, code: e.target.value })} />
            <TextField label="Название (рус)" value={sectionForm.titleRu} onChange={(e) => setSectionForm({ ...sectionForm, titleRu: e.target.value })} />
            <TextField label="Название (каз)" value={sectionForm.titleKz} onChange={(e) => setSectionForm({ ...sectionForm, titleKz: e.target.value })} />
            <TextField label="Эмодзи" value={sectionForm.emoji} onChange={(e) => setSectionForm({ ...sectionForm, emoji: e.target.value })} />
            <TextField label="Порядок" type="number" value={sectionForm.orderIndex} onChange={(e) => setSectionForm({ ...sectionForm, orderIndex: +e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSectionDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={saveSection}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      {/* Instruction Dialog */}
      <Dialog open={instrDialogOpen} onClose={() => setInstrDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingInstr ? 'Редактировать инструкцию' : 'Новая инструкция'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Номер шага (0 = заметка)" type="number" value={instrForm.stepNumber} onChange={(e) => setInstrForm({ ...instrForm, stepNumber: +e.target.value })} />
            <TextField label="Заголовок (рус)" value={instrForm.titleRu} onChange={(e) => setInstrForm({ ...instrForm, titleRu: e.target.value })} />
            <TextField label="Заголовок (каз)" value={instrForm.titleKz} onChange={(e) => setInstrForm({ ...instrForm, titleKz: e.target.value })} />
            <TextField label="Описание (рус)" multiline rows={3} value={instrForm.descriptionRu} onChange={(e) => setInstrForm({ ...instrForm, descriptionRu: e.target.value })} />
            <TextField label="Описание (каз)" multiline rows={3} value={instrForm.descriptionKz} onChange={(e) => setInstrForm({ ...instrForm, descriptionKz: e.target.value })} />
            <FormControlLabel
              control={<Switch checked={instrForm.isHighlight} onChange={(e) => setInstrForm({ ...instrForm, isHighlight: e.target.checked })} />}
              label="Выделенная заметка"
            />
            <TextField label="Порядок" type="number" value={instrForm.orderIndex} onChange={(e) => setInstrForm({ ...instrForm, orderIndex: +e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstrDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={saveInstr}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      {/* Phrase Dialog */}
      <Dialog open={phraseDialogOpen} onClose={() => setPhraseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPhrase ? 'Редактировать фразу' : 'Новая фраза'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Арабский текст" multiline rows={2} value={phraseForm.textAr} onChange={(e) => setPhraseForm({ ...phraseForm, textAr: e.target.value })} inputProps={{ dir: 'rtl' }} />
            <TextField label="Транслитерация" value={phraseForm.transliteration} onChange={(e) => setPhraseForm({ ...phraseForm, transliteration: e.target.value })} />
            <TextField label="Перевод (рус)" value={phraseForm.translationRu} onChange={(e) => setPhraseForm({ ...phraseForm, translationRu: e.target.value })} />
            <TextField label="Перевод (каз)" value={phraseForm.translationKz} onChange={(e) => setPhraseForm({ ...phraseForm, translationKz: e.target.value })} />
            <TextField label="Порядок" type="number" value={phraseForm.orderIndex} onChange={(e) => setPhraseForm({ ...phraseForm, orderIndex: +e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhraseDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={savePhrase}>Сохранить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
