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
  Chip,
  Collapse,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Add,
  ArrowBack,
  CheckCircle,
  DeleteOutline,
  ExpandLess,
  ExpandMore,
  QuizOutlined,
  RadioButtonUnchecked,
  SaveOutlined,
} from '@mui/icons-material'
import {
  createTest,
  createTestAnswer,
  createTestQuestion,
  deleteTest,
  deleteTestAnswer,
  deleteTestMedia,
  deleteTestQuestion,
  getTestMedia,
  getTests,
  updateTestAnswer,
  updateTestMeta,
  updateTestQuestion,
  uploadTestMedia,
} from '../api/adminApi'
import MediaUploader from './MediaUploader'
import {
  FillBlankConfigEditor,
  MatchPairsConfigEditor,
  ManualInputConfigEditor,
  MultipleChoiceConfigEditor,
  AudioMultipleChoiceConfigEditor,
  ImageWordMatchConfigEditor,
  AudioChoiceConfigEditor,
  FindLetterInWordConfigEditor,
  ListenAndChooseWordConfigEditor,
  getConfigTemplate,
} from './QuestionConfigEditors'
import { pageTitleH4Sx, testEditorMaxWidthSx } from '../utils/responsivePageSx'

type QuestionType = 'multiple_choice' | 'single_choice' | 'fill_blank' | 'match_pairs' | 'manual_input' | 'audio_multiple_choice' | 'image_word_match' | 'audio_choice' | 'find_letter_in_word' | 'listen_and_choose_word'

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'single_choice', label: 'Single choice' },
  { value: 'fill_blank', label: 'Fill blank' },
  { value: 'match_pairs', label: 'Match pairs (текст / аудио)' },
  { value: 'manual_input', label: 'Manual input' },
  { value: 'audio_multiple_choice', label: 'Аудио + выбор' },
  { value: 'image_word_match', label: 'Картинка ↔ Слово' },
  { value: 'audio_choice', label: 'Аудио → Буква (Махрадж)' },
  { value: 'find_letter_in_word', label: 'Найди букву в слове' },
  { value: 'listen_and_choose_word', label: 'Послушай → Слово' },
]

export interface TestEditorSharedProps {
  testType: 'lesson' | 'module' | 'level' | 'placement'
  lessonId?: string
  moduleId?: string
  levelCode?: string
  /** For placement tests tied to a catalog course */
  courseId?: string
  /** For diagnostic placement (no course) */
  placementProfile?: string
  title: string
  onBack: () => void
}

