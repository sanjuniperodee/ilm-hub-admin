import { useState } from 'react'
import { Box, Button, CircularProgress, Menu, Stack, TextField } from '@mui/material'
import { Add, QuizOutlined } from '@mui/icons-material'
import toast from 'react-hot-toast'
import {
  createTest,
  createTestAnswer,
  createTestQuestion,
  deleteTest,
  deleteTestAnswer,
  deleteTestMedia,
  deleteTestQuestion,
  updateTestAnswer,
  updateTestMeta,
  updateTestQuestion,
  uploadTestMedia,
} from '../../../api/adminApi'
import { getConfigTemplate } from '../../../components/QuestionConfigEditors'
import { TestQuestionEditor, renderQuestionTypeMenuItems, type QuestionType } from '../../../components/TestQuestionEditor'
import MediaUploader from '../../../components/MediaUploader'
import { EmptyState, FormSection, SectionCard, getErrorMessage, useConfirm } from '../../../components/ui'
import { layout } from '../../../theme'
import type { MediaFile } from '../types'

export interface LessonTestPanelProps {
  lessonId: string
  lessonTest: any | null
  setLessonTest: (updater: (prev: any) => any) => void
  testMediaFiles: MediaFile[]
  loadTestMedia: (testId: string) => Promise<void>
  reload: () => Promise<unknown>
}

