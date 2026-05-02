import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  LinearProgress,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Add,
  Edit as EditIcon,
  ChevronRight,
  KeyboardArrowDown,
  KeyboardArrowUp,
  MenuBookOutlined,
  SchoolOutlined,
  QuizOutlined,
  ArticleOutlined,
  DragIndicator,
  DeleteOutline,
  FileDownloadOutlined,
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
  exportCourseContent,
  getLessonDeletionImpact,
} from '../api/adminApi'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
import { dialogActionsSafeAreaSx, useNarrowDialogProps } from '../hooks/useNarrowDialogProps'

/** Веб-аппроксимация палитры и метрик Apple HIG (iOS grouped lists, типографика) */
const HIG = {
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  groupedBackground: '#F2F2F7',
  secondaryGrouped: '#FFFFFF',
  tertiaryGrouped: '#FAFAFA',
  separator: 'rgba(60, 60, 67, 0.29)',
  separatorOpaque: 'rgba(60, 60, 67, 0.12)',
  label: '#1C1C1E',
  secondaryLabel: 'rgba(60, 60, 67, 0.6)',
  tertiaryLabel: 'rgba(60, 60, 67, 0.45)',
  fillQuaternary: 'rgba(116, 116, 128, 0.08)',
  fillTertiary: 'rgba(118, 118, 128, 0.24)',
  gray6: '#F2F2F7',
  systemGray5: '#E5E5EA',
  systemGray4: '#D1D1D6',
  cornerRadius: 10,
  rowMinHeight: 52,
  rowCompact: 44,
  largeTitle: { fontSize: '1.75rem', fontWeight: 700 as const, letterSpacing: '-0.022em', lineHeight: 1.2 },
  title3: { fontSize: '1.25rem', fontWeight: 600 as const, letterSpacing: '-0.019em' },
  body: { fontSize: '1.0625rem', fontWeight: 400 as const, letterSpacing: '-0.016em' },
  bodyEmphasized: { fontSize: '1.0625rem', fontWeight: 600 as const, letterSpacing: '-0.016em' },
  subheadline: { fontSize: '0.9375rem', fontWeight: 400 as const, letterSpacing: '-0.015em' },
  footnote: { fontSize: '0.8125rem', fontWeight: 400 as const, letterSpacing: '-0.01em' },
  footnoteCaps: { fontSize: '0.6875rem', fontWeight: 600 as const, letterSpacing: '0.06em' },
  caption1: { fontSize: '0.75rem', fontWeight: 400 as const },
}