export function TestEditorShared({
  testType,
  lessonId,
  moduleId,
  levelCode,
  courseId,
  placementProfile,
  title,
  onBack,
}: TestEditorSharedProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [test, setTest] = useState<any | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newPassing, setNewPassing] = useState(70)
  const [testMediaFiles, setTestMediaFiles] = useState<any[]>([])
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const params: any = { testType }
      if (lessonId) params.lessonId = lessonId
      if (moduleId) params.moduleId = moduleId
      if (levelCode) params.levelCode = levelCode
      if (testType === 'placement') {
        if (placementProfile) params.placementProfile = placementProfile
        else if (courseId) params.courseId = courseId
      }
      const { data } = await getTests(params)
      const list = Array.isArray(data) ? data : []
      setTest(list[0] ?? null)
      if (list[0]?.id) {
        await loadTestMedia(list[0].id)
      }
    } catch (e: any) {
      setError(e?.response?.data?.message?.[0] || e?.message || 'Не удалось загрузить тест')
    } finally {
      setLoading(false)
    }
  }

  const loadTestMedia = async (miniTestId: string) => {
    try {
      const { data } = await getTestMedia(miniTestId)
      setTestMediaFiles(Array.isArray(data) ? data : [])
    } catch {
      setTestMediaFiles([])
    }
  }

  useEffect(() => {
    load()
  }, [testType, lessonId, moduleId, levelCode, courseId, placementProfile])

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
        courseId: testType === 'placement' && !placementProfile ? courseId : undefined,
        placementProfile: testType === 'placement' && placementProfile ? placementProfile : undefined,
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

  const handleTestMediaUpload = async (file: File, _type: 'image' | 'audio' | 'video', description?: string) => {
    if (!test?.id) return
    await uploadTestMedia(test.id, file, description)
  }

  const handleTestMediaDelete = async (mediaFileId: string) => {
    if (!test?.id) return
    await deleteTestMedia(test.id, mediaFileId)
  }

  if (loading && !test) {
    return <Typography color="text.secondary">Загрузка…</Typography>
  }

  return (
    <Box sx={testEditorMaxWidthSx}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Button startIcon={<ArrowBack />} onClick={onBack} size="small" variant="text">
          Назад
        </Button>
        <Typography variant="h4" sx={pageTitleH4Sx}>
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
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                spacing={1.5}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Настройки теста
                </Typography>
                <Button color="error" variant="outlined" onClick={removeTest} sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}>
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
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Медиа файлы теста
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Загрузите аудио и изображения для вопросов. Затем выберите их в настройках вопроса.
              </Typography>
              <MediaUploader
                blockId={undefined}
                mediaFiles={testMediaFiles}
                onUpload={handleTestMediaUpload}
                onDelete={handleTestMediaDelete}
                onRefresh={() => test?.id && loadTestMedia(test.id)}
              />
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                spacing={1.5}
                sx={{ mb: 2 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <QuizOutlined fontSize="small" color="primary" />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      Вопросы
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(test.questions || []).length
                        ? `${(test.questions || []).length} вопросов в тесте`
                        : 'Добавьте первый вопрос'}
                    </Typography>
                  </Box>
                </Stack>
                <Box>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Add />}
                    onClick={(e) => setAddMenuAnchor(e.currentTarget)}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                  >
                    Добавить вопрос
                  </Button>
                  <Menu anchorEl={addMenuAnchor} open={Boolean(addMenuAnchor)} onClose={() => setAddMenuAnchor(null)}>
                    {QUESTION_TYPES.map((t) => (
                      <MenuItem
                        key={t.value}
                        onClick={() => {
                          setAddMenuAnchor(null)
                          void addQuestion(t.value)
                        }}
                      >
                        {t.label}
                      </MenuItem>
                    ))}
                  </Menu>
                </Box>
              </Stack>
              <Stack spacing={2}>
                {(test.questions || []).map((q: any, idx: number) => (
                  <QuestionCard
                    key={q.id}
                    index={idx}
                    question={q}
                    mediaFiles={testMediaFiles}
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
  index,
  question,
  mediaFiles,
  onSave,
  onDelete,
  onAddAnswer,
  onSaveAnswer,
  onDeleteAnswer,
}: {
  index: number
  question: any
  mediaFiles: any[]
  onSave: (q: any) => void
  onDelete: () => void
  onAddAnswer: () => void
  onSaveAnswer: (a: any) => void
  onDeleteAnswer: (id: string) => void
}) {
  const [q, setQ] = useState(question)
  const [configText, setConfigText] = useState(JSON.stringify(question.config || {}, null, 2))
  const [expanded, setExpanded] = useState(false)

  const typeLabel = QUESTION_TYPES.find((t) => t.value === (q.type || 'multiple_choice'))?.label || 'Вопрос'
  const answerCount = (q.answers || []).length
  const correctCount = (q.answers || []).filter((a: any) => a.isCorrect).length

  useEffect(() => {
    setQ(question)
    setConfigText(JSON.stringify(question.config || {}, null, 2))
  }, [question])

  const renderConfig = () => {
    const type = q.type || 'multiple_choice'
    if (type === 'fill_blank') return <FillBlankConfigEditor value={q.config || {}} onChange={(c) => setQ({ ...q, config: c })} />
    if (type === 'match_pairs') return <MatchPairsConfigEditor value={q.config || {}} onChange={(c) => setQ({ ...q, config: c })} mediaFiles={mediaFiles} />
    if (type === 'manual_input') return <ManualInputConfigEditor value={q.config || {}} onChange={(c) => setQ({ ...q, config: c })} />
    if (type === 'audio_multiple_choice') return <AudioMultipleChoiceConfigEditor value={q.config || {}} onChange={(c) => setQ({ ...q, config: c })} mediaFiles={mediaFiles} />
    if (type === 'image_word_match') return <ImageWordMatchConfigEditor value={q.config || {}} onChange={(c) => setQ({ ...q, config: c })} mediaFiles={mediaFiles} />
    if (type === 'audio_choice') return <AudioChoiceConfigEditor value={q.config || {}} onChange={(c) => setQ({ ...q, config: c })} mediaFiles={mediaFiles} />
    if (type === 'find_letter_in_word') return <FindLetterInWordConfigEditor value={q.config || {}} onChange={(c) => setQ({ ...q, config: c })} />
    if (type === 'listen_and_choose_word') return <ListenAndChooseWordConfigEditor value={q.config || {}} onChange={(c) => setQ({ ...q, config: c })} mediaFiles={mediaFiles} />
    return <MultipleChoiceConfigEditor />
  }

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        borderColor: expanded ? 'primary.main' : 'divider',
        transition: 'border-color 120ms ease',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        onClick={() => setExpanded((v) => !v)}
        sx={{
          p: { xs: 1.25, sm: 1.5 },
          cursor: 'pointer',
          bgcolor: expanded ? 'rgba(99,102,241,0.04)' : 'transparent',
          '&:hover': { bgcolor: 'rgba(99,102,241,0.04)' },
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1.5,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            color: 'primary.main',
            bgcolor: 'rgba(99,102,241,0.1)',
          }}
        >
          {index + 1}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {q.questionRu?.text || 'Без текста вопроса'}
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 0.25 }}>
            <Chip size="small" variant="outlined" color="primary" label={typeLabel} sx={{ height: 20 }} />
            {(q.type === 'multiple_choice' || q.type === 'single_choice') && (
              <Chip
                size="small"
                variant="outlined"
                color={correctCount ? 'success' : 'default'}
                label={`${answerCount} отв. · ${correctCount} верн.`}
                sx={{ height: 20 }}
              />
            )}
          </Stack>
        </Box>
        <Tooltip title="Удалить вопрос">
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete() }}>
            <DeleteOutline fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton size="small">{expanded ? <ExpandLess /> : <ExpandMore />}</IconButton>
      </Stack>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider />
        <CardContent>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={3}>
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
            <Grid item xs={12} md={7}>
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
              <Divider sx={{ mb: 1.5 }} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}>
                <Button variant="contained" size="small" startIcon={<SaveOutlined />} onClick={() => onSave(q)}>Сохранить вопрос</Button>
                {(q.type === 'multiple_choice' || q.type === 'single_choice') && (
                  <Button variant="outlined" size="small" startIcon={<Add />} onClick={onAddAnswer}>Добавить ответ</Button>
                )}
              </Stack>
            </Grid>
            {(q.answers || []).length > 0 && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Варианты ответов
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {(q.answers || []).map((a: any) => (
                    <AnswerRow key={a.id} answer={a} onSave={onSaveAnswer} onDelete={onDeleteAnswer} />
                  ))}
                </Stack>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Collapse>
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
    <Card
      variant="outlined"
      sx={{
        borderRadius: 1.5,
        borderColor: a.isCorrect ? 'success.main' : 'divider',
        borderLeft: '4px solid',
        borderLeftColor: a.isCorrect ? 'success.main' : 'divider',
        bgcolor: a.isCorrect ? 'rgba(16,185,129,0.04)' : 'background.paper',
        transition: 'border-color 120ms ease, background-color 120ms ease',
      }}
    >
      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs="auto">
            <Tooltip title={a.isCorrect ? 'Правильный ответ' : 'Отметить правильным'}>
              <IconButton
                size="small"
                color={a.isCorrect ? 'success' : 'default'}
                onClick={() => setA({ ...a, isCorrect: !a.isCorrect })}
              >
                {a.isCorrect ? <CheckCircle fontSize="small" /> : <RadioButtonUnchecked fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Grid>
          <Grid item xs>
            <TextField fullWidth size="small" placeholder="Текст ответа" value={a.answerRu || ''} onChange={(e) => setA({ ...a, answerRu: e.target.value })} />
          </Grid>
          <Grid item xs={4} sm={2}>
            <TextField fullWidth size="small" type="number" label="Порядок" value={a.orderIndex || 1} onChange={(e) => setA({ ...a, orderIndex: Number(e.target.value) || 1 })} />
          </Grid>
          <Grid item xs="auto">
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Сохранить ответ">
                <IconButton size="small" color="primary" onClick={() => onSave(a)}>
                  <SaveOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Удалить ответ">
                <IconButton size="small" color="error" onClick={() => onDelete(a.id)}>
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
