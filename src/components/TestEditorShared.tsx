import { useState, useEffect } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { ArrowBack, ExpandMore } from '@mui/icons-material'
import {
  createTest,
  createTestAnswer,
  createTestQuestion,
  deleteTest,
  deleteTestAnswer,
  deleteTestQuestion,
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
} from './QuestionConfigEditors'

type QuestionType = 'multiple_choice' | 'single_choice' | 'fill_blank' | 'match_pairs' | 'manual_input' | 'drag_drop'

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'single_choice', label: 'Single choice' },
  { value: 'fill_blank', label: 'Fill blank' },
  { value: 'match_pairs', label: 'Match pairs' },
  { value: 'manual_input', label: 'Manual input' },
  { value: 'drag_drop', label: 'Drag drop' },
]

export interface TestEditorSharedProps {
  testType: 'lesson' | 'module' | 'level'
  lessonId?: string
  moduleId?: string
  levelCode?: string
  title: string
  onBack: () => void
}

export function TestEditorShared({
  testType,
  lessonId,
  moduleId,
  levelCode,
  title,
  onBack,
}: TestEditorSharedProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [test, setTest] = useState<any | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newPassing, setNewPassing] = useState(70)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const params: any = { testType }
      if (lessonId) params.lessonId = lessonId
      if (moduleId) params.moduleId = moduleId
      if (levelCode) params.levelCode = levelCode
      const { data } = await getTests(params)
      const list = Array.isArray(data) ? data : []
      setTest(list[0] ?? null)
    } catch (e: any) {
      setError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось загрузить тест')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [testType, lessonId, moduleId, levelCode])

  const notifyError = (msg: string) => {
    setError(msg)
  }
  const notifySuccess = (msg: string) => {
    setSuccess(msg)
    setError('')
  }

  const createTestHandler = async () => {
    if (!newTitle.trim()) {
      setError('Введите название теста')
      return
    }
    try {
      await createTest({
        testType,
        lessonId: testType === 'lesson' ? lessonId : undefined,
        moduleId: testType === 'module' ? moduleId : undefined,
        levelCode: testType === 'level' ? levelCode : undefined,
        titleRu: newTitle,
        passingScore: Number(newPassing) || 70,
      })
      setNewTitle('')
      setNewPassing(70)
      await load()
      notifySuccess('Тест создан')
    } catch (e: any) {
      notifyError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось создать тест')
    }
  }

  const updateMeta = async () => {
    if (!test?.id) return
    try {
      await updateTestMeta(test.id, {
        titleRu: test.titleRu,
        passingScore: Number(test.passingScore) || 70,
      })
      await load()
      notifySuccess('Настройки сохранены')
    } catch (e: any) {
      notifyError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось сохранить')
    }
  }

  const removeTest = async () => {
    if (!test?.id) return
    try {
      await deleteTest(test.id)
      setTest(null)
      notifySuccess('Тест удален')
    } catch (e: any) {
      notifyError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось удалить')
    }
  }

  const addQuestion = async (type: QuestionType) => {
    if (!test?.id) return
    try {
      const config = getConfigTemplate(type)
      const { data: created } = await createTestQuestion(test.id, {
        type,
        questionRu: { text: 'Новый вопрос' },
        config,
      })
      if ((type === 'multiple_choice' || type === 'single_choice') && created?.id) {
        for (let i = 0; i < 4; i++) {
          await createTestAnswer(created.id, {
            answerRu: `Вариант ${i + 1}`,
            isCorrect: i === 0,
            orderIndex: i + 1,
          })
        }
      }
      await load()
      notifySuccess('Вопрос добавлен')
    } catch (e: any) {
      notifyError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось добавить вопрос')
    }
  }

  const saveQuestion = async (q: any) => {
    try {
      await updateTestQuestion(q.id, {
        type: q.type,
        orderIndex: q.orderIndex || 1,
        questionRu: q.questionRu,
        config: q.config || {},
      })
      await load()
      notifySuccess('Вопрос сохранен')
    } catch (e: any) {
      notifyError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось сохранить')
    }
  }

  const removeQuestion = async (id: string) => {
    try {
      await deleteTestQuestion(id)
      await load()
      notifySuccess('Вопрос удален')
    } catch (e: any) {
      notifyError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось удалить')
    }
  }

  const addAnswer = async (questionId: string, count: number) => {
    try {
      await createTestAnswer(questionId, {
        answerRu: 'Новый вариант',
        orderIndex: count + 1,
        isCorrect: false,
      })
      await load()
      notifySuccess('Ответ добавлен')
    } catch (e: any) {
      notifyError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось добавить')
    }
  }

  const saveAnswer = async (a: any) => {
    try {
      await updateTestAnswer(a.id, {
        answerRu: a.answerRu,
        orderIndex: Number(a.orderIndex) || 1,
        isCorrect: !!a.isCorrect,
      })
      await load()
      notifySuccess('Ответ сохранен')
    } catch (e: any) {
      notifyError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось сохранить')
    }
  }

  const removeAnswer = async (id: string) => {
    try {
      await deleteTestAnswer(id)
      await load()
      notifySuccess('Ответ удален')
    } catch (e: any) {
      notifyError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось удалить')
    }
  }

  if (loading && !test) {
    return <Typography color="text.secondary">Загрузка…</Typography>
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBack />} onClick={onBack} size="small" variant="text">
          Назад
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Stack>

      {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!!success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {!test ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Тест ещё не создан
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Название теста (RU)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Проходной %"
                  value={newPassing}
                  onChange={(e) => setNewPassing(Number(e.target.value) || 70)}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button fullWidth variant="contained" onClick={createTestHandler}>
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
                <Button color="error" variant="outlined" onClick={removeTest}>
                  Удалить тест
                </Button>
              </Stack>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} md={9}>
                  <TextField
                    fullWidth
                    label="Название"
                    value={test.titleRu || ''}
                    onChange={(e) => setTest((p: any) => ({ ...p, titleRu: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Проходной %"
                    value={test.passingScore || 70}
                    onChange={(e) => setTest((p: any) => ({ ...p, passingScore: Number(e.target.value) || 70 }))}
                  />
                </Grid>
              </Grid>
              <Button sx={{ mt: 2 }} variant="contained" onClick={updateMeta}>
                Сохранить настройки
              </Button>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Вопросы
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {QUESTION_TYPES.map((t) => (
                    <Button key={t.value} size="small" variant="outlined" onClick={() => addQuestion(t.value)}>
                      + {t.label}
                    </Button>
                  ))}
                </Stack>
              </Stack>
              <Stack spacing={2}>
                {(test.questions || []).map((q: any) => (
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
  const [q, setQ] = useState(question)
  const [configText, setConfigText] = useState(JSON.stringify(question.config || {}, null, 2))

  useEffect(() => {
    setQ(question)
    setConfigText(JSON.stringify(question.config || {}, null, 2))
  }, [question])

  const renderConfig = () => {
    const type = q.type || 'multiple_choice'
    if (type === 'fill_blank') return <FillBlankConfigEditor value={q.config || {}} onChange={(c) => setQ({ ...q, config: c })} />
    if (type === 'match_pairs') return <MatchPairsConfigEditor value={q.config || {}} onChange={(c) => setQ({ ...q, config: c })} />
    if (type === 'manual_input') return <ManualInputConfigEditor value={q.config || {}} onChange={(c) => setQ({ ...q, config: c })} />
    if (type === 'drag_drop') return <DragDropConfigEditor value={q.config || {}} onChange={(c) => setQ({ ...q, config: c })} />
    return <MultipleChoiceConfigEditor />
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Grid container spacing={1}>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Тип</InputLabel>
              <Select
                label="Тип"
                value={q.type || 'multiple_choice'}
                onChange={(e) => {
                  const t = e.target.value as QuestionType
                  setQ({ ...q, type: t, config: getConfigTemplate(t) })
                }}
              >
                {QUESTION_TYPES.map((qt) => (
                  <MenuItem key={qt.value} value={qt.value}>{qt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              size="small"
              label="Текст вопроса"
              value={q.questionRu?.text || ''}
              onChange={(e) => setQ({ ...q, questionRu: { ...(q.questionRu || {}), text: e.target.value } })}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Порядок"
              value={q.orderIndex || 1}
              onChange={(e) => setQ({ ...q, orderIndex: Number(e.target.value) || 1 })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Подсказка"
              value={q.questionRu?.hint || ''}
              onChange={(e) => setQ({ ...q, questionRu: { ...(q.questionRu || {}), hint: e.target.value } })}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Конфиг</Typography>
            {renderConfig()}
          </Grid>
          <Grid item xs={12}>
            <Accordion variant="outlined">
              <AccordionSummary expandIcon={<ExpandMore />}>Raw JSON</AccordionSummary>
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
                      setQ({ ...q, config: JSON.parse(configText || '{}') })
                    } catch {
                      /* ignore */
                    }
                  }}
                />
              </AccordionDetails>
            </Accordion>
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small" onClick={() => onSave(q)}>Сохранить</Button>
              {(q.type === 'multiple_choice' || q.type === 'single_choice') && (
                <Button variant="outlined" size="small" onClick={onAddAnswer}>Добавить ответ</Button>
              )}
              <Button variant="outlined" color="error" size="small" onClick={onDelete}>Удалить</Button>
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Stack spacing={1}>
              {(q.answers || []).map((a: any) => (
                <AnswerRow key={a.id} answer={a} onSave={onSaveAnswer} onDelete={onDeleteAnswer} />
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
  const [a, setA] = useState(answer)
  useEffect(() => setA(answer), [answer])
  return (
    <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
      <CardContent sx={{ py: 1 }}>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={12} md={7}>
            <TextField fullWidth size="small" label="Ответ" value={a.answerRu || ''} onChange={(e) => setA({ ...a, answerRu: e.target.value })} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField fullWidth size="small" type="number" label="Порядок" value={a.orderIndex || 1} onChange={(e) => setA({ ...a, orderIndex: Number(e.target.value) || 1 })} />
          </Grid>
          <Grid item xs={12} md={1.5}>
            <FormControlLabel control={<Switch checked={!!a.isCorrect} onChange={(e) => setA({ ...a, isCorrect: e.target.checked })} />} label="Верно" />
          </Grid>
          <Grid item xs={12} md={1.5}>
            <Stack direction="row" spacing={0.5}>
              <Button size="small" variant="contained" onClick={() => onSave(a)}>Сохранить</Button>
              <Button size="small" color="error" variant="outlined" onClick={() => onDelete(a.id)}>Удалить</Button>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
