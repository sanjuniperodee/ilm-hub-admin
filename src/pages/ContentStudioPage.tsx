import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  Add,
  AutoAwesome,
  Edit as EditIcon,
  LibraryBooksOutlined,
  MenuBookOutlined,
  SchoolOutlined,
  QuizOutlined,
} from '@mui/icons-material'
import {
  createCourse,
  createLesson,
  createModule,
  getCourses,
  getLessons,
  getModules,
} from '../api/adminApi'

interface StudioCourse {
  id: string
  code: string
  titleRu: string
  orderIndex: number
}

interface StudioModule {
  id: string
  courseId: string
  titleRu: string
  orderIndex: number
}

interface StudioLesson {
  id: string
  courseId: string
  moduleId?: string
  titleRu: string
  orderIndex: number
}

export default function ContentStudioPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [courses, setCourses] = useState<StudioCourse[]>([])
  const [modules, setModules] = useState<StudioModule[]>([])
  const [lessons, setLessons] = useState<StudioLesson[]>([])

  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState('')

  const [createCourseOpen, setCreateCourseOpen] = useState(false)
  const [createModuleOpen, setCreateModuleOpen] = useState(false)
  const [createLessonOpen, setCreateLessonOpen] = useState(false)

  const [newCourse, setNewCourse] = useState({ code: '', titleRu: '', orderIndex: 0, descriptionRu: '' })
  const [newModule, setNewModule] = useState({ titleRu: '', orderIndex: 0, descriptionRu: '' })
  const [newLesson, setNewLesson] = useState({ titleRu: '', orderIndex: 0, descriptionRu: '', estimatedMinutes: 10 })

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId],
  )
  const selectedLesson = useMemo(
    () => lessons.find((l) => l.id === selectedLessonId) || null,
    [lessons, selectedLessonId],
  )

  const moduleListForSelectedCourse = useMemo(
    () => modules.filter((m) => m.courseId === selectedCourseId).sort((a, b) => a.orderIndex - b.orderIndex),
    [modules, selectedCourseId],
  )
  const lessonListForSelectedCourse = useMemo(
    () => lessons.filter((l) => l.courseId === selectedCourseId).sort((a, b) => a.orderIndex - b.orderIndex),
    [lessons, selectedCourseId],
  )

  const notifyError = (e: any, fallback: string) => {
    const msg = e?.response?.data?.message?.[0] || e?.message || fallback
    setError(msg)
  }

  const notifySuccess = (msg: string) => {
    setSuccess(msg)
    setError('')
  }

  const loadCourses = async () => {
    const { data } = await getCourses()
    const mapped = (Array.isArray(data) ? data : []).map((c: any) => ({
      id: c.id,
      code: c.code,
      titleRu: c.titleRu,
      orderIndex: c.orderIndex ?? 0,
    }))
    setCourses(mapped)
    if (!selectedCourseId && mapped.length) setSelectedCourseId(mapped[0].id)
  }

  const loadHierarchy = async (courseId: string) => {
    const [modulesRes, lessonsRes] = await Promise.all([getModules(courseId), getLessons(courseId)])
    const modulesData = Array.isArray(modulesRes.data) ? modulesRes.data : []
    const lessonsData = Array.isArray(lessonsRes.data) ? lessonsRes.data : []

    setModules(
      modulesData.map((m: any) => ({
        id: m.id,
        courseId: m.courseId,
        titleRu: m.titleRu,
        orderIndex: m.orderIndex ?? 0,
      })),
    )
    setLessons(
      lessonsData.map((l: any) => ({
        id: l.id,
        courseId: l.courseId,
        moduleId: l.moduleId ?? undefined,
        titleRu: l.titleRu,
        orderIndex: l.orderIndex ?? 0,
      })),
    )
  }

  useEffect(() => {
    setLoading(true)
    loadCourses()
      .catch((e) => notifyError(e, 'Не удалось загрузить курсы'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCourseId) return
    setLoading(true)
    loadHierarchy(selectedCourseId)
      .catch((e) => notifyError(e, 'Не удалось загрузить иерархию курса'))
      .finally(() => setLoading(false))
  }, [selectedCourseId])

  const createCourseHandler = async () => {
    if (!newCourse.code.trim() || !newCourse.titleRu.trim()) {
      setError('Заполните code и название курса')
      return
    }
    try {
      await createCourse({
        ...newCourse,
        orderIndex: Number(newCourse.orderIndex) || 0,
      })
      setCreateCourseOpen(false)
      setNewCourse({ code: '', titleRu: '', orderIndex: 0, descriptionRu: '' })
      await loadCourses()
      notifySuccess('Курс создан')
    } catch (e) {
      notifyError(e, 'Не удалось создать курс')
    }
  }

  const createModuleHandler = async () => {
    if (!selectedCourseId) {
      setError('Сначала выберите курс')
      return
    }
    if (!newModule.titleRu.trim()) {
      setError('Введите название модуля')
      return
    }
    try {
      await createModule({
        courseId: selectedCourseId,
        titleRu: newModule.titleRu,
        descriptionRu: newModule.descriptionRu || undefined,
        orderIndex: Number(newModule.orderIndex) || 0,
      })
      setCreateModuleOpen(false)
      setNewModule({ titleRu: '', orderIndex: 0, descriptionRu: '' })
      await loadHierarchy(selectedCourseId)
      notifySuccess('Модуль создан')
    } catch (e) {
      notifyError(e, 'Не удалось создать модуль')
    }
  }

  const createLessonHandler = async () => {
    if (!selectedCourseId) {
      setError('Сначала выберите курс')
      return
    }
    if (!newLesson.titleRu.trim()) {
      setError('Введите название урока')
      return
    }
    try {
      await createLesson({
        courseId: selectedCourseId,
        moduleId: selectedModuleId || undefined,
        titleRu: newLesson.titleRu,
        descriptionRu: newLesson.descriptionRu || undefined,
        estimatedMinutes: Number(newLesson.estimatedMinutes) || 10,
        orderIndex: Number(newLesson.orderIndex) || 0,
        isPremium: false,
        isTest: false,
      })
      setCreateLessonOpen(false)
      setNewLesson({ titleRu: '', orderIndex: 0, descriptionRu: '', estimatedMinutes: 10 })
      await loadHierarchy(selectedCourseId)
      notifySuccess('Урок создан')
    } catch (e) {
      notifyError(e, 'Не удалось создать урок')
    }
  }

  const openLessonDetail = () => {
    if (selectedLessonId) navigate(`/content-studio/lessons/${selectedLessonId}`)
  }

  const openTestDetail = () => {
    if (selectedLessonId) navigate(`/content-studio/lessons/${selectedLessonId}/test`)
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: -0.4 }}>
            Content Studio
          </Typography>
          <Typography color="text.secondary">
            Выберите урок и откройте его для редактирования контента или теста.
          </Typography>
        </Box>
        <Chip icon={<AutoAwesome />} label="List → Detail" color="primary" variant="outlined" />
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!!success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: 4,
              position: { md: 'sticky' },
              top: { md: 16 },
              maxHeight: { md: 'calc(100vh - 120px)' },
              overflow: 'auto',
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">Курсы и уроки</Typography>
                <Button size="small" startIcon={<Add />} onClick={() => setCreateCourseOpen(true)}>
                  Курс
                </Button>
              </Stack>

              <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                <InputLabel>Курс</InputLabel>
                <Select
                  label="Курс"
                  value={selectedCourseId}
                  onChange={(e) => {
                    setSelectedCourseId(String(e.target.value))
                    setSelectedModuleId('')
                    setSelectedLessonId('')
                  }}
                >
                  {courses
                    .slice()
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.orderIndex}. {c.titleRu} ({c.code})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setCreateModuleOpen(true)} disabled={!selectedCourseId}>
                  Модуль
                </Button>
                <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setCreateLessonOpen(true)} disabled={!selectedCourseId}>
                  Урок
                </Button>
              </Stack>

              <Divider sx={{ my: 1 }} />

              {moduleListForSelectedCourse.map((m) => (
                <Box key={m.id} sx={{ mb: 1.25, p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <MenuBookOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {m.orderIndex}. {m.titleRu}
                    </Typography>
                  </Stack>
                  <Stack spacing={0.6}>
                    {lessonListForSelectedCourse
                      .filter((l) => l.moduleId === m.id)
                      .map((l) => (
                        <Button
                          key={l.id}
                          size="small"
                          variant={selectedLessonId === l.id ? 'contained' : 'text'}
                          sx={{ justifyContent: 'flex-start', borderRadius: 2, textTransform: 'none' }}
                          onClick={() => {
                            setSelectedModuleId(m.id)
                            setSelectedLessonId(l.id)
                          }}
                        >
                          {l.orderIndex}. {l.titleRu}
                        </Button>
                      ))}
                  </Stack>
                </Box>
              ))}

              {lessonListForSelectedCourse.filter((l) => !l.moduleId).length > 0 && (
                <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <LibraryBooksOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Уроки без модуля
                    </Typography>
                  </Stack>
                  <Stack spacing={0.6}>
                    {lessonListForSelectedCourse
                      .filter((l) => !l.moduleId)
                      .map((l) => (
                        <Button
                          key={l.id}
                          size="small"
                          variant={selectedLessonId === l.id ? 'contained' : 'text'}
                          sx={{ justifyContent: 'flex-start', borderRadius: 2, textTransform: 'none' }}
                          onClick={() => {
                            setSelectedModuleId('')
                            setSelectedLessonId(l.id)
                          }}
                        >
                          {l.orderIndex}. {l.titleRu}
                        </Button>
                      ))}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 4, minHeight: 400, border: '1px solid #E5E5EA' }}>
            <CardContent>
              {!selectedLessonId || !selectedLesson ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <SchoolOutlined sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    Выберите урок слева, затем нажмите «Редактировать урок» или «Редактировать тест».
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {selectedLesson.titleRu}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {selectedCourse?.titleRu}
                    {selectedModuleId ? ` / ${moduleListForSelectedCourse.find((m) => m.id === selectedModuleId)?.titleRu || ''}` : ''}
                  </Typography>
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<EditIcon />}
                      onClick={openLessonDetail}
                    >
                      Редактировать урок
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<QuizOutlined />}
                      onClick={openTestDetail}
                    >
                      Редактировать тест
                    </Button>
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={createCourseOpen} onClose={() => setCreateCourseOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Новый курс</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField label="Code" value={newCourse.code} onChange={(e) => setNewCourse((p) => ({ ...p, code: e.target.value }))} />
            <TextField label="Название (RU)" value={newCourse.titleRu} onChange={(e) => setNewCourse((p) => ({ ...p, titleRu: e.target.value }))} />
            <TextField label="Описание (RU)" multiline minRows={3} value={newCourse.descriptionRu} onChange={(e) => setNewCourse((p) => ({ ...p, descriptionRu: e.target.value }))} />
            <TextField label="Порядок" type="number" value={newCourse.orderIndex} onChange={(e) => setNewCourse((p) => ({ ...p, orderIndex: Number(e.target.value) || 0 }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateCourseOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={createCourseHandler}>Создать</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createModuleOpen} onClose={() => setCreateModuleOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Новый модуль</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField label="Название (RU)" value={newModule.titleRu} onChange={(e) => setNewModule((p) => ({ ...p, titleRu: e.target.value }))} />
            <TextField label="Описание (RU)" multiline minRows={3} value={newModule.descriptionRu} onChange={(e) => setNewModule((p) => ({ ...p, descriptionRu: e.target.value }))} />
            <TextField label="Порядок" type="number" value={newModule.orderIndex} onChange={(e) => setNewModule((p) => ({ ...p, orderIndex: Number(e.target.value) || 0 }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateModuleOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={createModuleHandler}>Создать</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createLessonOpen} onClose={() => setCreateLessonOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Новый урок</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <FormControl fullWidth>
              <InputLabel>Модуль (опционально)</InputLabel>
              <Select
                label="Модуль (опционально)"
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(String(e.target.value))}
              >
                <MenuItem value="">Без модуля</MenuItem>
                {moduleListForSelectedCourse.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.titleRu}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Название (RU)" value={newLesson.titleRu} onChange={(e) => setNewLesson((p) => ({ ...p, titleRu: e.target.value }))} />
            <TextField label="Описание (RU)" multiline minRows={3} value={newLesson.descriptionRu} onChange={(e) => setNewLesson((p) => ({ ...p, descriptionRu: e.target.value }))} />
            <Stack direction="row" spacing={1.5}>
              <TextField fullWidth label="Порядок" type="number" value={newLesson.orderIndex} onChange={(e) => setNewLesson((p) => ({ ...p, orderIndex: Number(e.target.value) || 0 }))} />
              <TextField fullWidth label="Длительность (мин)" type="number" value={newLesson.estimatedMinutes} onChange={(e) => setNewLesson((p) => ({ ...p, estimatedMinutes: Number(e.target.value) || 10 }))} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateLessonOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={createLessonHandler}>Создать</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
