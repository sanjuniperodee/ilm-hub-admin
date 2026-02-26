import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Switch,
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
  getCourseById,
  getLessonById,
  getModuleById,
  getTests,
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

type QuestionType = 'multiple_choice' | 'single_choice' | 'fill_blank' | 'match_pairs' | 'manual_input' | 'drag_drop'

export default function TestDetailPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [lesson, setLesson] = useState<any>(null)
  const [course, setCourse] = useState<any>(null)
  const [module, setModule] = useState<any>(null)
  const [lessonTest, setLessonTest] = useState<any | null>(null)

  const [newTestTitle, setNewTestTitle] = useState('')
  const [newTestPassing, setNewTestPassing] = useState(70)

  const breadcrumb = useMemo(() => {
    const parts: string[] = []
    if (course?.titleRu) parts.push(course.titleRu)
    if (module?.titleRu) parts.push(module.titleRu)
    if (lesson?.titleRu) parts.push(lesson.titleRu)
    parts.push('Тест')
    return parts.join(' / ')
  }, [course, module, lesson])

  const notifyError = (e: any, fallback: string) => {
    const msg = e?.response?.data?.message?.[0] || e?.message || fallback
    setError(msg)
  }

  const notifySuccess = (msg: string) => {
    setSuccess(msg)
    setError('')
  }

  const loadData = async () => {
    if (!lessonId) return
    setLoading(true)
    setError('')
    try {
      const { data: lessonData } = await getLessonById(lessonId)
      setLesson(lessonData)

      if (lessonData?.courseId) {
        const { data: courseData } = await getCourseById(lessonData.courseId)
        setCourse(courseData)
      } else setCourse(null)

      if (lessonData?.moduleId) {
        const { data: moduleData } = await getModuleById(lessonData.moduleId)
        setModule(moduleData)
      } else setModule(null)

      const { data: testsData } = await getTests({ testType: 'lesson', lessonId })
      const list = Array.isArray(testsData) ? testsData : []
      setLessonTest(list[0] ?? null)
    } catch (e) {
      notifyError(e, 'Не удалось загрузить данные')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [lessonId])

  const createLessonTest = async () => {
    if (!lessonId) return
    if (!newTestTitle.trim()) {
      setError('Введите название теста')
      return
    }
    try {
      await createTest({
        testType: 'lesson',
        lessonId,
        titleRu: newTestTitle,
        passingScore: Number(newTestPassing) || 70,
      })
      setNewTestTitle('')
      setNewTestPassing(70)
      await loadData()
      notifySuccess('Lesson test создан')
    } catch (e) {
      notifyError(e, 'Не удалось создать lesson test')
    }
  }

  const updateLessonTestMeta = async () => {
    if (!lessonTest?.id) return
    try {
      await updateTestMeta(lessonTest.id, {
        titleRu: lessonTest.titleRu,
        passingScore: Number(lessonTest.passingScore) || 70,
      })
      await loadData()
      notifySuccess('Настройки теста сохранены')
    } catch (e) {
      notifyError(e, 'Не удалось обновить тест')
    }
  }

  const addQuestion = async (type: QuestionType) => {
    if (!lessonTest?.id) return
    try {
      const config = getConfigTemplate(type)
      const { data: createdQuestion } = await createTestQuestion(lessonTest.id, {
        type,
        questionRu: { text: 'Новый вопрос' },
        config,
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
      await loadData()
      notifySuccess('Вопрос добавлен')
    } catch (e) {
      notifyError(e, 'Не удалось добавить вопрос')
    }
  }

  const saveQuestion = async (q: any) => {
    try {
      await updateTestQuestion(q.id, {
        type: q.type,
        orderIndex: Number(q.orderIndex) || 1,
        questionRu: q.questionRu,
        config: q.config || {},
      })
      await loadData()
      notifySuccess('Вопрос сохранен')
    } catch (e) {
      notifyError(e, 'Не удалось сохранить вопрос')
    }
  }

  const removeQuestion = async (questionId: string) => {
    try {
      await deleteTestQuestion(questionId)
      await loadData()
      notifySuccess('Вопрос удален')
    } catch (e) {
      notifyError(e, 'Не удалось удалить вопрос')
    }
  }

  const addAnswer = async (questionId: string, answersCount: number) => {
    try {
      await createTestAnswer(questionId, {
        answerRu: 'Новый вариант',
        orderIndex: answersCount + 1,
        isCorrect: false,
      })
      await loadData()
      notifySuccess('Ответ добавлен')
    } catch (e) {
      notifyError(e, 'Не удалось добавить ответ')
    }
  }

  const saveAnswer = async (a: any) => {
    try {
      await updateTestAnswer(a.id, {
        answerRu: a.answerRu,
        orderIndex: Number(a.orderIndex) || 1,
        isCorrect: !!a.isCorrect,
      })
      await loadData()
      notifySuccess('Ответ сохранен')
    } catch (e) {
      notifyError(e, 'Не удалось сохранить ответ')
    }
  }

  const removeAnswer = async (answerId: string) => {
    try {
      await deleteTestAnswer(answerId)
      await loadData()
      notifySuccess('Ответ удален')
    } catch (e) {
      notifyError(e, 'Не удалось удалить ответ')
    }
  }

  const removeLessonTest = async () => {
    if (!lessonTest?.id) return
    try {
      await deleteTest(lessonTest.id)
      setLessonTest(null)
      notifySuccess('Lesson test удален')
    } catch (e) {
      notifyError(e, 'Не удалось удалить тест')
    }
  }

  const backToLesson = () => {
    navigate(`/content-studio/lessons/${lessonId}`)
  }

  if (!lessonId) {
    return (
      <Box>
        <Alert severity="error">Не указан урок.</Alert>
      </Box>
    )
  }

  if (loading && !lesson) {
    return <LinearProgress sx={{ width: '100%' }} />
  }

  if (!lesson) {
    return (
      <Box>
        <Alert severity="error">Урок не найден.</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {breadcrumb}
      </Typography>

      {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!!success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Тест урока
        </Typography>
        <Button variant="outlined" onClick={backToLesson}>
          К уроку
        </Button>
      </Stack>

      {!lessonTest ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Для этого урока тест еще не создан
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Название lesson test (RU)"
                  value={newTestTitle}
                  onChange={(e) => setNewTestTitle(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Pass %"
                  value={newTestPassing}
                  onChange={(e) => setNewTestPassing(Number(e.target.value) || 70)}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button fullWidth variant="contained" onClick={createLessonTest}>
                  Создать
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={3}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Настройки теста
                </Typography>
                <Button color="error" variant="outlined" onClick={removeLessonTest}>
                  Удалить тест
                </Button>
              </Stack>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} md={9}>
                  <TextField
                    fullWidth
                    label="Название теста"
                    value={lessonTest.titleRu || ''}
                    onChange={(e) => setLessonTest((p: any) => ({ ...p, titleRu: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Pass %"
                    value={lessonTest.passingScore || 70}
                    onChange={(e) => setLessonTest((p: any) => ({ ...p, passingScore: Number(e.target.value) || 70 }))}
                  />
                </Grid>
              </Grid>
              <Button sx={{ mt: 2 }} variant="contained" onClick={updateLessonTestMeta}>
                Сохранить настройки
              </Button>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Вопросы и ответы
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button size="small" variant="outlined" onClick={() => addQuestion('multiple_choice')}>+ multiple_choice</Button>
                  <Button size="small" variant="outlined" onClick={() => addQuestion('single_choice')}>+ single_choice</Button>
                  <Button size="small" variant="outlined" onClick={() => addQuestion('fill_blank')}>+ fill_blank</Button>
                  <Button size="small" variant="outlined" onClick={() => addQuestion('match_pairs')}>+ match_pairs</Button>
                  <Button size="small" variant="outlined" onClick={() => addQuestion('manual_input')}>+ manual_input</Button>
                  <Button size="small" variant="outlined" onClick={() => addQuestion('drag_drop')}>+ drag_drop</Button>
                </Stack>
              </Stack>

              <Stack spacing={2}>
                {(lessonTest.questions || []).map((q: any) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    onSave={saveQuestion}
                    onDelete={() => removeQuestion(q.id)}
                    onAddAnswer={() => addAnswer(q.id, (q.answers || []).length)}
                    onSaveAnswer={saveAnswer}
                    onDeleteAnswer={removeAnswer}
                  />
                ))}
              </Stack>

              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Добавить вопрос
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="outlined" onClick={() => addQuestion('multiple_choice')}>+ multiple_choice</Button>
                <Button size="small" variant="outlined" onClick={() => addQuestion('single_choice')}>+ single_choice</Button>
                <Button size="small" variant="outlined" onClick={() => addQuestion('fill_blank')}>+ fill_blank</Button>
                <Button size="small" variant="outlined" onClick={() => addQuestion('match_pairs')}>+ match_pairs</Button>
                <Button size="small" variant="outlined" onClick={() => addQuestion('manual_input')}>+ manual_input</Button>
                <Button size="small" variant="outlined" onClick={() => addQuestion('drag_drop')}>+ drag_drop</Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  )
}

function QuestionCard({
  question,
  onSave,
  onDelete,
  onAddAnswer,
  onSaveAnswer,
  onDeleteAnswer,
}: {
  question: any
  onSave: (q: any) => void
  onDelete: () => void
  onAddAnswer: () => void
  onSaveAnswer: (a: any) => void
  onDeleteAnswer: (id: string) => void
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

  const renderConfigEditor = () => {
    const type = q.type || 'multiple_choice'
    if (type === 'fill_blank') {
      return (
        <FillBlankConfigEditor
          value={q.config || {}}
          onChange={(config) => setQ({ ...q, config })}
        />
      )
    }
    if (type === 'match_pairs') {
      return (
        <MatchPairsConfigEditor
          value={q.config || {}}
          onChange={(config) => setQ({ ...q, config })}
        />
      )
    }
    if (type === 'manual_input') {
      return (
        <ManualInputConfigEditor
          value={q.config || {}}
          onChange={(config) => setQ({ ...q, config })}
        />
      )
    }
    if (type === 'drag_drop') {
      return (
        <DragDropConfigEditor
          value={q.config || {}}
          onChange={(config) => setQ({ ...q, config })}
        />
      )
    }
    return <MultipleChoiceConfigEditor />
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Grid container spacing={1}>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                label="Type"
                value={q.type || 'multiple_choice'}
                onChange={(e) => {
                  const newType = e.target.value as QuestionType
                  setQ({
                    ...q,
                    type: newType,
                    config: getConfigTemplate(newType),
                  })
                }}
              >
                <MenuItem value="multiple_choice">multiple_choice</MenuItem>
                <MenuItem value="single_choice">single_choice</MenuItem>
                <MenuItem value="fill_blank">fill_blank</MenuItem>
                <MenuItem value="match_pairs">match_pairs</MenuItem>
                <MenuItem value="manual_input">manual_input</MenuItem>
                <MenuItem value="drag_drop">drag_drop</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              size="small"
              label="questionRu.text"
              value={q.questionRu?.text || ''}
              onChange={(e) =>
                setQ({
                  ...q,
                  questionRu: { ...(q.questionRu || {}), text: e.target.value },
                })
              }
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="questionRu.hint"
              value={q.questionRu?.hint || ''}
              onChange={(e) =>
                setQ({
                  ...q,
                  questionRu: { ...(q.questionRu || {}), hint: e.target.value },
                })
              }
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Order"
              value={q.orderIndex || 1}
              onChange={(e) => setQ({ ...q, orderIndex: Number(e.target.value) || 1 })}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Конфиг</Typography>
            {renderConfigEditor()}
          </Grid>
          <Grid item xs={12}>
            <Accordion variant="outlined" sx={{ borderRadius: 1 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                Raw JSON (для продвинутых)
              </AccordionSummary>
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
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                size="small"
                onClick={() => onSave(q)}
              >
                Save question
              </Button>
              {(q.type === 'multiple_choice' || q.type === 'single_choice') && (
                <Button variant="outlined" size="small" onClick={onAddAnswer}>
                  Add answer
                </Button>
              )}
              <Button variant="outlined" color="error" size="small" onClick={onDelete}>
                Delete question
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Stack spacing={1}>
              {(q.answers || []).map((a: any) => (
                <AnswerRow
                  key={a.id}
                  answer={a}
                  onSave={onSaveAnswer}
                  onDelete={onDeleteAnswer}
                />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

function AnswerRow({
  answer,
  onSave,
  onDelete,
}: {
  answer: any
  onSave: (a: any) => void
  onDelete: (id: string) => void
}) {
  const [a, setA] = useState<any>(answer)

  useEffect(() => {
    setA(answer)
  }, [answer])

  return (
    <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
      <CardContent sx={{ py: 1 }}>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={12} md={7}>
            <TextField
              fullWidth
              size="small"
              label="answerRu"
              value={a.answerRu || ''}
              onChange={(e) => setA({ ...a, answerRu: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Order"
              value={a.orderIndex || 1}
              onChange={(e) => setA({ ...a, orderIndex: Number(e.target.value) || 1 })}
            />
          </Grid>
          <Grid item xs={12} md={1.5}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!a.isCorrect}
                  onChange={(e) => setA({ ...a, isCorrect: e.target.checked })}
                />
              }
              label="Correct"
            />
          </Grid>
          <Grid item xs={12} md={1.5}>
            <Stack direction="row" spacing={0.5}>
              <Button size="small" variant="contained" onClick={() => onSave(a)}>
                Save
              </Button>
              <Button size="small" color="error" variant="outlined" onClick={() => onDelete(a.id)}>
                Del
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
