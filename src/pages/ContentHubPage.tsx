import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  LinearProgress,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material'
import {
  Add,
  Edit as EditIcon,
  ExpandLess,
  ExpandMore,
  MenuBookOutlined,
  SchoolOutlined,
  QuizOutlined,
  ArticleOutlined,
  DragIndicator,
  DeleteOutline,
} from '@mui/icons-material'
import {
  createCourse,
  createLesson,
  createModule,
  getCourses,
  getLessons,
  getModules,
  reorderModules,
  reorderLessons,
  deleteLesson,
  getLessonDeletionImpact,
} from '../api/adminApi'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface HubCourse {
  id: string
  code: string
  titleRu: string
  orderIndex: number
}

interface HubModule {
  id: string
  courseId: string
  titleRu: string
  orderIndex: number
}

interface HubLesson {
  id: string
  courseId: string
  moduleId?: string
  titleRu: string
  orderIndex: number
}

function SortableModuleRow({
  module,
  courseId,
  expandedModules,
  toggleModule,
  openModuleEdit,
  openModuleTest,
  setContextCourseId,
  setContextModuleId,
                               setCreateLessonOpen,
  moduleLessons,
  children,
}: {
  module: HubModule
  courseId: string
  expandedModules: Set<string>
  toggleModule: (id: string) => void
  openModuleEdit: (cid: string, mid: string) => void
  openModuleTest: (cid: string, mid: string) => void
  setContextCourseId: (id: string) => void
  setContextModuleId: (id: string) => void
  setCreateModuleOpen: (v: boolean) => void
  setCreateLessonOpen: (v: boolean) => void
  moduleLessons: HubLesson[]
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
    data: { type: 'module', courseId },
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const moduleExpanded = expandedModules.has(module.id)
  return (
    <Box ref={setNodeRef} style={style} sx={{ mb: 1, opacity: isDragging ? 0.5 : 1 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1}
        sx={{
          p: 1,
          borderRadius: 1.5,
          bgcolor: 'action.hover',
          '&:hover': { bgcolor: 'action.selected' },
          flexWrap: 'wrap',
        }}
      >
        <Stack direction={{ xs: 'row', sm: 'column' }} spacing={0.5} sx={{ flexShrink: 0 }}>
          <Box
            {...attributes}
            {...listeners}
            sx={{ cursor: 'grab', display: 'flex', color: 'text.secondary', '&:active': { cursor: 'grabbing' } }}
          >
            <DragIndicator sx={{ fontSize: 20 }} />
          </Box>
          <Box
            component="span"
            sx={{ width: 28, display: 'flex', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => toggleModule(module.id)}
          >
            {moduleExpanded ? <ExpandLess sx={{ fontSize: 20, color: 'text.secondary' }} /> : <ExpandMore sx={{ fontSize: 20, color: 'text.secondary' }} />}
          </Box>
          <MenuBookOutlined sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0 }} onClick={() => openModuleEdit(courseId, module.id)}>
          <Typography variant="body2" sx={{ fontWeight: 600, cursor: 'pointer' }}>
            {module.orderIndex}. {module.titleRu}
          </Typography>
          <Chip label={`${moduleLessons.length} уроков`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
        </Stack>
        <Tooltip title="Редактировать модуль">
          <IconButton size="small" onClick={() => openModuleEdit(courseId, module.id)} sx={{ minWidth: 44, minHeight: 44 }}>
            <EditIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Тест модуля">
          <IconButton size="small" onClick={() => openModuleTest(courseId, module.id)} sx={{ minWidth: 44, minHeight: 44 }}>
            <QuizOutlined sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={`Добавить урок в ${module.titleRu}`}>
          <IconButton
            size="small"
            onClick={() => {
              setContextCourseId(courseId)
              setContextModuleId(module.id)
              setCreateLessonOpen(true)
            }}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <Add sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Stack>
      {children}
    </Box>
  )
}

function SortableLessonRow({
  lesson,
  courseId,
  moduleId,
  navigate,
  onRequestDelete,
  isDeleting,
}: {
  lesson: HubLesson
  courseId: string
  moduleId: string
  navigate: (path: string) => void
  onRequestDelete: () => void
  isDeleting: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
    data: { type: 'lesson', moduleId, courseId },
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <Stack
      ref={setNodeRef}
      style={style}
      direction={{ xs: 'column', sm: 'row' }}
      alignItems="flex-start"
      spacing={1}
      sx={{
        p: 0.75,
        borderRadius: 1,
        '&:hover': { bgcolor: 'action.hover' },
        opacity: isDragging ? 0.5 : 1,
        flexWrap: 'wrap',
      }}
    >
      <Box {...attributes} {...listeners} sx={{ cursor: 'grab', display: 'flex', color: 'text.secondary', '&:active': { cursor: 'grabbing' } }}>
        <DragIndicator sx={{ fontSize: 16 }} />
      </Box>
      <ArticleOutlined sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
      <Typography
        variant="body2"
        sx={{ flex: 1, cursor: 'pointer' }}
        onClick={() => navigate(`/content/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`)}
      >
        {lesson.orderIndex}. {lesson.titleRu}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<EditIcon sx={{ fontSize: 14 }} />}
          onClick={() => navigate(`/content/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`)}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Редакт.
        </Button>
        <Tooltip title="Удалить урок">
          <span>
            <IconButton
              size="small"
              color="error"
              disabled={isDeleting}
              onClick={(e) => {
                e.stopPropagation()
                onRequestDelete()
              }}
              aria-label="Удалить урок"
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              {isDeleting ? <CircularProgress size={18} color="inherit" /> : <DeleteOutline fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Stack>
  )
}

function levelCodeFromCourseCode(code: string | undefined): string | null {
  if (!code) return null
  const normalized = code.trim().toUpperCase()
  const match = normalized.match(/^[A-C][0-9]$/)
  return match ? match[0] : null
}

export default function ContentHubPage() {
  const navigate = useNavigate()
  const { courseId: urlCourseId, moduleId: urlModuleId } = useParams<{
    courseId?: string
    moduleId?: string
  }>()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [courses, setCourses] = useState<HubCourse[]>([])
  const [modulesByCourse, setModulesByCourse] = useState<Record<string, HubModule[]>>({})
  const [lessonsByCourse, setLessonsByCourse] = useState<Record<string, HubLesson[]>>({})
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  const [createCourseOpen, setCreateCourseOpen] = useState(false)
  const [createModuleOpen, setCreateModuleOpen] = useState(false)
  const [createLessonOpen, setCreateLessonOpen] = useState(false)
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null)

  const [contextCourseId, setContextCourseId] = useState('')
  const [contextModuleId, setContextModuleId] = useState('')

  const [newCourse, setNewCourse] = useState({ code: '', titleRu: '', orderIndex: 0, descriptionRu: '' })
  const [newModule, setNewModule] = useState({ titleRu: '', orderIndex: 0, descriptionRu: '' })
  const [newLesson, setNewLesson] = useState({ titleRu: '', orderIndex: 0, descriptionRu: '', estimatedMinutes: 10 })

  const moduleListForContextCourse = (modulesByCourse[contextCourseId] || []).sort(
    (a, b) => a.orderIndex - b.orderIndex,
  )

  const notifyError = (e: any, fallback: string) => {
    const msg = e?.response?.data?.message?.[0] || e?.message || fallback
    setError(msg)
  }

  const notifySuccess = (msg: string) => {
    setSuccess(msg)
    setError('')
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeData = active.data.current as { type?: string; courseId?: string; moduleId?: string }
    const overData = over.data.current as { type?: string; courseId?: string; moduleId?: string }
    if (!activeData?.type || activeData.type !== overData?.type) return

    if (activeData.type === 'module' && activeData.courseId) {
      const courseId = String(activeData.courseId)
      const mods = (modulesByCourse[courseId] || []).sort((a, b) => a.orderIndex - b.orderIndex)
      const oldIndex = mods.findIndex((m) => m.id === active.id)
      const newIndex = mods.findIndex((m) => m.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(mods, oldIndex, newIndex)
      try {
        await reorderModules(courseId, reordered.map((m) => m.id))
        setModulesByCourse((prev) => ({
          ...prev,
          [courseId]: reordered.map((m, i) => ({ ...m, orderIndex: i })),
        }))
        notifySuccess('Порядок модулей обновлён')
      } catch (e) {
        notifyError(e, 'Не удалось изменить порядок модулей')
      }
    } else if (activeData.type === 'lesson' && activeData.moduleId && activeData.courseId) {
      const courseId = String(activeData.courseId)
      const moduleId = String(activeData.moduleId)
      const les = (lessonsByCourse[courseId] || [])
        .filter((l) => l.moduleId === moduleId)
        .sort((a, b) => a.orderIndex - b.orderIndex)
      const oldIndex = les.findIndex((l) => l.id === active.id)
      const newIndex = les.findIndex((l) => l.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(les, oldIndex, newIndex)
      try {
        await reorderLessons(moduleId, reordered.map((l) => l.id))
        setLessonsByCourse((prev) => {
          const list = prev[courseId] || []
          return {
            ...prev,
            [courseId]: list.map((l) => {
              if (l.moduleId !== moduleId) return l
              const idx = reordered.findIndex((r) => r.id === l.id)
              return idx >= 0 ? { ...l, orderIndex: idx } : l
            }),
          }
        })
        notifySuccess('Порядок уроков обновлён')
      } catch (e) {
        notifyError(e, 'Не удалось изменить порядок уроков')
      }
    }
  }

  const loadCourses = async () => {
    const { data } = await getCourses()
    const mapped = (Array.isArray(data) ? data : []).map((c: any) => ({
      id: c.id,
      code: c.code,
      titleRu: c.titleRu,
      orderIndex: c.orderIndex ?? 0,
    }))
    setCourses(mapped.sort((a, b) => a.orderIndex - b.orderIndex))
  }

  const loadHierarchy = async (cid: string) => {
    const [modulesRes, lessonsRes] = await Promise.all([getModules(cid), getLessons(cid)])
    const modulesData = Array.isArray(modulesRes.data) ? modulesRes.data : []
    const lessonsData = Array.isArray(lessonsRes.data) ? lessonsRes.data : []

    setModulesByCourse((prev) => ({
      ...prev,
      [cid]: modulesData.map((m: any) => ({
        id: m.id,
        courseId: m.courseId,
        titleRu: m.titleRu,
        orderIndex: m.orderIndex ?? 0,
      })),
    }))
    setLessonsByCourse((prev) => ({
      ...prev,
      [cid]: lessonsData.map((l: any) => ({
        id: l.id,
        courseId: l.courseId,
        moduleId: l.moduleId ?? undefined,
        titleRu: l.titleRu,
        orderIndex: l.orderIndex ?? 0,
      })),
    }))
  }

  useEffect(() => {
    setLoading(true)
    loadCourses()
      .catch((e) => notifyError(e, 'Не удалось загрузить курсы'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (urlCourseId) {
      setExpandedCourses((prev) => new Set([...prev, urlCourseId]))
      if (!modulesByCourse[urlCourseId]) {
        loadHierarchy(urlCourseId).catch((e) => notifyError(e, 'Не удалось загрузить иерархию'))
      }
    }
    if (urlModuleId) {
      setExpandedModules((prev) => new Set([...prev, urlModuleId]))
    }
  }, [urlCourseId, urlModuleId])

  useEffect(() => {
    expandedCourses.forEach((cid) => {
      if (!modulesByCourse[cid]) {
        loadHierarchy(cid).catch(() => {})
      }
    })
  }, [expandedCourses])

  const toggleCourse = (cid: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev)
      if (next.has(cid)) next.delete(cid)
      else next.add(cid)
      return next
    })
    if (!modulesByCourse[cid]) loadHierarchy(cid).catch(() => {})
  }

  const toggleModule = (mid: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(mid)) next.delete(mid)
      else next.add(mid)
      return next
    })
  }

  const createCourseHandler = async () => {
    if (!newCourse.code.trim() || !newCourse.titleRu.trim()) {
      setError('Заполните code и название курса')
      return
    }
    try {
      await createCourse({ ...newCourse, orderIndex: Number(newCourse.orderIndex) || 0 })
      setCreateCourseOpen(false)
      setNewCourse({ code: '', titleRu: '', orderIndex: 0, descriptionRu: '' })
      await loadCourses()
      notifySuccess('Курс создан')
    } catch (e) {
      notifyError(e, 'Не удалось создать курс')
    }
  }

  const createModuleHandler = async () => {
    if (!contextCourseId) {
      setError('Сначала выберите курс')
      return
    }
    if (!newModule.titleRu.trim()) {
      setError('Введите название модуля')
      return
    }
    try {
      await createModule({
        courseId: contextCourseId,
        titleRu: newModule.titleRu,
        descriptionRu: newModule.descriptionRu || undefined,
        orderIndex: Number(newModule.orderIndex) || 0,
      })
      setCreateModuleOpen(false)
      setNewModule({ titleRu: '', orderIndex: 0, descriptionRu: '' })
      await loadHierarchy(contextCourseId)
      notifySuccess('Модуль создан')
    } catch (e) {
      notifyError(e, 'Не удалось создать модуль')
    }
  }

  const createLessonHandler = async () => {
    if (!contextCourseId) {
      setError('Сначала выберите курс')
      return
    }
    if (!newLesson.titleRu.trim()) {
      setError('Введите название урока')
      return
    }
    try {
      await createLesson({
        courseId: contextCourseId,
        moduleId: contextModuleId || undefined,
        titleRu: newLesson.titleRu,
        descriptionRu: newLesson.descriptionRu || undefined,
        estimatedMinutes: Number(newLesson.estimatedMinutes) || 10,
        orderIndex: Number(newLesson.orderIndex) || 0,
        isPremium: false,
        isTest: false,
      })
      setCreateLessonOpen(false)
      setNewLesson({ titleRu: '', orderIndex: 0, descriptionRu: '', estimatedMinutes: 10 })
      setContextModuleId('')
      await loadHierarchy(contextCourseId)
      notifySuccess('Урок создан')
    } catch (e) {
      notifyError(e, 'Не удалось создать урок')
    }
  }

  const openCourseEdit = (cid: string) => {
    navigate(`/content/courses/${cid}/edit`)
  }

  const openModuleEdit = (cid: string, mid: string) => {
    navigate(`/content/courses/${cid}/modules/${mid}/edit`)
  }

  const openModuleTest = (cid: string, mid: string) => {
    navigate(`/content/courses/${cid}/modules/${mid}/test`)
  }

  const openLevelTest = (levelCode: string) => {
    navigate(`/content/level-tests/${levelCode}`)
  }

  const openOnboardingPlacement = (slot: string) => {
    navigate(`/content/onboarding-placement/${slot}`)
  }

  const ruUsersWord = (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return 'пользователь'
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'пользователя'
    return 'пользователей'
  }

  const handleDeleteLesson = async (lesson: HubLesson, courseId: string) => {
    try {
      const { data } = await getLessonDeletionImpact(lesson.id)
      const n = data?.distinctUserCount ?? 0
      const progressHint =
        n > 0
          ? `\n\nВнимание: у ${n} ${ruUsersWord(n)} есть прогресс по уроку или мини-тесту. Эти данные будут удалены.`
          : ''
      if (
        !window.confirm(
          `Удалить урок «${lesson.titleRu}»? Действие нельзя отменить.${progressHint}`,
        )
      ) {
        return
      }
      setDeletingLessonId(lesson.id)
      await deleteLesson(lesson.id)
      await loadHierarchy(courseId)
      notifySuccess('Урок удалён')
    } catch (e) {
      notifyError(e, 'Не удалось удалить урок')
    } finally {
      setDeletingLessonId(null)
    }
  }

  const urlCourse = courses.find((c) => c.id === urlCourseId) || null
  const urlModule =
    urlCourseId && urlModuleId
      ? (modulesByCourse[urlCourseId] || []).find((m) => m.id === urlModuleId) || null
      : null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: -0.4 }}>
            Контент
          </Typography>
          <Typography color="text.secondary">
            Курсы → Модули → Уроки. Раскройте и перейдите к редактированию.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={() => openOnboardingPlacement('diagnostic')}>
            Онбординг: диагностика
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateCourseOpen(true)}>
            Создать курс
          </Button>
        </Stack>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!!success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          color={urlCourseId ? 'text.secondary' : 'text.primary'}
          onClick={() => navigate('/content')}
          sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, cursor: 'pointer' }}
        >
          Контент
        </Link>
        {urlCourse && (
          <Link
            component="button"
            variant="body2"
            color={urlModuleId ? 'text.secondary' : 'text.primary'}
            onClick={() => navigate(`/content/courses/${urlCourse.id}`)}
            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, cursor: 'pointer' }}
          >
            {urlCourse.code}
          </Link>
        )}
        {urlModule && (
          <Typography variant="body2" color="text.primary">
            {urlModule.titleRu}
          </Typography>
        )}
      </Breadcrumbs>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          {courses.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <SchoolOutlined sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Создайте первый курс
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => setCreateCourseOpen(true)}>
                Создать курс
              </Button>
            </Box>
          ) : (
            <Stack spacing={0}>
              {courses.map((c) => {
                const courseExpanded = expandedCourses.has(c.id)
                const mods = (modulesByCourse[c.id] || []).sort((a, b) => a.orderIndex - b.orderIndex)
                const les = (lessonsByCourse[c.id] || []).sort((a, b) => a.orderIndex - b.orderIndex)
                const levelCode = levelCodeFromCourseCode(c.code)

                return (
                  <Box key={c.id}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        '&:hover': { bgcolor: 'action.hover' },
                        flexWrap: 'wrap',
                        gap: 1,
                      }}
                    >
                      <Box
                        component="span"
                        sx={{ width: 32, display: 'flex', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                        onClick={() => toggleCourse(c.id)}
                      >
                        {courseExpanded ? (
                          <ExpandLess sx={{ fontSize: 24, color: 'text.secondary' }} />
                        ) : (
                          <ExpandMore sx={{ fontSize: 24, color: 'text.secondary' }} />
                        )}
                      </Box>
                      <SchoolOutlined sx={{ fontSize: 22, color: 'text.secondary', flexShrink: 0 }} />
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        sx={{ flex: 1, minWidth: 0 }}
                        onClick={() => openCourseEdit(c.id)}
                      >
                        <Typography variant="body1" sx={{ fontWeight: 700, cursor: 'pointer' }}>
                          {c.orderIndex}. {c.titleRu}
                        </Typography>
                        <Chip label={c.code} size="small" sx={{ fontSize: '0.7rem' }} />
                        <Chip label={`${mods.length} модулей`} size="small" variant="outlined" />
                        <Chip label={`${les.length} уроков`} size="small" variant="outlined" />
                      </Stack>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                        onClick={() => openCourseEdit(c.id)}
                      >
                        Редактировать
                      </Button>
                      {courseExpanded && (
                        <Tooltip title={`Добавить модуль в ${c.titleRu}`}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Add />}
                            onClick={() => {
                              setContextCourseId(c.id)
                              setCreateModuleOpen(true)
                            }}
                          >
                            Модуль
                          </Button>
                        </Tooltip>
                      )}
                    </Stack>

                    {courseExpanded && (
                      <Box sx={{ pl: { xs: 2, sm: 4 }, pr: 2, pb: 2 }}>
                        {levelCode && (
                          <Tooltip title={`Тест уровня ${levelCode} — проверка знаний по всему уровню`}>
                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              alignItems={{ xs: 'flex-start', sm: 'center' }}
                              spacing={1}
                              sx={{ mb: 1, pl: { xs: 0, sm: 1 } }}
                            >
                              <QuizOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                              <Typography variant="body2" sx={{ flex: 1 }}>
                                Тест уровня ({levelCode})
                              </Typography>
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => openLevelTest(levelCode)}
                              >
                                Открыть
                              </Button>
                            </Stack>
                          </Tooltip>
                        )}
                        {['mahraj', 'a1', 'a2'].includes(String(c.code || '').toLowerCase()) && (
                          <Tooltip title="Вопросы для ветки онбординга (без Premium)">
                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              alignItems={{ xs: 'flex-start', sm: 'center' }}
                              spacing={1}
                              sx={{ mb: 1, pl: { xs: 0, sm: 1 } }}
                            >
                              <QuizOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
                              <Typography variant="body2" sx={{ flex: 1 }}>
                                Тест онбординга ({c.code})
                              </Typography>
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => openOnboardingPlacement(String(c.code).toLowerCase())}
                              >
                                Открыть
                              </Button>
                            </Stack>
                          </Tooltip>
                        )}

                        <SortableContext items={mods.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                        {mods.map((m) => {
                          const moduleLessons = les.filter((l) => l.moduleId === m.id)
                          return (
                            <SortableModuleRow
                              key={m.id}
                              module={m}
                              courseId={c.id}
                              expandedModules={expandedModules}
                              toggleModule={toggleModule}
                              openModuleEdit={openModuleEdit}
                              openModuleTest={openModuleTest}
                              setContextCourseId={setContextCourseId}
                              setContextModuleId={setContextModuleId}
                              setCreateModuleOpen={setCreateModuleOpen}
                              setCreateLessonOpen={setCreateLessonOpen}
                              moduleLessons={moduleLessons}
                            >
                              {expandedModules.has(m.id) && (
                                <SortableContext items={moduleLessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                                  <Stack sx={{ pl: { xs: 2, sm: 4 }, mt: 0.5 }} spacing={0.25}>
                                    {moduleLessons.map((l) => (
                                      <SortableLessonRow
                                        key={l.id}
                                        lesson={l}
                                        courseId={c.id}
                                        moduleId={m.id}
                                        navigate={navigate}
                                        onRequestDelete={() => void handleDeleteLesson(l, c.id)}
                                        isDeleting={deletingLessonId === l.id}
                                      />
                                    ))}
                                  </Stack>
                                </SortableContext>
                              )}
                            </SortableModuleRow>
                          )
                        })}
                        </SortableContext>

                        {les.filter((l) => !l.moduleId).length > 0 && (
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 1.5,
                              border: '1px dashed',
                              borderColor: 'divider',
                              mt: 1,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}
                            >
                              Уроки без модуля
                            </Typography>
                            <Stack spacing={0.25}>
                              {les
                                .filter((l) => !l.moduleId)
                                .sort((a, b) => a.orderIndex - b.orderIndex)
                                .map((l) => (
                                  <Stack
                                    key={l.id}
                                    direction={{ xs: 'column', sm: 'row' }}
                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                    spacing={1}
                                    sx={{
                                      p: 0.75,
                                      borderRadius: 1,
                                      '&:hover': { bgcolor: 'action.hover' },
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <ArticleOutlined sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                                    <Typography
                                      variant="body2"
                                      sx={{ flex: 1, cursor: 'pointer' }}
                                      onClick={() =>
                                        navigate(`/content/courses/${c.id}/lessons/${l.id}`)
                                      }
                                    >
                                      {l.orderIndex}. {l.titleRu}
                                    </Typography>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                                      onClick={() =>
                                        navigate(`/content/courses/${c.id}/lessons/${l.id}`)
                                      }
                                    >
                                      Редакт.
                                    </Button>
                                    <Tooltip title="Удалить урок">
                                      <span>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          disabled={deletingLessonId === l.id}
                                          onClick={() => void handleDeleteLesson(l, c.id)}
                                          aria-label="Удалить урок"
                                        >
                                          {deletingLessonId === l.id ? (
                                            <CircularProgress size={18} color="inherit" />
                                          ) : (
                                            <DeleteOutline fontSize="small" />
                                          )}
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  </Stack>
                                ))}
                            </Stack>
                          </Box>
                        )}

                        <Stack direction="row" spacing={1} sx={{ mt: 1.5, pl: 1 }}>
                          <Tooltip title={`Добавить урок в ${c.titleRu}`}>
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<Add />}
                              onClick={() => {
                                setContextCourseId(c.id)
                                setContextModuleId('')
                                setCreateLessonOpen(true)
                              }}
                            >
                              + Урок в курс
                            </Button>
                          </Tooltip>
                        </Stack>
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

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
                value={contextModuleId}
                onChange={(e) => setContextModuleId(String(e.target.value))}
              >
                <MenuItem value="">Без модуля</MenuItem>
                {moduleListForContextCourse.map((m) => (
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
    </DndContext>
  )
}