function InsetGrouped({
  header,
  children,
  sx,
}: {
  header?: string
  children: React.ReactNode
  sx?: object
}) {
  return (
    <Box sx={{ mb: 2, ...sx }}>
      {header ? (
        <Typography
          sx={{
            px: 2,
            mb: 0.75,
            ...HIG.footnoteCaps,
            color: HIG.secondaryLabel,
            textTransform: 'uppercase',
          }}
        >
          {header}
        </Typography>
      ) : null}
      <Paper
        elevation={0}
        sx={{
          borderRadius: `${HIG.cornerRadius}px`,
          overflow: 'hidden',
          bgcolor: HIG.secondaryGrouped,
          border: `0.5px solid ${HIG.separatorOpaque}`,
          boxShadow: 'none',
        }}
      >
        {children}
      </Paper>
    </Box>
  )
}

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
  isLast,
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
  isLast: boolean
  children: React.ReactNode
}) {
  const theme = useTheme()
  const tint = theme.palette.primary.main
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
    data: { type: 'module', courseId },
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const moduleExpanded = expandedModules.has(module.id)
  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        opacity: isDragging ? 0.55 : 1,
        borderBottom: isLast ? 'none' : `0.5px solid ${HIG.separatorOpaque}`,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0}
        sx={{
          minHeight: HIG.rowMinHeight,
          pl: 1,
          pr: 0.5,
          py: 0.5,
          gap: 0.5,
          bgcolor: moduleExpanded ? HIG.tertiaryGrouped : HIG.secondaryGrouped,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          '&:hover': { bgcolor: moduleExpanded ? HIG.tertiaryGrouped : HIG.fillQuaternary },
        }}
      >
        <Box
          {...attributes}
          {...listeners}
          sx={{
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            minHeight: HIG.rowCompact,
            color: HIG.tertiaryLabel,
            touchAction: 'none',
            '&:active': { cursor: 'grabbing' },
          }}
          aria-label="Изменить порядок модуля"
        >
          <DragIndicator sx={{ fontSize: 22 }} />
        </Box>
        <IconButton
          size="small"
          onClick={() => toggleModule(module.id)}
          sx={{
            width: 40,
            height: 40,
            color: HIG.secondaryLabel,
            borderRadius: `${HIG.cornerRadius}px`,
          }}
          aria-expanded={moduleExpanded}
          aria-label={moduleExpanded ? 'Свернуть уроки' : 'Показать уроки'}
        >
          {moduleExpanded ? <KeyboardArrowUp sx={{ fontSize: 22 }} /> : <KeyboardArrowDown sx={{ fontSize: 22 }} />}
        </IconButton>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            bgcolor: HIG.fillQuaternary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <MenuBookOutlined sx={{ fontSize: 18, color: HIG.secondaryLabel }} />
        </Box>
        <Stack
          direction="column"
          justifyContent="center"
          sx={{ flex: 1, minWidth: 0, py: 0.5, cursor: 'pointer' }}
          onClick={() => openModuleEdit(courseId, module.id)}
        >
          <Typography sx={{ ...HIG.bodyEmphasized, color: HIG.label, lineHeight: 1.25 }}>
            {module.orderIndex}. {module.titleRu}
          </Typography>
          <Typography sx={{ ...HIG.caption1, color: HIG.secondaryLabel, mt: 0.25 }}>
            {moduleLessons.length === 1 ? '1 урок' : `${moduleLessons.length} уроков`}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" sx={{ flexShrink: 0 }}>
          <Tooltip title="Редактировать модуль">
            <IconButton
              onClick={() => openModuleEdit(courseId, module.id)}
              sx={{ width: 44, height: 44, color: tint, borderRadius: `${HIG.cornerRadius}px` }}
            >
              <EditIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Тест модуля">
            <IconButton
              onClick={() => openModuleTest(courseId, module.id)}
              sx={{ width: 44, height: 44, color: HIG.secondaryLabel, borderRadius: `${HIG.cornerRadius}px` }}
            >
              <QuizOutlined sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={`Добавить урок в «${module.titleRu}»`}>
            <IconButton
              onClick={() => {
                setContextCourseId(courseId)
                setContextModuleId(module.id)
                setCreateLessonOpen(true)
              }}
              sx={{ width: 44, height: 44, color: tint, borderRadius: `${HIG.cornerRadius}px` }}
            >
              <Add sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      {children ? <Box sx={{ bgcolor: HIG.groupedBackground }}>{children}</Box> : null}
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
  isLast,
}: {
  lesson: HubLesson
  courseId: string
  moduleId: string
  navigate: (path: string) => void
  onRequestDelete: () => void
  isDeleting: boolean
  isLast: boolean
}) {
  const theme = useTheme()
  const tint = theme.palette.primary.main
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
    data: { type: 'lesson', moduleId, courseId },
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const path = `/content/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`
  return (
    <Stack
      ref={setNodeRef}
      style={style}
      direction="row"
      alignItems="center"
      spacing={0}
      sx={{
        minHeight: HIG.rowCompact,
        pl: 1.5,
        pr: 0.5,
        py: 0.25,
        ml: 1.5,
        mr: 0,
        borderLeft: `3px solid ${HIG.separatorOpaque}`,
        borderBottom: isLast ? 'none' : `0.5px solid ${HIG.separatorOpaque}`,
        bgcolor: HIG.secondaryGrouped,
        opacity: isDragging ? 0.55 : 1,
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        '&:hover': { bgcolor: HIG.tertiaryGrouped },
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          minHeight: 40,
          color: HIG.tertiaryLabel,
          '&:active': { cursor: 'grabbing' },
        }}
        aria-label="Изменить порядок урока"
      >
        <DragIndicator sx={{ fontSize: 18 }} />
      </Box>
      <ArticleOutlined sx={{ fontSize: 18, color: HIG.secondaryLabel, flexShrink: 0, mr: 1 }} />
      <Typography
        sx={{
          ...HIG.subheadline,
          color: HIG.label,
          flex: 1,
          minWidth: 0,
          cursor: 'pointer',
          py: 0.5,
        }}
        onClick={() => navigate(path)}
      >
        {lesson.orderIndex}. {lesson.titleRu}
      </Typography>
      <Button
        variant="text"
        disableRipple
        onClick={() => navigate(path)}
        sx={{
          ...HIG.subheadline,
          fontWeight: 600,
          color: tint,
          minWidth: 44,
          minHeight: 44,
          px: 1.5,
          textTransform: 'none',
          '&:hover': { bgcolor: alpha(tint, 0.1) },
        }}
      >
        Открыть
      </Button>
      <Tooltip title="Удалить урок">
        <span>
          <IconButton
            disabled={isDeleting}
            onClick={(e) => {
              e.stopPropagation()
              onRequestDelete()
            }}
            aria-label="Удалить урок"
            sx={{
              width: 44,
              height: 44,
              color: '#FF3B30',
              borderRadius: `${HIG.cornerRadius}px`,
            }}
          >
            {isDeleting ? <CircularProgress size={18} sx={{ color: '#FF3B30' }} /> : <DeleteOutline sx={{ fontSize: 20 }} />}
          </IconButton>
        </span>
      </Tooltip>
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
  const theme = useTheme()
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
  const [exportingCourseId, setExportingCourseId] = useState<string | null>(null)

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
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const narrowFormSm = useNarrowDialogProps('sm')

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

  const downloadCourseContent = async (course: HubCourse) => {
    setExportingCourseId(course.id)
    try {
      const response = await exportCourseContent(course.id)
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const disposition = String(response.headers['content-disposition'] || '')
      const encodedFilename = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1]
      const plainFilename = disposition.match(/filename="([^"]+)"/)?.[1]
      const filename = encodedFilename
        ? decodeURIComponent(encodedFilename)
        : plainFilename || `ilmhub-${course.code || 'course'}-content-export.xlsx`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      notifySuccess(`Экспорт «${course.titleRu}» готов`)
    } catch (e) {
      notifyError(e, 'Не удалось выгрузить контент курса')
    } finally {
      setExportingCourseId(null)
    }
  }

  const ruUsersWord = (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return 'пользователь'
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'пользователя'
    return 'пользователей'
  }

  const ruModuleWord = (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return 'модуль'
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'модуля'
    return 'модулей'
  }

  const ruLessonWord = (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return 'урок'
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'урока'
    return 'уроков'
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

  const iosFilledProminent = {
    minHeight: 44,
    px: 2.5,
    borderRadius: `${HIG.cornerRadius}px`,
    textTransform: 'none' as const,
    fontWeight: 600,
    fontSize: '0.9375rem',
    letterSpacing: '-0.01em',
    bgcolor: theme.palette.primary.main,
    backgroundImage: 'none',
    boxShadow: 'none',
    '&:hover': {
      bgcolor: theme.palette.primary.dark,
      backgroundImage: 'none',
      boxShadow: 'none',
      transform: 'none',
    },
  }

  const iosGraySecondary = {
    minHeight: 44,
    px: 2.5,
    borderRadius: `${HIG.cornerRadius}px`,
    textTransform: 'none' as const,
    fontWeight: 500,
    fontSize: '0.9375rem',
    letterSpacing: '-0.01em',
    bgcolor: HIG.systemGray5,
    color: HIG.label,
    border: 'none',
    boxShadow: 'none',
    '&:hover': {
      bgcolor: HIG.systemGray4,
      boxShadow: 'none',
      transform: 'none',
    },
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
    <Box
      sx={{
        fontFamily: HIG.font,
        bgcolor: HIG.groupedBackground,
        mx: { xs: -2, sm: -3, md: -4 },
        px: { xs: 2, sm: 3, md: 4 },
        pb: 5,
        pt: 0.5,
        minHeight: '60vh',
      }}
    >
      <Box sx={{ maxWidth: 880, mx: 'auto' }}>
      <Stack spacing={0} sx={{ mb: 2.5 }}>
        <Typography sx={{ ...HIG.footnoteCaps, color: HIG.secondaryLabel, px: 0.5 }}>
          Учебные программы
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ pt: 0.5 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ ...HIG.largeTitle, color: HIG.label }}>Контент</Typography>
            <Typography sx={{ ...HIG.subheadline, color: HIG.secondaryLabel, mt: 0.75, maxWidth: 480, lineHeight: 1.5 }}>
              Курсы, модули и уроки в виде сгруппированного списка. Перетаскивайте строки за ручку слева.
            </Typography>
            {!loading && courses.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2, gap: 1 }}>
                <Box
                  sx={{
                    ...HIG.footnote,
                    fontWeight: 500,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: '100px',
                    bgcolor: HIG.fillQuaternary,
                    color: HIG.secondaryLabel,
                  }}
                >
                  {courses.length}{' '}
                  {courses.length === 1 ? 'курс' : courses.length >= 2 && courses.length <= 4 ? 'курса' : 'курсов'}
                </Box>
                <Box
                  sx={{
                    ...HIG.footnote,
                    fontWeight: 500,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: '100px',
                    bgcolor: HIG.fillQuaternary,
                    color: HIG.secondaryLabel,
                  }}
                >
                  {courses.reduce((acc, x) => acc + (lessonsByCourse[x.id]?.length ?? 0), 0)} уроков всего
                </Box>
              </Stack>
            )}
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}>
            <Button
              variant="text"
              onClick={() => openOnboardingPlacement('diagnostic')}
              sx={{
                ...iosGraySecondary,
                color: HIG.label,
              }}
            >
              Онбординг: диагностика
            </Button>
            <Button
              variant="contained"
              startIcon={<Add sx={{ fontSize: 20 }} />}
              onClick={() => setCreateCourseOpen(true)}
              sx={iosFilledProminent}
            >
              Создать курс
            </Button>
          </Stack>
        </Stack>
      </Stack>

      {loading && (
        <LinearProgress
          sx={{
            mb: 2,
            borderRadius: 1,
            height: 3,
            bgcolor: HIG.fillQuaternary,
            '& .MuiLinearProgress-bar': { bgcolor: theme.palette.primary.main },
          }}
        />
      )}
      {!!error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: `${HIG.cornerRadius}px`, ...HIG.footnote }}>
          {error}
        </Alert>
      )}
      {!!success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: `${HIG.cornerRadius}px`, ...HIG.footnote }}>
          {success}
        </Alert>
      )}

      <Box sx={{ px: 0.5, mb: 2 }}>
        <Breadcrumbs
          separator={<ChevronRight sx={{ fontSize: 18, color: HIG.tertiaryLabel }} />}
          sx={{ '& .MuiBreadcrumbs-li': { display: 'flex', alignItems: 'center' } }}
        >
          <Link
            component="button"
            onClick={() => navigate('/content')}
            sx={{
              ...HIG.subheadline,
              fontWeight: urlCourseId ? 400 : 600,
              color: urlCourseId ? HIG.secondaryLabel : HIG.label,
              textDecoration: 'none',
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              padding: 0,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Контент
          </Link>
          {urlCourse && (
            <Link
              component="button"
              onClick={() => navigate(`/content/courses/${urlCourse.id}`)}
              sx={{
                ...HIG.subheadline,
                fontWeight: urlModuleId ? 400 : 600,
                color: urlModuleId ? HIG.secondaryLabel : HIG.label,
                textDecoration: 'none',
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                padding: 0,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {urlCourse.code}
            </Link>
          )}
          {urlModule && (
            <Typography sx={{ ...HIG.subheadline, fontWeight: 600, color: HIG.label }}>
              {urlModule.titleRu}
            </Typography>
          )}
        </Breadcrumbs>
      </Box>

      <Stack spacing={1.5}>
          {courses.length === 0 && !loading ? (
            <InsetGrouped>
              <Stack alignItems="center" sx={{ py: 6, px: 2 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '13px',
                    bgcolor: HIG.fillQuaternary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <SchoolOutlined sx={{ fontSize: 28, color: HIG.secondaryLabel }} />
                </Box>
                <Typography sx={{ ...HIG.title3, color: HIG.label, mb: 0.75 }}>Нет курсов</Typography>
                <Typography
                  sx={{
                    ...HIG.subheadline,
                    color: HIG.secondaryLabel,
                    textAlign: 'center',
                    mb: 3,
                    maxWidth: 300,
                    lineHeight: 1.45,
                  }}
                >
                  Создайте курс, чтобы добавить модули и уроки.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add sx={{ fontSize: 20 }} />}
                  onClick={() => setCreateCourseOpen(true)}
                  sx={iosFilledProminent}
                >
                  Создать курс
                </Button>
              </Stack>
            </InsetGrouped>
          ) : (
            courses.map((c) => {
                const courseExpanded = expandedCourses.has(c.id)
                const mods = (modulesByCourse[c.id] || []).sort((a, b) => a.orderIndex - b.orderIndex)
                const les = (lessonsByCourse[c.id] || []).sort((a, b) => a.orderIndex - b.orderIndex)
                const levelCode = levelCodeFromCourseCode(c.code)

                return (
                  <Paper
                    key={c.id}
                    elevation={0}
                    sx={{
                      borderRadius: `${HIG.cornerRadius}px`,
                      overflow: 'hidden',
                      border: `0.5px solid ${HIG.separatorOpaque}`,
                      bgcolor: HIG.secondaryGrouped,
                      boxShadow: 'none',
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{
                        minHeight: 56,
                        px: 2,
                        py: 1,
                        cursor: 'pointer',
                        bgcolor: courseExpanded ? HIG.tertiaryGrouped : HIG.secondaryGrouped,
                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                        gap: 1,
                        '&:hover': { bgcolor: HIG.fillQuaternary },
                      }}
                      onClick={() => toggleCourse(c.id)}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCourse(c.id)
                        }}
                        sx={{ color: HIG.secondaryLabel, borderRadius: `${HIG.cornerRadius}px` }}
                        aria-expanded={courseExpanded}
                        aria-label={courseExpanded ? 'Свернуть курс' : 'Развернуть курс'}
                      >
                        {courseExpanded ? <KeyboardArrowUp sx={{ fontSize: 22 }} /> : <KeyboardArrowDown sx={{ fontSize: 22 }} />}
                      </IconButton>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '9px',
                          bgcolor: HIG.fillQuaternary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <SchoolOutlined sx={{ fontSize: 22, color: HIG.secondaryLabel }} />
                      </Box>
                      <Stack
                        direction="column"
                        sx={{ flex: 1, minWidth: 0, py: 0.25 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          openCourseEdit(c.id)
                        }}
                      >
                        <Typography sx={{ ...HIG.bodyEmphasized, color: HIG.label, cursor: 'pointer' }}>
                          {c.orderIndex}. {c.titleRu}
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" sx={{ mt: 0.35, gap: 0.5, alignItems: 'center' }}>
                          <Typography sx={{ ...HIG.caption1, color: theme.palette.primary.main, fontWeight: 600 }}>{c.code}</Typography>
                          <Typography sx={{ ...HIG.caption1, color: HIG.tertiaryLabel }}>·</Typography>
                          <Typography sx={{ ...HIG.caption1, color: HIG.secondaryLabel }}>
                            {mods.length} {ruModuleWord(mods.length)}
                          </Typography>
                          <Typography sx={{ ...HIG.caption1, color: HIG.tertiaryLabel }}>·</Typography>
                          <Typography sx={{ ...HIG.caption1, color: HIG.secondaryLabel }}>
                            {les.length} {ruLessonWord(les.length)}
                          </Typography>
                        </Stack>
                      </Stack>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        sx={{ flexShrink: 0, flexWrap: 'wrap' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="text"
                          onClick={() => openCourseEdit(c.id)}
                          sx={{
                            ...HIG.subheadline,
                            fontWeight: 600,
                            color: theme.palette.primary.main,
                            minHeight: 44,
                            px: 1.5,
                            textTransform: 'none',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                          }}
                        >
                          Изменить
                        </Button>
                        <Tooltip title="Выгрузить экраны курса в Excel">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => downloadCourseContent(c)}
                              disabled={exportingCourseId === c.id}
                              sx={{
                                width: 40,
                                height: 40,
                                color: theme.palette.primary.main,
                                borderRadius: `${HIG.cornerRadius}px`,
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                              }}
                              aria-label="Выгрузить Excel"
                            >
                              {exportingCourseId === c.id ? (
                                <CircularProgress size={18} />
                              ) : (
                                <FileDownloadOutlined sx={{ fontSize: 21 }} />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                        {courseExpanded && (
                          <Tooltip title={`Новый модуль в «${c.titleRu}»`}>
                            <Button
                              variant="contained"
                              onClick={() => {
                                setContextCourseId(c.id)
                                setCreateModuleOpen(true)
                              }}
                              sx={{
                                ...iosFilledProminent,
                                minHeight: 36,
                                px: 2,
                                fontSize: '0.875rem',
                              }}
                            >
                              Модуль
                            </Button>
                          </Tooltip>
                        )}
                      </Stack>
                    </Stack>

                    {courseExpanded && (
                      <Box
                        sx={{
                          borderTop: `0.5px solid ${HIG.separatorOpaque}`,
                          bgcolor: HIG.groupedBackground,
                          px: 1.5,
                          pb: 2,
                          pt: 1.5,
                        }}
                      >
                        <Stack spacing={2}>
                          {levelCode && (
                            <Tooltip title={`Тест уровня ${levelCode} — проверка знаний по всему уровню`}>
                              <Box component="span" sx={{ display: 'block' }}>
                                <InsetGrouped header="Проверка знаний">
                                  <Stack
                                    direction="row"
                                    alignItems="center"
                                    sx={{ minHeight: HIG.rowMinHeight, px: 2, py: 0.5 }}
                                  >
                                    <QuizOutlined sx={{ fontSize: 22, color: HIG.secondaryLabel, mr: 1.5, flexShrink: 0 }} />
                                    <Stack sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography sx={{ ...HIG.body, color: HIG.label, lineHeight: 1.3 }}>
                                        Тест уровня {levelCode}
                                      </Typography>
                                      <Typography sx={{ ...HIG.caption1, color: HIG.secondaryLabel, mt: 0.25 }}>
                                        Итог по всему уровню
                                      </Typography>
                                    </Stack>
                                    <Button
                                      variant="text"
                                      onClick={() => openLevelTest(levelCode)}
                                      sx={{
                                        ...HIG.subheadline,
                                        fontWeight: 600,
                                        color: theme.palette.primary.main,
                                        textTransform: 'none',
                                        minHeight: 44,
                                        flexShrink: 0,
                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                                      }}
                                    >
                                      Открыть
                                    </Button>
                                  </Stack>
                                </InsetGrouped>
                              </Box>
                            </Tooltip>
                          )}
                          {['mahraj', 'a1', 'a2'].includes(String(c.code || '').toLowerCase()) && (
                            <Tooltip title="Вопросы для ветки онбординга (без Premium)">
                              <Box component="span" sx={{ display: 'block' }}>
                                <InsetGrouped header="Онбординг">
                                  <Stack
                                    direction="row"
                                    alignItems="center"
                                    sx={{ minHeight: HIG.rowMinHeight, px: 2, py: 0.5 }}
                                  >
                                    <QuizOutlined
                                      sx={{ fontSize: 22, color: theme.palette.primary.main, mr: 1.5, flexShrink: 0 }}
                                    />
                                    <Stack sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography sx={{ ...HIG.body, color: HIG.label, lineHeight: 1.3 }}>
                                        Тест ветки ({c.code})
                                      </Typography>
                                      <Typography sx={{ ...HIG.caption1, color: HIG.secondaryLabel, mt: 0.25 }}>
                                        Без Premium
                                      </Typography>
                                    </Stack>
                                    <Button
                                      variant="contained"
                                      onClick={() => openOnboardingPlacement(String(c.code).toLowerCase())}
                                      sx={{
                                        ...iosFilledProminent,
                                        minHeight: 36,
                                        px: 2,
                                        fontSize: '0.8125rem',
                                        flexShrink: 0,
                                      }}
                                    >
                                      Открыть
                                    </Button>
                                  </Stack>
                                </InsetGrouped>
                              </Box>
                            </Tooltip>
                          )}
                          <InsetGrouped header="Модули и уроки">
                            <SortableContext items={mods.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                              {mods.map((m, modIdx) => {
                                const moduleLessons = les.filter((l) => l.moduleId === m.id)
                                const isLastMod = modIdx === mods.length - 1
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
                                    isLast={isLastMod}
                                  >
                                    {expandedModules.has(m.id) && (
                                      <SortableContext items={moduleLessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                                        <Box sx={{ pt: 0.5, pb: 0.5 }}>
                                          {moduleLessons.map((l, li) => (
                                            <SortableLessonRow
                                              key={l.id}
                                              lesson={l}
                                              courseId={c.id}
                                              moduleId={m.id}
                                              navigate={navigate}
                                              onRequestDelete={() => void handleDeleteLesson(l, c.id)}
                                              isDeleting={deletingLessonId === l.id}
                                              isLast={li === moduleLessons.length - 1}
                                            />
                                          ))}
                                        </Box>
                                      </SortableContext>
                                    )}
                                  </SortableModuleRow>
                                )
                              })}
                            </SortableContext>
                          </InsetGrouped>

                          {les.filter((l) => !l.moduleId).length > 0 && (
                            <InsetGrouped header="Уроки вне модуля">
                              {les
                                .filter((l) => !l.moduleId)
                                .sort((a, b) => a.orderIndex - b.orderIndex)
                                .map((l, oi, oa) => {
                                  const pathLoose = `/content/courses/${c.id}/lessons/${l.id}`
                                  return (
                                    <Stack
                                      key={l.id}
                                      direction="row"
                                      alignItems="center"
                                      sx={{
                                        minHeight: HIG.rowCompact,
                                        px: 2,
                                        py: 0.5,
                                        borderBottom:
                                          oi < oa.length - 1 ? `0.5px solid ${HIG.separatorOpaque}` : 'none',
                                        '&:hover': { bgcolor: HIG.fillQuaternary },
                                      }}
                                    >
                                      <ArticleOutlined sx={{ fontSize: 18, color: HIG.secondaryLabel, mr: 1.5, flexShrink: 0 }} />
                                      <Typography
                                        sx={{ ...HIG.subheadline, color: HIG.label, flex: 1, cursor: 'pointer' }}
                                        onClick={() => navigate(pathLoose)}
                                      >
                                        {l.orderIndex}. {l.titleRu}
                                      </Typography>
                                      <Button
                                        variant="text"
                                        onClick={() => navigate(pathLoose)}
                                        sx={{
                                          ...HIG.subheadline,
                                          fontWeight: 600,
                                          color: theme.palette.primary.main,
                                          textTransform: 'none',
                                          minHeight: 44,
                                          flexShrink: 0,
                                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                                        }}
                                      >
                                        Открыть
                                      </Button>
                                      <Tooltip title="Удалить урок">
                                        <span>
                                          <IconButton
                                            disabled={deletingLessonId === l.id}
                                            onClick={() => void handleDeleteLesson(l, c.id)}
                                            aria-label="Удалить урок"
                                            sx={{
                                              width: 44,
                                              height: 44,
                                              color: '#FF3B30',
                                              borderRadius: `${HIG.cornerRadius}px`,
                                            }}
                                          >
                                            {deletingLessonId === l.id ? (
                                              <CircularProgress size={18} sx={{ color: '#FF3B30' }} />
                                            ) : (
                                              <DeleteOutline sx={{ fontSize: 20 }} />
                                            )}
                                          </IconButton>
                                        </span>
                                      </Tooltip>
                                    </Stack>
                                  )
                                })}
                            </InsetGrouped>
                          )}

                          <Box sx={{ px: 1 }}>
                            <Tooltip title={`Добавить урок в «${c.titleRu}»`}>
                              <Button
                                variant="text"
                                startIcon={<Add sx={{ fontSize: 20 }} />}
                                onClick={() => {
                                  setContextCourseId(c.id)
                                  setContextModuleId('')
                                  setCreateLessonOpen(true)
                                }}
                                sx={{
                                  ...HIG.subheadline,
                                  fontWeight: 600,
                                  color: theme.palette.primary.main,
                                  textTransform: 'none',
                                  minHeight: 44,
                                  px: 1,
                                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                                }}
                              >
                                Урок в курс
                              </Button>
                            </Tooltip>
                          </Box>
                        </Stack>
                      </Box>
                    )}
                  </Paper>
                )
              })
          )}
      </Stack>
      </Box>

      <Dialog open={createCourseOpen} onClose={() => setCreateCourseOpen(false)} {...narrowFormSm}>
        <DialogTitle>Новый курс</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField label="Code" value={newCourse.code} onChange={(e) => setNewCourse((p) => ({ ...p, code: e.target.value }))} />
            <TextField label="Название (RU)" value={newCourse.titleRu} onChange={(e) => setNewCourse((p) => ({ ...p, titleRu: e.target.value }))} />
            <TextField label="Описание (RU)" multiline minRows={3} value={newCourse.descriptionRu} onChange={(e) => setNewCourse((p) => ({ ...p, descriptionRu: e.target.value }))} />
            <TextField label="Порядок" type="number" value={newCourse.orderIndex} onChange={(e) => setNewCourse((p) => ({ ...p, orderIndex: Number(e.target.value) || 0 }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={() => setCreateCourseOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={createCourseHandler}>Создать</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createModuleOpen} onClose={() => setCreateModuleOpen(false)} {...narrowFormSm}>
        <DialogTitle>Новый модуль</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField label="Название (RU)" value={newModule.titleRu} onChange={(e) => setNewModule((p) => ({ ...p, titleRu: e.target.value }))} />
            <TextField label="Описание (RU)" multiline minRows={3} value={newModule.descriptionRu} onChange={(e) => setNewModule((p) => ({ ...p, descriptionRu: e.target.value }))} />
            <TextField label="Порядок" type="number" value={newModule.orderIndex} onChange={(e) => setNewModule((p) => ({ ...p, orderIndex: Number(e.target.value) || 0 }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={() => setCreateModuleOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={createModuleHandler}>Создать</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createLessonOpen} onClose={() => setCreateLessonOpen(false)} {...narrowFormSm}>
        <DialogTitle>Новый урок</DialogTitle>
        <DialogContent dividers>
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField fullWidth label="Порядок" type="number" value={newLesson.orderIndex} onChange={(e) => setNewLesson((p) => ({ ...p, orderIndex: Number(e.target.value) || 0 }))} />
              <TextField fullWidth label="Длительность (мин)" type="number" value={newLesson.estimatedMinutes} onChange={(e) => setNewLesson((p) => ({ ...p, estimatedMinutes: Number(e.target.value) || 10 }))} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={() => setCreateLessonOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={createLessonHandler}>Создать</Button>
        </DialogActions>
      </Dialog>
    </Box>
    </DndContext>
  )
}
