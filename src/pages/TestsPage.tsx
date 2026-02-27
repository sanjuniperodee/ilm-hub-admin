import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ExpandMore, LibraryBooksOutlined, MenuBookOutlined, QuizOutlined } from '@mui/icons-material'
import {
  createTest,
  createTestAnswer,
  createTestQuestion,
  deleteTest,
  deleteTestAnswer,
  deleteTestQuestion,
  getTests,
  getCourses,
  getModules,
  getLessons,
  getLessonById,
  getModuleById,
  updateTestAnswer,
  updateTestMeta,
  updateTestQuestion,
  getTestAttempts,
  getTestStats,
} from '../api/adminApi'
import {
  FillBlankConfigEditor,
  MatchPairsConfigEditor,
  ManualInputConfigEditor,
  DragDropConfigEditor,
  MultipleChoiceConfigEditor,
  getConfigTemplate,
} from '../components/QuestionConfigEditors'

type TestType = 'lesson' | 'module' | 'level'
type QuestionType = 'multiple_choice' | 'single_choice' | 'fill_blank' | 'match_pairs' | 'manual_input' | 'drag_drop'

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'single_choice', label: 'Single choice' },
  { value: 'fill_blank', label: 'Fill blank' },
  { value: 'match_pairs', label: 'Match pairs' },
  { value: 'manual_input', label: 'Manual input' },
  { value: 'drag_drop', label: 'Drag drop' },
]

