import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { Add, Audiotrack, Delete, Edit, Refresh } from '@mui/icons-material'
import {
  getIslamAllahNames,
  createIslamAllahName,
  updateIslamAllahName,
  deleteIslamAllahName,
  uploadIslamAllahNameAudio,
} from '../api/adminApi'
import { dialogActionsSafeAreaSx, useNarrowDialogProps } from '../hooks/useNarrowDialogProps'
import { pageTitleH4Sx } from '../utils/responsivePageSx'

interface AllahName {
  id: string
  number: number
  nameAr: string
  nameRu: string
  nameKz?: string | null
  transliteration: string
  meaningRu: string
  meaningKz?: string | null
  descriptionRu?: string | null
  descriptionKz?: string | null
  audioUrl?: string | null
  isActive: boolean
}

export default function IslamAllahNamesPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [names, setNames] = useState<AllahName[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AllahName | null>(null)
  const [form, setForm] = useState({
    number: 0,
    nameAr: '',
    nameRu: '',
    nameKz: '',
    transliteration: '',
    meaningRu: '',
    meaningKz: '',
    descriptionRu: '',
    descriptionKz: '',
  })
  const narrowFormSm = useNarrowDialogProps('sm')
  const themeMui = useTheme()
  const isNarrow = useMediaQuery(themeMui.breakpoints.down('md'))

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getIslamAllahNames()
      setNames(data.names || [])
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load names')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ number: (names.length || 0) + 1, nameAr: '', nameRu: '', nameKz: '', transliteration: '', meaningRu: '', meaningKz: '', descriptionRu: '', descriptionKz: '' })
    setDialogOpen(true)
  }

  const openEdit = (n: AllahName) => {
    setEditing(n)
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
    setError('')
    try {
      if (editing) {
        await updateIslamAllahName(editing.id, form)
        setSuccess('Имя обновлено')
      } else {
        await createIslamAllahName(form)
        setSuccess('Имя создано')
      }
      setDialogOpen(false)
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Save failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Деактивировать это имя?')) return
    try {
      await deleteIslamAllahName(id)
      setSuccess('Имя деактивировано')
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Delete failed')
    }
  }

  const handleAudioUpload = async (id: string, file: File) => {
    try {
      await uploadIslamAllahNameAudio(id, file)
      setSuccess('Аудио загружено')
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Upload failed')
    }
  }

  const handleToggleActive = async (n: AllahName) => {
    try {
      await updateIslamAllahName(n.id, { isActive: !n.isActive })
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Toggle failed')
    }
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} mb={3}>
        <Box>
          <Typography variant="h4" sx={pageTitleH4Sx}>
            99 имён Аллаха
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
            Управление именами Всевышнего
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, alignSelf: { xs: 'stretch', sm: 'auto' } }}>
          <Button startIcon={<Refresh />} onClick={load} disabled={loading} sx={{ width: { xs: '100%', sm: 'auto' } }}>Обновить</Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={{ width: { xs: '100%', sm: 'auto' } }}>Добавить</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {isNarrow ? (
        <Stack spacing={1.25}>
          {names.map((n) => (
            <Card key={n.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">№{n.number}</Typography>
                    <Typography sx={{ fontFamily: 'NotoSansArabic, serif', fontSize: '1.15rem' }}>{n.nameAr}</Typography>
                    <Typography fontWeight={700}>{n.nameRu}</Typography>
                    <Typography variant="body2" color="text.secondary">{n.transliteration}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{n.meaningRu}</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center" sx={{ mt: 1 }}>
                      {n.audioUrl ? (
                        <Chip label="Аудио" color="success" size="small" icon={<Audiotrack />} />
                      ) : (
                        <label>
                          <input type="file" accept="audio/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAudioUpload(n.id, f) }} />
                          <Chip label="Загрузить аудио" size="small" clickable variant="outlined" icon={<Audiotrack />} />
                        </label>
                      )}
                      <Chip
                        label={n.isActive ? 'Активно' : 'Скрыто'}
                        color={n.isActive ? 'success' : 'default'}
                        size="small"
                        onClick={() => handleToggleActive(n)}
                      />
                    </Stack>
                  </Box>
                  <Stack direction="row" flexShrink={0}>
                    <IconButton size="small" onClick={() => openEdit(n)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(n.id)}><Delete fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {names.length === 0 && !loading && (
            <Typography color="text.secondary" py={4} textAlign="center">Нет имён. Нажмите «Добавить» или запустите seed-скрипт.</Typography>
          )}
        </Stack>
      ) : (
        <Card>
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Арабский</TableCell>
                  <TableCell>Русский</TableCell>
                  <TableCell>Транслитерация</TableCell>
                  <TableCell>Значение</TableCell>
                  <TableCell>Аудио</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {names.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>{n.number}</TableCell>
                    <TableCell sx={{ fontFamily: 'NotoSansArabic, serif', fontSize: '1.1rem' }}>{n.nameAr}</TableCell>
                    <TableCell><strong>{n.nameRu}</strong></TableCell>
                    <TableCell>{n.transliteration}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" noWrap>{n.meaningRu}</Typography>
                    </TableCell>
                    <TableCell>
                      {n.audioUrl ? (
                        <Chip label="Есть" color="success" size="small" icon={<Audiotrack />} />
                      ) : (
                        <label>
                          <input type="file" accept="audio/*" hidden onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleAudioUpload(n.id, file)
                          }} />
                          <Chip label="Загрузить" size="small" clickable variant="outlined" icon={<Audiotrack />} />
                        </label>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={n.isActive ? 'Активно' : 'Скрыто'}
                        color={n.isActive ? 'success' : 'default'}
                        size="small"
                        onClick={() => handleToggleActive(n)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(n)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(n.id)}><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {names.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary" py={4}>Нет имён. Нажмите «Добавить» или запустите seed-скрипт.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} {...narrowFormSm}>
        <DialogTitle>{editing ? 'Редактировать имя' : 'Новое имя'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField label="Номер" type="number" value={form.number} onChange={(e) => setForm({ ...form, number: +e.target.value })} />
            <TextField label="Арабский" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            <TextField label="Русский" value={form.nameRu} onChange={(e) => setForm({ ...form, nameRu: e.target.value })} />
            <TextField label="Казахский" value={form.nameKz} onChange={(e) => setForm({ ...form, nameKz: e.target.value })} />
            <TextField label="Транслитерация" value={form.transliteration} onChange={(e) => setForm({ ...form, transliteration: e.target.value })} />
            <TextField label="Значение (рус)" value={form.meaningRu} onChange={(e) => setForm({ ...form, meaningRu: e.target.value })} />
            <TextField label="Значение (каз)" value={form.meaningKz} onChange={(e) => setForm({ ...form, meaningKz: e.target.value })} />
            <TextField label="Описание (рус)" multiline rows={3} value={form.descriptionRu} onChange={(e) => setForm({ ...form, descriptionRu: e.target.value })} />
            <TextField label="Описание (каз)" multiline rows={3} value={form.descriptionKz} onChange={(e) => setForm({ ...form, descriptionKz: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSave}>Сохранить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
