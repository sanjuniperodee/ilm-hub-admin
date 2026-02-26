import { useEffect, useMemo, useState } from 'react'
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
import { ExpandMore } from '@mui/icons-material'
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
  updateTestAnswer,
  updateTestMeta,
  updateTestQuestion,
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
  const [tests, setTests] = useState<any[]>([])
  const [selectedTestId, setSelectedTestId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [courses, setCourses] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [courseId, setCourseId] = useState('')
  const [moduleId, setModuleId] = useState('')

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

  const selectedTest = useMemo(
    () => tests.find((t) => t.id === selectedTestId) || null,
    [tests, selectedTestId],
  )

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [testsRes, coursesRes] = await Promise.all([getTests(), getCourses()])
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

  useEffect(() => {
    void load()
  }, [])

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
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Список тестов ({filteredTests.length})
              </Typography>
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
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              {!selectedTest ? (
                <Typography color="text.secondary">Выберите тест слева</Typography>
              ) : (
                <TestEditor
                  test={selectedTest}
                  reload={load}
                  onError={setError}
                  onSuccess={setToast}
                />
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