/** Mini-test shown after the lesson: settings, shared media and questions. API calls unchanged. */
export function LessonTestPanel({ lessonId, lessonTest, setLessonTest, testMediaFiles, loadTestMedia, reload }: LessonTestPanelProps) {
  const confirm = useConfirm()
  const [newTestTitle, setNewTestTitle] = useState('')
  const [newTestPassing, setNewTestPassing] = useState(70)
  const [creating, setCreating] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)
  const [addQuestionMenuAnchor, setAddQuestionMenuAnchor] = useState<null | HTMLElement>(null)
  const [titleError, setTitleError] = useState(false)

  const run = async (action: () => Promise<unknown>, ok: string, fail: string) => {
    try {
      await action()
      await reload()
      toast.success(ok)
      return true
    } catch (e) {
      toast.error(getErrorMessage(e, fail))
      return false
    }
  }

  const createLessonTest = async () => {
    if (!newTestTitle.trim()) {
      setTitleError(true)
      return
    }
    setCreating(true)
    const ok = await run(
      () => createTest({ testType: 'lesson', lessonId, titleRu: newTestTitle, passingScore: Number(newTestPassing) || 70 }),
      'Мини-тест создан',
      'Не удалось создать тест',
    )
    setCreating(false)
    if (ok) {
      setNewTestTitle('')
      setNewTestPassing(70)
    }
  }

  const updateLessonTestMeta = async () => {
    if (!lessonTest?.id) return
    setSavingMeta(true)
    await run(
      () => updateTestMeta(lessonTest.id, { titleRu: lessonTest.titleRu, passingScore: Number(lessonTest.passingScore) || 70 }),
      'Настройки теста сохранены',
      'Не удалось обновить тест',
    )
    setSavingMeta(false)
  }

  const addQuestion = (type: QuestionType) =>
    run(
      async () => {
        const config = getConfigTemplate(type)
        const { data: createdQuestion } = await createTestQuestion(lessonTest.id, { type, questionRu: { text: 'Новый вопрос' }, config })
        if ((type === 'multiple_choice' || type === 'single_choice') && createdQuestion?.id) {
          for (let i = 0; i < 4; i += 1) {
            await createTestAnswer(createdQuestion.id, { answerRu: `Вариант ${i + 1}`, isCorrect: i === 0, orderIndex: i + 1 })
          }
        }
      },
      'Вопрос добавлен',
      'Не удалось добавить вопрос',
    )

  const saveQuestion = (q: any) =>
    run(
      () => updateTestQuestion(q.id, { type: q.type, orderIndex: Number(q.orderIndex) || 1, questionRu: q.questionRu, config: q.config || {} }),
      'Вопрос сохранён',
      'Не удалось сохранить вопрос',
    )

  // TestQuestionEditor already asks for confirmation (confirmBeforeDelete defaults to true).
  const removeQuestion = (q: any) =>
    run(() => deleteTestQuestion(q.id), 'Вопрос удалён', 'Не удалось удалить вопрос')

  const addAnswer = (questionId: string, answersCount: number) =>
    run(() => createTestAnswer(questionId, { answerRu: 'Новый вариант', orderIndex: answersCount + 1, isCorrect: false }), 'Ответ добавлен', 'Не удалось добавить ответ')

  const saveAnswer = (a: any) =>
    run(() => updateTestAnswer(a.id, { answerRu: a.answerRu, orderIndex: Number(a.orderIndex) || 1, isCorrect: !!a.isCorrect }), 'Ответ сохранён', 'Не удалось сохранить ответ')

  const removeAnswer = (answerId: string) => run(() => deleteTestAnswer(answerId), 'Ответ удалён', 'Не удалось удалить ответ')

  const removeLessonTest = async () => {
    if (!lessonTest?.id) return
    const count = (lessonTest.questions || []).length
    const yes = await confirm({
      title: 'Удалить мини-тест?',
      description: count ? `Тест и ${count} вопр. будут удалены без возможности восстановления.` : 'Тест будет удалён без возможности восстановления.',
      confirmLabel: 'Удалить тест',
      destructive: true,
    })
    if (!yes) return
    try {
      await deleteTest(lessonTest.id)
      setLessonTest(() => null)
      toast.success('Тест удалён')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось удалить тест'))
    }
  }

  if (!lessonTest) {
    return (
      <SectionCard sx={{ maxWidth: layout.formMaxWidth }}>
        <EmptyState
          icon={<QuizOutlined />}
          title="У урока пока нет мини-теста"
          description="Мини-тест проверяет, как ученик усвоил урок. Задайте название и проходной балл — потом добавите вопросы."
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ maxWidth: 620, mx: 'auto', mt: 1 }}>
          <TextField
            fullWidth
            label="Название теста (RU)"
            value={newTestTitle}
            onChange={(e) => {
              setNewTestTitle(e.target.value)
              setTitleError(false)
            }}
            error={titleError}
            helperText={titleError ? 'Введите название теста' : ' '}
            onKeyDown={(e) => e.key === 'Enter' && void createLessonTest()}
          />
          <TextField
            type="number"
            label="Проходной балл, %"
            value={newTestPassing}
            onChange={(e) => setNewTestPassing(Number(e.target.value) || 70)}
            inputProps={{ min: 1, max: 100 }}
            helperText=" "
            sx={{ width: { sm: 180 }, flexShrink: 0 }}
          />
          <Button
            variant="contained"
            startIcon={creating ? <CircularProgress size={14} color="inherit" /> : <Add />}
            onClick={() => void createLessonTest()}
            disabled={creating}
            sx={{ height: 40, flexShrink: 0 }}
          >
            Создать тест
          </Button>
        </Stack>
      </SectionCard>
    )
  }

  const questions: any[] = lessonTest.questions || []

  return (
    <Stack gap={2.5} sx={{ maxWidth: layout.formMaxWidth + 160 }}>
      <SectionCard
        title="Настройки мини-теста"
        actions={
          <Button color="error" variant="text" onClick={() => void removeLessonTest()}>
            Удалить тест
          </Button>
        }
        footer={
          <Stack direction="row" justifyContent="flex-end">
            <Button variant="outlined" onClick={() => void updateLessonTestMeta()} disabled={savingMeta} startIcon={savingMeta ? <CircularProgress size={14} color="inherit" /> : undefined}>
              Сохранить настройки
            </Button>
          </Stack>
        }
      >
        <FormSection title="Основное" description="Ученик проходит тест после экрана завершения урока." divider={false}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
            <TextField fullWidth label="Название теста" value={lessonTest.titleRu || ''} onChange={(e) => setLessonTest((p: any) => ({ ...p, titleRu: e.target.value }))} />
            <TextField
              type="number"
              label="Проходной балл, %"
              value={lessonTest.passingScore || 70}
              onChange={(e) => setLessonTest((p: any) => ({ ...p, passingScore: Number(e.target.value) || 70 }))}
              inputProps={{ min: 1, max: 100 }}
              sx={{ width: { sm: 200 }, flexShrink: 0 }}
            />
          </Stack>
        </FormSection>
      </SectionCard>

      <SectionCard title="Медиафайлы теста" description="Аудио и картинки для вопросов. Загрузите их здесь, затем выберите в настройках вопроса.">
        <MediaUploader
          blockId={undefined}
          mediaFiles={testMediaFiles}
          onUpload={async (file, _type, description) => {
            await uploadTestMedia(lessonTest.id, file, description)
          }}
          onDelete={async (mediaFileId) => {
            await deleteTestMedia(lessonTest.id, mediaFileId)
          }}
          onRefresh={() => lessonTest?.id && void loadTestMedia(lessonTest.id)}
        />
      </SectionCard>

      <SectionCard
        title="Вопросы"
        description={questions.length ? `${questions.length} в тесте` : undefined}
        actions={
          <>
            <Button size="small" variant="outlined" startIcon={<Add />} aria-haspopup="menu" onClick={(e) => setAddQuestionMenuAnchor(e.currentTarget)}>
              Добавить вопрос
            </Button>
            <Menu anchorEl={addQuestionMenuAnchor} open={Boolean(addQuestionMenuAnchor)} onClose={() => setAddQuestionMenuAnchor(null)}>
              {renderQuestionTypeMenuItems((type) => {
                setAddQuestionMenuAnchor(null)
                void addQuestion(type)
              })}
            </Menu>
          </>
        }
      >
        {questions.length === 0 ? (
          <EmptyState size="sm" icon={<QuizOutlined />} title="В тесте пока нет вопросов" description="Нажмите «Добавить вопрос» и выберите тип." />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {questions.map((q: any, idx: number) => (
              <TestQuestionEditor
                key={q.id}
                index={idx}
                question={q}
                mediaMode="question"
                onSave={(question) => void saveQuestion(question)}
                onDelete={() => void removeQuestion(q)}
                onAddAnswer={() => void addAnswer(q.id, (q.answers || []).length)}
                onSaveAnswer={(a) => void saveAnswer(a)}
                onDeleteAnswer={(id) => void removeAnswer(id)}
              />
            ))}
          </Box>
        )}
      </SectionCard>
    </Stack>
  )
}
