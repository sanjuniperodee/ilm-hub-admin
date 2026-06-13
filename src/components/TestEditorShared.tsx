import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Menu,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  Add,
  ArrowBack,
  PermMediaOutlined,
  QuizOutlined,
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
import { getConfigTemplate } from './QuestionConfigEditors'
import {
  TestQuestionEditor,
  renderQuestionTypeMenuItems,
  type QuestionType,
} from './TestQuestionEditor'
import { pageTitleH4Sx, testEditorMaxWidthSx } from '../utils/responsivePageSx'

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

  const notifyError = (e: any, fallback: string) => {
    setError(e?.response?.data?.message?.[0] || e?.message || fallback)
  }

  const notifySuccess = (msg: string) => {
    setSuccess(msg)
    setError('')
  }

  const loadTestMedia = async (miniTestId: string) => {
    try {
      const { data } = await getTestMedia(miniTestId)
      setTestMediaFiles(Array.isArray(data) ? data : [])
    } catch {
      setTestMediaFiles([])
    }
  }

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
      notifyError(e, 'Не удалось загрузить тест')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [testType, lessonId, moduleId, levelCode, courseId, placementProfile])

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
      notifyError(e, 'Не удалось создать тест')
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
      notifyError(e, 'Не удалось сохранить')
    }
  }

  const removeTest = async () => {
    if (!test?.id) return
    try {
      await deleteTest(test.id)
      setTest(null)
      notifySuccess('Тест удален')
    } catch (e: any) {
      notifyError(e, 'Не удалось удалить')
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
      notifyError(e, 'Не удалось добавить вопрос')
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
      notifyError(e, 'Не удалось сохранить')
    }
  }

  const removeQuestion = async (id: string) => {
    try {
      await deleteTestQuestion(id)
      await load()
      notifySuccess('Вопрос удален')
    } catch (e: any) {
      notifyError(e, 'Не удалось удалить')
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
      notifyError(e, 'Не удалось добавить')
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
      notifyError(e, 'Не удалось сохранить')
    }
  }

  const removeAnswer = async (id: string) => {
    try {
      await deleteTestAnswer(id)
      await load()
      notifySuccess('Ответ удален')
    } catch (e: any) {
      notifyError(e, 'Не удалось удалить')
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

  const questions = (test?.questions || []) as any[]

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
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack alignItems="center" spacing={1} sx={{ mb: 3, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'primary.main',
                  bgcolor: 'rgba(99,102,241,0.1)',
                }}
              >
                <QuizOutlined sx={{ fontSize: 28 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Тест ещё не создан
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
                Задайте название и проходной балл — после создания вы сможете добавлять вопросы и медиа.
              </Typography>
            </Stack>
            <Grid container spacing={2} sx={{ maxWidth: 640, mx: 'auto' }}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  size="small"
                  label="Название теста (RU)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Проходной %"
                  value={newPassing}
                  onChange={(e) => setNewPassing(Number(e.target.value) || 70)}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <Button fullWidth variant="contained" startIcon={<Add />} onClick={createTestHandler} sx={{ height: 40 }}>
                  Создать
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={{ xs: 2, md: 3 }}>
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
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <PermMediaOutlined fontSize="small" color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Медиа файлы теста
                </Typography>
              </Stack>
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
                      {questions.length ? `${questions.length} вопросов в тесте` : 'Добавьте первый вопрос'}
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
                    {renderQuestionTypeMenuItems((type) => {
                      setAddMenuAnchor(null)
                      void addQuestion(type)
                    })}
                  </Menu>
                </Box>
              </Stack>
              {questions.length === 0 ? (
                <Stack alignItems="center" spacing={1} sx={{ py: 4, textAlign: 'center' }}>
                  <QuizOutlined sx={{ fontSize: 36, color: 'text.disabled' }} />
                  <Typography variant="body2" color="text.secondary">
                    В тесте пока нет вопросов
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  {questions.map((q: any, idx: number) => (
                    <TestQuestionEditor
                      key={q.id}
                      index={idx}
                      question={q}
                      mediaMode="test"
                      mediaFiles={testMediaFiles}
                      onSave={saveQuestion}
                      onDelete={() => removeQuestion(q.id)}
                      onAddAnswer={() => addAnswer(q.id, (q.answers || []).length)}
                      onSaveAnswer={saveAnswer}
                      onDeleteAnswer={removeAnswer}
                    />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  )
}