export default function TestsPage() {
  const location = useLocation()
  const [tests, setTests] = useState<any[]>([])
  const [selectedTestId, setSelectedTestId] = useState<string>('')
  const [selectedTab, setSelectedTab] = useState<'questions' | 'attempts' | 'stats'>('questions')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [courses, setCourses] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [courseId, setCourseId] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [coursesHierarchy, setCoursesHierarchy] = useState<Record<string, { modules: any[]; lessons: any[] }>>({})
  const [hierarchyViewMode, setHierarchyViewMode] = useState<'hierarchy' | 'list'>('hierarchy')
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>([])

  const [creating, setCreating] = useState({
    testType: 'lesson' as TestType,
    lessonId: '',
    levelCode: '',
    titleRu: '',
    passingScore: 70,
  })

  const filteredTests = useMemo(() => {
    return tests.filter((t) => (creating.testType ? t.testType === creating.testType : true))
  }, [tests, creating.testType])

  const levelCodeFromCourseCode = (code: string | undefined): string | null => {
    if (!code) return null
    const normalized = code.trim().toUpperCase()
    const match = normalized.match(/^[A-C][0-9]$/)
    return match ? match[0] : null
  }

  const { testsByLessonId, testsByModuleId, testsByLevelCode } = useMemo(() => {
    const byLesson: Record<string, any[]> = {}
    const byModule: Record<string, any[]> = {}
    const byLevel: Record<string, any[]> = {}
    for (const t of tests) {
      if (t.testType === 'lesson' && t.lessonId) {
        (byLesson[t.lessonId] = byLesson[t.lessonId] || []).push(t)
      }
      if (t.testType === 'module' && t.moduleId) {
        (byModule[t.moduleId] = byModule[t.moduleId] || []).push(t)
      }
      if (t.testType === 'level' && t.levelCode) {
        (byLevel[t.levelCode] = byLevel[t.levelCode] || []).push(t)
      }
    }
    return { testsByLessonId: byLesson, testsByModuleId: byModule, testsByLevelCode: byLevel }
  }, [tests])

  const selectedTest = useMemo(
    () => tests.find((t) => t.id === selectedTestId) || null,
    [tests, selectedTestId],
  )

  const load = async (filters?: {
    testType?: TestType
    lessonId?: string
    moduleId?: string
    levelCode?: string
  }) => {
    setLoading(true)
    setError('')
    try {
      const [testsRes, coursesRes] = await Promise.all([getTests(filters), getCourses()])
      const nextTests = Array.isArray(testsRes.data) ? testsRes.data : []
      setTests(nextTests)
      setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : [])
      if (!selectedTestId && nextTests.length) setSelectedTestId(nextTests[0].id)
    } catch (e: any) {
      setError(e?.response?.data?.message?.[0] || e?.message || 'Failed to load tests')
    } finally {
      setLoading(false)
    }
  }

  const loadModules = async (nextCourseId: string) => {
    if (!nextCourseId) {
      setModules([])
      return
    }
    const { data } = await getModules(nextCourseId)
    setModules(Array.isArray(data) ? data : [])
  }

  const loadLessons = async (nextCourseId?: string, nextModuleId?: string) => {
    const { data } = await getLessons(nextCourseId || courseId || undefined, nextModuleId || moduleId || undefined)
    setLessons(Array.isArray(data) ? data : [])
  }

  const loadCourseHierarchy = async (cId: string) => {
    if (coursesHierarchy[cId]) return
    try {
      const [modRes, lesRes] = await Promise.all([getModules(cId), getLessons(cId)])
      const mods = Array.isArray(modRes.data) ? modRes.data : []
      const les = Array.isArray(lesRes.data) ? lesRes.data : []
      setCoursesHierarchy((prev) => ({ ...prev, [cId]: { modules: mods, lessons: les } }))
    } catch {
      setCoursesHierarchy((prev) => ({ ...prev, [cId]: { modules: [], lessons: [] } }))
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const typeParam = (params.get('testType') || params.get('type')) as TestType | null
    const lessonIdParam = params.get('lessonId') || ''
    const moduleIdParam = params.get('moduleId') || ''
    const levelCodeParam = params.get('levelCode') || ''

    const filters: {
      testType?: TestType
      lessonId?: string
      moduleId?: string
      levelCode?: string
    } = {}

    if (typeParam && ['lesson', 'module', 'level'].includes(typeParam)) {
      filters.testType = typeParam
      setCreating((p) => ({ ...p, testType: typeParam }))
    }
    if (lessonIdParam) filters.lessonId = lessonIdParam
    if (moduleIdParam) filters.moduleId = moduleIdParam
    if (levelCodeParam) filters.levelCode = levelCodeParam

    void load(Object.keys(filters).length ? filters : undefined)
  }, [location.search])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const lessonIdParam = params.get('lessonId') || ''
    const moduleIdParam = params.get('moduleId') || ''
    const levelCodeParam = params.get('levelCode') || ''

    const syncFromUrl = async () => {
      if (lessonIdParam) {
        try {
          const { data: lesson } = await getLessonById(lessonIdParam)
          const cId = lesson?.courseId
          if (cId) {
            setExpandedAccordions((prev) => (prev.includes(cId) ? prev : [...prev, cId]))
            const [modRes, lesRes] = await Promise.all([getModules(cId), getLessons(cId)])
            setCoursesHierarchy((prev) => ({
              ...prev,
              [cId]: { modules: Array.isArray(modRes.data) ? modRes.data : [], lessons: Array.isArray(lesRes.data) ? lesRes.data : [] },
            }))
          }
        } catch {
          // ignore
        }
      } else if (moduleIdParam) {
        try {
          const { data: mod } = await getModuleById(moduleIdParam)
          const cId = mod?.courseId
          if (cId) {
            setExpandedAccordions((prev) => (prev.includes(cId) ? prev : [...prev, cId]))
            const [modRes, lesRes] = await Promise.all([getModules(cId), getLessons(cId)])
            setCoursesHierarchy((prev) => ({
              ...prev,
              [cId]: { modules: Array.isArray(modRes.data) ? modRes.data : [], lessons: Array.isArray(lesRes.data) ? lesRes.data : [] },
            }))
          }
        } catch {
          // ignore
        }
      } else if (levelCodeParam) {
        setExpandedAccordions((prev) => (prev.includes('level') ? prev : ['level', ...prev]))
      }
    }

    void syncFromUrl()
  }, [location.search])

  useEffect(() => {
    if (!courseId) {
      setModuleId('')
      setModules([])
      setLessons([])
      return
    }
    void loadModules(courseId)
    void loadLessons(courseId, moduleId || undefined)
  }, [courseId])

  useEffect(() => {
    if (!courseId) return
    void loadLessons(courseId, moduleId || undefined)
    if (creating.testType === 'module') {
      setCreating((p) => ({ ...p, lessonId: '' }))
    }
  }, [moduleId])

  const validateCreate = () => {
    if (!creating.titleRu.trim()) return 'Укажите название теста'
    if (creating.testType === 'lesson' && !creating.lessonId) return 'Выберите урок для lesson-теста'
    if (creating.testType === 'module' && !moduleId) return 'Выберите модуль для module-теста'
    if (creating.testType === 'level' && !creating.levelCode.trim()) return 'Укажите levelCode (например A1)'
    return ''
  }

  const onCreateTest = async () => {
    const validationError = validateCreate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setLoading(true)
    try {
      await createTest({
        testType: creating.testType,
        lessonId: creating.testType === 'lesson' ? creating.lessonId : undefined,
        moduleId: creating.testType === 'module' ? moduleId : undefined,
        levelCode: creating.testType === 'level' ? creating.levelCode : undefined,
        titleRu: creating.titleRu,
        passingScore: creating.passingScore,
      })
      setCreating((p) => ({ ...p, titleRu: '', levelCode: '' }))
      setToast('Тест создан')
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось создать тест')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Tests
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Управление Lesson / Module / Level тестами, вопросами и ответами.
      </Typography>
      {!!error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Создать тест (мастер)
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel id="test-type-label">Тип теста</InputLabel>
                <Select
                  labelId="test-type-label"
                  label="Тип теста"
                  value={creating.testType}
                  onChange={(e) =>
                    setCreating((p) => ({
                      ...p,
                      testType: e.target.value as TestType,
                      lessonId: '',
                      levelCode: '',
                    }))
                  }
                >
                  <MenuItem value="lesson">lesson</MenuItem>
                  <MenuItem value="module">module</MenuItem>
                  <MenuItem value="level">level</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel id="course-label">Курс (опционально)</InputLabel>
                <Select
                  labelId="course-label"
                  label="Курс (опционально)"
                  value={courseId}
                  onChange={(e) => setCourseId(String(e.target.value))}
                >
                  <MenuItem value="">Все курсы</MenuItem>
                  {courses.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.titleRu || c.code}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth disabled={!courseId}>
                <InputLabel id="module-label">Модуль</InputLabel>
                <Select
                  labelId="module-label"
                  label="Модуль"
                  value={moduleId}
                  onChange={(e) => setModuleId(String(e.target.value))}
                >
                  <MenuItem value="">Все модули</MenuItem>
                  {modules.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.titleRu}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="levelCode"
                value={creating.levelCode}
                onChange={(e) => setCreating((p) => ({ ...p, levelCode: e.target.value }))}
                disabled={creating.testType !== 'level'}
                placeholder="A1 / A2 / B1..."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={creating.testType !== 'lesson'}>
                <InputLabel id="lesson-label">Урок</InputLabel>
                <Select
                  labelId="lesson-label"
                  label="Урок"
                  value={creating.lessonId}
                  onChange={(e) => setCreating((p) => ({ ...p, lessonId: String(e.target.value) }))}
                >
                  <MenuItem value="">Выберите урок</MenuItem>
                  {lessons.map((l) => (
                    <MenuItem key={l.id} value={l.id}>
                      {l.titleRu}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Название (RU)"
                value={creating.titleRu}
                onChange={(e) => setCreating((p) => ({ ...p, titleRu: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={1}>
              <TextField
                fullWidth
                type="number"
                label="pass %"
                value={creating.passingScore}
                onChange={(e) => setCreating((p) => ({ ...p, passingScore: Number(e.target.value) || 70 }))}
              />
            </Grid>
            <Grid item xs={12} md={1}>
              <Button variant="contained" fullWidth onClick={onCreateTest} disabled={loading}>
                Create
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card sx={{ maxHeight: { md: 'calc(100vh - 200px)' }, overflow: 'auto' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">
                  {hierarchyViewMode === 'hierarchy' ? 'Тесты по иерархии' : `Список (${filteredTests.length})`}
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  <Button
                    size="small"
                    variant={hierarchyViewMode === 'hierarchy' ? 'contained' : 'outlined'}
                    onClick={() => setHierarchyViewMode('hierarchy')}
                  >
                    Иерархия
                  </Button>
                  <Button
                    size="small"
                    variant={hierarchyViewMode === 'list' ? 'contained' : 'outlined'}
                    onClick={() => setHierarchyViewMode('list')}
                  >
                    Список
                  </Button>
                </Stack>
              </Stack>

              {hierarchyViewMode === 'hierarchy' ? (
                <TestsHierarchyTree
                  courses={courses}
                  coursesHierarchy={coursesHierarchy}
                  loadCourseHierarchy={loadCourseHierarchy}
                  testsByLessonId={testsByLessonId}
                  testsByModuleId={testsByModuleId}
                  testsByLevelCode={testsByLevelCode}
                  levelCodeFromCourseCode={levelCodeFromCourseCode}
                  selectedTestId={selectedTestId}
                  onSelectTest={setSelectedTestId}
                  expandedAccordions={expandedAccordions}
                  onExpandedChange={setExpandedAccordions}
                />
              ) : (
                <Stack spacing={1}>
                  {filteredTests.map((t) => (
                    <Card
                      key={t.id}
                      variant={selectedTestId === t.id ? 'elevation' : 'outlined'}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedTestId(t.id)}
                    >
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography fontWeight={700}>{t.titleRu || t.id}</Typography>
                          <Chip size="small" label={t.testType} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          lesson: {t.lessonId || '-'} | module: {t.moduleId || '-'} | level: {t.levelCode || '-'}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              {!selectedTest ? (
                <Typography color="text.secondary">Выберите тест слева</Typography>
              ) : (
                <Box>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Button
                      size="small"
                      variant={selectedTab === 'questions' ? 'contained' : 'text'}
                      onClick={() => setSelectedTab('questions')}
                    >
                      Вопросы
                    </Button>
                    <Button
                      size="small"
                      variant={selectedTab === 'attempts' ? 'contained' : 'text'}
                      onClick={() => setSelectedTab('attempts')}
                    >
                      Попытки
                    </Button>
                    <Button
                      size="small"
                      variant={selectedTab === 'stats' ? 'contained' : 'text'}
                      onClick={() => setSelectedTab('stats')}
                    >
                      Статистика
                    </Button>
                  </Stack>
                  {selectedTab === 'questions' && (
                    <TestEditor
                      test={selectedTest}
                      reload={load}
                      onError={setError}
                      onSuccess={setToast}
                    />
                  )}
                  {selectedTab === 'attempts' && <TestAttemptsPanel testId={selectedTest.id} />}
                  {selectedTab === 'stats' && <TestStatsPanel testId={selectedTest.id} />}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  )
}

function TestsHierarchyTree({
  courses,
  coursesHierarchy,
  loadCourseHierarchy,
  testsByLessonId,
  testsByModuleId,
  testsByLevelCode,
  levelCodeFromCourseCode,
  selectedTestId,
  onSelectTest,
  expandedAccordions,
  onExpandedChange,
}: {
  courses: any[]
  coursesHierarchy: Record<string, { modules: any[]; lessons: any[] }>
  loadCourseHierarchy: (courseId: string) => Promise<void>
  testsByLessonId: Record<string, any[]>
  testsByModuleId: Record<string, any[]>
  testsByLevelCode: Record<string, any[]>
  levelCodeFromCourseCode: (code: string | undefined) => string | null
  selectedTestId: string
  onSelectTest: (id: string) => void
  expandedAccordions: string[]
  onExpandedChange: (ids: string[]) => void
}) {
  const toggleAccordion = (id: string) => {
    onExpandedChange(expandedAccordions.includes(id) ? expandedAccordions.filter((x) => x !== id) : [...expandedAccordions, id])
  }
  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    [courses],
  )

  const standaloneLevelCodes = useMemo(() => {
    const matched = new Set(sortedCourses.map((c) => levelCodeFromCourseCode(c.code)).filter(Boolean))
    return Object.keys(testsByLevelCode).filter((lc) => !matched.has(lc))
  }, [sortedCourses, testsByLevelCode, levelCodeFromCourseCode])

  return (
    <Stack spacing={1}>
      {standaloneLevelCodes.length > 0 && (
        <Accordion
          variant="outlined"
          expanded={expandedAccordions.includes('level')}
          onChange={() => toggleAccordion('level')}
          sx={{ borderRadius: 1, '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <QuizOutlined sx={{ fontSize: 18 }} />
              <Typography variant="subtitle2" fontWeight={600}>
                Тесты уровней
              </Typography>
              <Chip
                size="small"
                label={standaloneLevelCodes.reduce((s, lc) => s + (testsByLevelCode[lc]?.length || 0), 0)}
                color="primary"
                variant="outlined"
              />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={0.5}>
              {standaloneLevelCodes.map((lc) =>
                (testsByLevelCode[lc] || []).map((t) => (
                  <Chip
                    key={t.id}
                    label={`${lc}: ${t.titleRu || t.id}`}
                    size="small"
                    onClick={() => onSelectTest(t.id)}
                    color={selectedTestId === t.id ? 'primary' : 'default'}
                    sx={{ cursor: 'pointer', alignSelf: 'flex-start' }}
                  />
                )),
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}
      {sortedCourses.map((c) => {
        const levelCode = levelCodeFromCourseCode(c.code)
        const levelTests = levelCode ? (testsByLevelCode[levelCode] || []) : []
        const hierarchy = coursesHierarchy[c.id]

        return (
          <Accordion
            key={c.id}
            variant="outlined"
            expanded={expandedAccordions.includes(c.id)}
            onChange={() => {
              toggleAccordion(c.id)
              if (!expandedAccordions.includes(c.id)) void loadCourseHierarchy(c.id)
            }}
            sx={{ borderRadius: 1, '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {c.orderIndex ?? ''}. {c.titleRu || c.code}
                </Typography>
                <Chip size="small" label={c.code} variant="outlined" />
                {(() => {
                  const total =
                    levelTests.length +
                    (hierarchy
                      ? hierarchy.modules.reduce(
                          (sum: number, m: any) =>
                            sum + (testsByModuleId[m.id]?.length || 0) + hierarchy.lessons.filter((l: any) => l.moduleId === m.id).reduce((s: number, l: any) => s + (testsByLessonId[l.id]?.length || 0), 0),
                          0,
                        ) + hierarchy.lessons.filter((l: any) => !l.moduleId).reduce((s: number, l: any) => s + (testsByLessonId[l.id]?.length || 0), 0)
                      : 0)
                  return total > 0 ? <Chip size="small" label={total} color="primary" variant="outlined" /> : null
                })()}
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1.5}>
                {levelTests.length > 0 && (
                  <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <QuizOutlined sx={{ fontSize: 18 }} />
                      <Typography variant="caption" fontWeight={600}>
                        Тест курса ({levelCode})
                      </Typography>
                    </Stack>
                    {levelTests.map((t) => (
                      <Chip
                        key={t.id}
                        label={t.titleRu || t.id}
                        size="small"
                        onClick={() => onSelectTest(t.id)}
                        color={selectedTestId === t.id ? 'primary' : 'default'}
                        sx={{ mr: 0.5, mb: 0.5, cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                )}
                {!hierarchy ? (
                  <Typography variant="caption" color="text.secondary">
                    Раскройте для загрузки модулей и уроков
                  </Typography>
                ) : (
                  <>
                    {hierarchy.modules
                      .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                      .map((m: any) => {
                        const moduleTests = testsByModuleId[m.id] || []
                        const moduleLessons = hierarchy.lessons.filter((l: any) => l.moduleId === m.id).sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                        return (
                          <Box key={m.id} sx={{ p: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                <MenuBookOutlined sx={{ fontSize: 16 }} />
                                <Typography variant="caption" fontWeight={600}>
                                  {m.orderIndex}. {m.titleRu}
                                </Typography>
                              </Stack>
                              {moduleTests.map((t) => (
                                <Chip
                                  key={t.id}
                                  label="Тест модуля"
                                  size="small"
                                  onClick={() => onSelectTest(t.id)}
                                  color={selectedTestId === t.id ? 'primary' : 'default'}
                                  sx={{ cursor: 'pointer' }}
                                />
                              ))}
                            </Stack>
                            <Stack spacing={0.25} sx={{ pl: 1.5 }}>
                              {moduleLessons.map((l: any) => {
                                const lessonTests = testsByLessonId[l.id] || []
                                return (
                                  <Stack key={l.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.25 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      {l.orderIndex}. {l.titleRu}
                                    </Typography>
                                    {lessonTests.map((t) => (
                                      <Chip
                                        key={t.id}
                                        label="Тест"
                                        size="small"
                                        variant="outlined"
                                        onClick={() => onSelectTest(t.id)}
                                        color={selectedTestId === t.id ? 'primary' : 'default'}
                                        sx={{ cursor: 'pointer' }}
                                      />
                                    ))}
                                  </Stack>
                                )
                              })}
                            </Stack>
                          </Box>
                        )
                      })}
                    {hierarchy.lessons.filter((l: any) => !l.moduleId).length > 0 && (
                      <Box sx={{ p: 1, borderRadius: 1, border: '1px dashed', borderColor: 'divider' }}>
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
                          <LibraryBooksOutlined sx={{ fontSize: 16 }} />
                          <Typography variant="caption" fontWeight={600}>
                            Уроки без модуля
                          </Typography>
                        </Stack>
                        <Stack spacing={0.25} sx={{ pl: 1.5 }}>
                          {hierarchy.lessons
                            .filter((l: any) => !l.moduleId)
                            .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                            .map((l: any) => {
                              const lessonTests = testsByLessonId[l.id] || []
                              return (
                                <Stack key={l.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.25 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {l.orderIndex}. {l.titleRu}
                                  </Typography>
                                  {lessonTests.map((t) => (
                                    <Chip
                                      key={t.id}
                                      label="Тест"
                                      size="small"
                                      variant="outlined"
                                      onClick={() => onSelectTest(t.id)}
                                      color={selectedTestId === t.id ? 'primary' : 'default'}
                                      sx={{ cursor: 'pointer' }}
                                    />
                                  ))}
                                </Stack>
                              )
                            })}
                        </Stack>
                      </Box>
                    )}
                  </>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        )
      })}
    </Stack>
  )
}

function TestAttemptsPanel({ testId }: { testId: string }) {
  const [attempts, setAttempts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getTestAttempts(testId)
      setAttempts(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось загрузить попытки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [testId])

  if (loading && !attempts.length) {
    return <Typography color="text.secondary">Загрузка попыток…</Typography>
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 1 }}>
        {error}
      </Alert>
    )
  }

  if (!attempts.length) {
    return <Typography color="text.secondary">Пока нет попыток по этому тесту.</Typography>
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1">
        Всего попыток: {attempts.length}
      </Typography>
      {attempts.map((a) => {
        const createdAt = a.createdAt ? new Date(a.createdAt) : null
        const completedAt = a.completedAt ? new Date(a.completedAt) : null
        const userLabel = a.user?.email || a.user?.phone || a.userId
        return (
          <Card key={a.id} variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2">
                    Попытка #{a.attemptNumber} — {a.score ?? 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Пользователь: {userLabel}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Создана: {createdAt ? createdAt.toLocaleString('ru-RU') : '—'}
                    {completedAt && ` · Завершена: ${completedAt.toLocaleString('ru-RU')}`}
                  </Typography>
                </Stack>
                <Chip
                  size="small"
                  label={a.isPassed ? 'Пройдено' : 'Не пройдено'}
                  color={a.isPassed ? 'success' : 'default'}
                />
              </Stack>
            </CardContent>
          </Card>
        )
      })}
    </Stack>
  )
}

function TestStatsPanel({ testId }: { testId: string }) {
  const [stats, setStats] = useState<{
    attemptsTotal: number
    usersTotal: number
    passedCount: number
    avgScore: number
    bestScore: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getTestStats(testId)
      setStats(data || null)
    } catch (e: any) {
      setError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось загрузить статистику')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [testId])

  if (loading && !stats) {
    return <Typography color="text.secondary">Загрузка статистики…</Typography>
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 1 }}>
        {error}
      </Alert>
    )
  }

  if (!stats) {
    return <Typography color="text.secondary">Статистика пока недоступна.</Typography>
  }

  const passRate = stats.attemptsTotal
    ? Math.round((stats.passedCount / stats.attemptsTotal) * 100)
    : 0

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1">Сводка по тесту</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <Typography variant="body2" color="text.secondary">
            Всего попыток
          </Typography>
          <Typography variant="h6">{stats.attemptsTotal}</Typography>
        </Grid>
        <Grid item xs={6} md={3}>
          <Typography variant="body2" color="text.secondary">
            Пользователей
          </Typography>
          <Typography variant="h6">{stats.usersTotal}</Typography>
        </Grid>
        <Grid item xs={6} md={3}>
          <Typography variant="body2" color="text.secondary">
            Пройдено
          </Typography>
          <Typography variant="h6">
            {stats.passedCount} ({passRate}%)
          </Typography>
        </Grid>
        <Grid item xs={6} md={3}>
          <Typography variant="body2" color="text.secondary">
            Лучший результат
          </Typography>
          <Typography variant="h6">{Math.round(stats.bestScore)}%</Typography>
        </Grid>
        <Grid item xs={6} md={3}>
          <Typography variant="body2" color="text.secondary">
            Средний балл
          </Typography>
          <Typography variant="h6">{Math.round(stats.avgScore)}%</Typography>
        </Grid>
      </Grid>
    </Stack>
  )
}

function TestEditor({
  test,
  reload,
  onError,
  onSuccess,
}: {
  test: any
  reload: () => Promise<void>
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
}) {
  const [local, setLocal] = useState<any>(test)

  useEffect(() => {
    setLocal(test)
  }, [test])

  useEffect(() => {
    setLocal(test)
  }, [test])

  const saveMeta = async () => {
    try {
      await updateTestMeta(local.id, {
        titleRu: local.titleRu,
        titleKz: local.titleKz,
        titleAr: local.titleAr,
        passingScore: Number(local.passingScore),
      })
      onSuccess('Тест сохранен')
      await reload()
    } catch (e: any) {
      onError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось сохранить тест')
    }
  }

  const removeTest = async () => {
    try {
      await deleteTest(local.id)
      onSuccess('Тест удален')
      await reload()
    } catch (e: any) {
      onError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось удалить тест')
    }
  }

  const addQuestion = async (type: QuestionType) => {
    try {
      const { data: createdQuestion } = await createTestQuestion(local.id, {
        type,
        questionRu: { text: 'Новый вопрос' },
        config: getConfigTemplate(type),
      })

      if ((type === 'multiple_choice' || type === 'single_choice') && createdQuestion?.id) {
        const defaults = ['Вариант 1', 'Вариант 2', 'Вариант 3', 'Вариант 4']
        for (let i = 0; i < defaults.length; i += 1) {
          await createTestAnswer(createdQuestion.id, {
            answerRu: defaults[i],
            isCorrect: i === 0,
            orderIndex: i + 1,
          })
        }
      }

      onSuccess('Вопрос добавлен')
      await reload()
    } catch (e: any) {
      onError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось добавить вопрос')
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Редактирование теста</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="titleRu" value={local.titleRu || ''} onChange={(e) => setLocal({ ...local, titleRu: e.target.value })} />
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField fullWidth label="passingScore" type="number" value={local.passingScore || 70} onChange={(e) => setLocal({ ...local, passingScore: Number(e.target.value) || 70 })} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={saveMeta}>Save</Button>
            <Button color="error" variant="outlined" onClick={removeTest}>Delete test</Button>
          </Stack>
        </Grid>
      </Grid>

      <Divider />
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Вопросы</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {QUESTION_TYPES.map((t) => (
            <Button key={t.value} size="small" variant="outlined" onClick={() => addQuestion(t.value)}>
              + {t.label}
            </Button>
          ))}
        </Stack>
      </Stack>

      <Stack spacing={2}>
        {(local.questions || []).map((q: any) => (
          <QuestionEditor
            key={q.id}
            question={q}
            reload={reload}
            onError={onError}
            onSuccess={onSuccess}
          />
        ))}
      </Stack>
    </Stack>
  )
}

function QuestionEditor({
  question,
  reload,
  onError,
  onSuccess,
}: {
  question: any
  reload: () => Promise<void>
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
}) {
  const [q, setQ] = useState<any>(question)
  const [configText, setConfigText] = useState(JSON.stringify(question.config || {}, null, 2))

  useEffect(() => {
    setQ(question)
    setConfigText(JSON.stringify(question.config || {}, null, 2))
  }, [question])

  useEffect(() => {
    setConfigText(JSON.stringify(q.config || {}, null, 2))
  }, [q.config])

  const save = async () => {
    try {
      await updateTestQuestion(q.id, {
        type: q.type,
        questionRu: q.questionRu,
        config: q.config || {},
        orderIndex: q.orderIndex,
      })
      onSuccess('Вопрос сохранен')
      await reload()
    } catch (e: any) {
      onError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось сохранить вопрос')
    }
  }

  const remove = async () => {
    try {
      await deleteTestQuestion(q.id)
      onSuccess('Вопрос удален')
      await reload()
    } catch (e: any) {
      onError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось удалить вопрос')
    }
  }

  const addAnswer = async () => {
    try {
      await createTestAnswer(q.id, {
        answerRu: 'Новый вариант',
        isCorrect: false,
        orderIndex: (q.answers?.length || 0) + 1,
      })
      onSuccess('Ответ добавлен')
      await reload()
    } catch (e: any) {
      onError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось добавить ответ')
    }
  }

  const renderConfigEditor = () => {
    const type = q.type || 'multiple_choice'
    if (type === 'fill_blank') {
      return <FillBlankConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} />
    }
    if (type === 'match_pairs') {
      return <MatchPairsConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} />
    }
    if (type === 'manual_input') {
      return <ManualInputConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} />
    }
    if (type === 'drag_drop') {
      return <DragDropConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} />
    }
    return <MultipleChoiceConfigEditor />
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Grid container spacing={1}>
            <Grid item xs={12} md={2}>
              <Select
                fullWidth
                value={q.type || 'multiple_choice'}
                onChange={(e) => {
                  const newType = e.target.value as QuestionType
                  setQ({ ...q, type: newType, config: getConfigTemplate(newType) })
                }}
              >
                <MenuItem value="multiple_choice">multiple_choice</MenuItem>
                <MenuItem value="single_choice">single_choice</MenuItem>
                <MenuItem value="fill_blank">fill_blank</MenuItem>
                <MenuItem value="match_pairs">match_pairs</MenuItem>
                <MenuItem value="manual_input">manual_input</MenuItem>
                <MenuItem value="drag_drop">drag_drop</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="questionRu.text"
                value={q.questionRu?.text || ''}
                onChange={(e) => setQ({ ...q, questionRu: { ...(q.questionRu || {}), text: e.target.value } })}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="orderIndex"
                type="number"
                value={q.orderIndex || 1}
                onChange={(e) => setQ({ ...q, orderIndex: Number(e.target.value) || 1 })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="questionRu.hint"
                value={q.questionRu?.hint || ''}
                onChange={(e) => setQ({ ...q, questionRu: { ...(q.questionRu || {}), hint: e.target.value } })}
                placeholder="Подсказка для студента"
              />
            </Grid>
          </Grid>
          <Typography variant="subtitle2">Конфиг</Typography>
          {renderConfigEditor()}
          <Accordion variant="outlined">
            <AccordionSummary expandIcon={<ExpandMore />}>Raw JSON (для продвинутых)</AccordionSummary>
            <AccordionDetails>
              <TextField
                fullWidth
                multiline
                minRows={3}
                size="small"
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
                onBlur={() => {
                  try {
                    const parsed = JSON.parse(configText || '{}')
                    setQ({ ...q, config: parsed })
                  } catch {
                    // ignore invalid JSON
                  }
                }}
              />
            </AccordionDetails>
          </Accordion>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={save}>Save question</Button>
            {(q.type === 'multiple_choice' || q.type === 'single_choice') && (
              <Button variant="outlined" onClick={addAnswer}>Add answer</Button>
            )}
            <Button color="error" variant="outlined" onClick={remove}>Delete question</Button>
          </Stack>

          <Stack spacing={1}>
            {(q.answers || []).map((a: any) => (
              <AnswerEditor
                key={a.id}
                answer={a}
                reload={reload}
                onError={onError}
                onSuccess={onSuccess}
              />
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

function AnswerEditor({
  answer,
  reload,
  onError,
  onSuccess,
}: {
  answer: any
  reload: () => Promise<void>
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
}) {
  const [a, setA] = useState<any>(answer)

  useEffect(() => setA(answer), [answer])

  const save = async () => {
    try {
      await updateTestAnswer(a.id, {
        answerRu: a.answerRu,
        answerKz: a.answerKz,
        answerAr: a.answerAr,
        orderIndex: Number(a.orderIndex) || 1,
        isCorrect: !!a.isCorrect,
      })
      onSuccess('Ответ сохранен')
      await reload()
    } catch (e: any) {
      onError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось сохранить ответ')
    }
  }

  const remove = async () => {
    try {
      await deleteTestAnswer(a.id)
      onSuccess('Ответ удален')
      await reload()
    } catch (e: any) {
      onError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось удалить ответ')
    }
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Grid container spacing={1}>
          <Grid item xs={12} md={7}>
            <TextField fullWidth label="answerRu" value={a.answerRu || ''} onChange={(e) => setA({ ...a, answerRu: e.target.value })} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField fullWidth label="order" type="number" value={a.orderIndex || 1} onChange={(e) => setA({ ...a, orderIndex: Number(e.target.value) || 1 })} />
          </Grid>
          <Grid item xs={12} md={1}>
            <Select fullWidth value={a.isCorrect ? '1' : '0'} onChange={(e) => setA({ ...a, isCorrect: e.target.value === '1' })}>
              <MenuItem value="0">No</MenuItem>
              <MenuItem value="1">Yes</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} md={2}>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="contained" onClick={save}>Save</Button>
              <Button size="small" color="error" variant="outlined" onClick={remove}>Del</Button>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}


