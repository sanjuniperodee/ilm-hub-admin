import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Add,
  ArrowBack,
  DeleteOutline,
  DragIndicator,
  QuizOutlined,
  SaveOutlined,
} from '@mui/icons-material'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import toast from 'react-hot-toast'
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
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusChip,
  getErrorMessage,
  useConfirm,
  type BreadcrumbItem,
} from './ui'
import { validateQuestion } from './tests/questionValidation'

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
  /** Optional: router path for the PageHeader back button (otherwise `onBack` is used). */
  backTo?: string
  /** Optional: one line under the title explaining where the test is shown. */
  subtitle?: ReactNode
  /** Optional: in-page breadcrumbs. */
  breadcrumbs?: BreadcrumbItem[]
}

const questionsWord = (n: number) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'вопрос'
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'вопроса'
  return 'вопросов'
}

const clampScore = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

/** Sortable wrapper: provides the drag handle to the question header. */
function SortableQuestion({
  id,
  disabled,
  render,
}: {
  id: string
  disabled?: boolean
  render: (handle: ReactNode) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  const handle = (
    <Tooltip title="Перетащите, чтобы изменить порядок">
      <span>
        <IconButton
          {...attributes}
          {...listeners}
          size="small"
          disabled={disabled}
          aria-label="Изменить порядок вопроса"
          sx={{ cursor: disabled ? 'default' : 'grab', color: 'text.secondary', '&:active': { cursor: 'grabbing' } }}
        >
          <DragIndicator fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  )
  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, position: 'relative', zIndex: isDragging ? 10 : undefined }}
      sx={{ boxShadow: isDragging ? 4 : 'none', borderRadius: 2 }}
    >
      {render(handle)}
    </Box>
  )
}

function PassingScoreField({ value, onChange, id }: { value: number; onChange: (v: number) => void; id: string }) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2" component="label" htmlFor={id} sx={{ fontWeight: 500 }}>
          Проходной балл
        </Typography>
        <TextField
          id={id}
          size="small"
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 70)}
          inputProps={{ min: 0, max: 100, 'aria-label': 'Проходной балл, процентов' }}
          InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
          sx={{ width: 104 }}
        />
      </Stack>
      <Slider
        value={value}
        min={0}
        max={100}
        step={5}
        onChange={(_, v) => onChange(clampScore(v as number) || 70)}
        aria-label="Проходной балл"
        valueLabelDisplay="auto"
        valueLabelFormat={(v) => `${v}%`}
        marks={[{ value: 50 }, { value: 70 }, { value: 90 }]}
        size="small"
      />
      <Typography variant="caption" color="text.secondary">
        Тест засчитывается, если ученик ответил правильно минимум на {value}% вопросов.
      </Typography>
    </Box>
  )
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
  backTo,
  subtitle,
  breadcrumbs,
}: TestEditorSharedProps) {
  const confirm = useConfirm()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [test, setTest] = useState<any | null>(null)
  const [meta, setMeta] = useState<{ titleRu: string; passingScore: number }>({ titleRu: '', passingScore: 70 })
  const [newTitle, setNewTitle] = useState('')
  const [newPassing, setNewPassing] = useState(70)
  const [createTouched, setCreateTouched] = useState(false)
  const [creating, setCreating] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)
  const [addingQuestion, setAddingQuestion] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null)
  const [testMediaFiles, setTestMediaFiles] = useState<any[]>([])
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const notifyError = (e: any, fallback: string) => {
    toast.error(getErrorMessage(e, fallback))
  }

  const notifySuccess = (msg: string) => {
    toast.success(msg)
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
    setLoadError(null)
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
      const t = list[0] ?? null
      setTest(t)
      if (t) setMeta({ titleRu: t.titleRu || '', passingScore: t.passingScore || 70 })
      if (t?.id) {
        await loadTestMedia(t.id)
      }
    } catch (e: any) {
      setLoadError(e)
      notifyError(e, 'Не удалось загрузить тест')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs only when the listed inputs change
  }, [testType, lessonId, moduleId, levelCode, courseId, placementProfile])

  const createTestHandler = async () => {
    setCreateTouched(true)
    if (!newTitle.trim()) return
    setCreating(true)
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
      setCreateTouched(false)
      await load()
      notifySuccess('Тест создан')
    } catch (e: any) {
      notifyError(e, 'Не удалось создать тест')
    } finally {
      setCreating(false)
    }
  }

  const metaDirty = !!test && (meta.titleRu !== (test.titleRu || '') || meta.passingScore !== (test.passingScore || 70))

  const updateMeta = async () => {
    if (!test?.id) return
    setSavingMeta(true)
    try {
      await updateTestMeta(test.id, {
        titleRu: meta.titleRu,
        passingScore: Number(meta.passingScore) || 70,
      })
      await load()
      notifySuccess('Настройки сохранены')
    } catch (e: any) {
      notifyError(e, 'Не удалось сохранить настройки')
    } finally {
      setSavingMeta(false)
    }
  }

  const removeTest = async () => {
    if (!test?.id) return
    const count = (test.questions || []).length
    const ok = await confirm({
      title: 'Удалить тест?',
      description:
        count > 0
          ? `Тест «${test.titleRu || title}» и ${count} ${questionsWord(count)} с вариантами ответов будут удалены. Действие нельзя отменить.`
          : `Тест «${test.titleRu || title}» будет удалён.`,
      confirmLabel: 'Удалить тест',
      destructive: true,
      confirmText: count > 0 ? 'DELETE' : undefined,
    })
    if (!ok) return
    try {
      await deleteTest(test.id)
      setTest(null)
      notifySuccess('Тест удалён')
    } catch (e: any) {
      notifyError(e, 'Не удалось удалить тест')
    }
  }

  const addQuestion = async (type: QuestionType) => {
    if (!test?.id) return
    setAddingQuestion(true)
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
      if (created?.id) setJustCreatedId(created.id)
      await load()
      notifySuccess('Вопрос добавлен')
    } catch (e: any) {
      notifyError(e, 'Не удалось добавить вопрос')
    } finally {
      setAddingQuestion(false)
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
      notifySuccess('Вопрос сохранён')
    } catch (e: any) {
      notifyError(e, 'Не удалось сохранить вопрос')
    }
  }

  const removeQuestion = async (id: string) => {
    try {
      await deleteTestQuestion(id)
      await load()
      notifySuccess('Вопрос удалён')
    } catch (e: any) {
      notifyError(e, 'Не удалось удалить вопрос')
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
      notifySuccess('Вариант добавлен')
    } catch (e: any) {
      notifyError(e, 'Не удалось добавить вариант')
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
      notifySuccess('Вариант сохранён')
    } catch (e: any) {
      notifyError(e, 'Не удалось сохранить вариант')
    }
  }

  const removeAnswer = async (id: string) => {
    try {
      await deleteTestAnswer(id)
      await load()
      notifySuccess('Вариант удалён')
    } catch (e: any) {
      notifyError(e, 'Не удалось удалить вариант')
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

  const questions = useMemo(() => (test?.questions || []) as any[], [test])

  /** Reorder: renumber questions 1..n via the existing question update endpoint. */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !test) return
    const oldIndex = questions.findIndex((q) => q.id === active.id)
    const newIndex = questions.findIndex((q) => q.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(questions, oldIndex, newIndex)
    setTest((t: any) => (t ? { ...t, questions: reordered } : t))
    setReordering(true)
    try {
      for (let i = 0; i < reordered.length; i++) {
        const q = reordered[i]
        if ((q.orderIndex || 0) === i + 1) continue
        await updateTestQuestion(q.id, {
          type: q.type,
          orderIndex: i + 1,
          questionRu: q.questionRu,
          config: q.config || {},
        })
      }
      notifySuccess('Порядок вопросов обновлён')
    } catch (e: any) {
      notifyError(e, 'Не удалось изменить порядок вопросов')
    } finally {
      setReordering(false)
      await load()
    }
  }

  const issuesCount = useMemo(
    () => questions.filter((q) => validateQuestion(q).length > 0).length,
    [questions],
  )

  const backButton = !backTo ? (
    <Button startIcon={<ArrowBack />} onClick={onBack} variant="text">
      Назад
    </Button>
  ) : null

  const header = (status?: ReactNode) => (
    <PageHeader
      title={title}
      subtitle={subtitle}
      breadcrumbs={breadcrumbs}
      backTo={backTo}
      status={status}
      actions={backButton}
    />
  )

  if (loading && !test) {
    return (
      <Box>
        {header()}
        <LoadingState variant="form" rows={5} label="Загружаем тест…" />
      </Box>
    )
  }

  if (loadError && !test) {
    return (
      <Box>
        {header()}
        <ErrorState title="Не удалось загрузить тест" error={loadError} onRetry={load} retrying={loading} />
      </Box>
    )
  }

  const addMenu = (
    <Menu anchorEl={addMenuAnchor} open={Boolean(addMenuAnchor)} onClose={() => setAddMenuAnchor(null)}>
      {renderQuestionTypeMenuItems((type) => {
        setAddMenuAnchor(null)
        void addQuestion(type)
      })}
    </Menu>
  )

  const addButton = (variant: 'contained' | 'outlined') => (
    <Button
      variant={variant}
      startIcon={addingQuestion ? <CircularProgress size={14} color="inherit" /> : <Add />}
      disabled={addingQuestion}
      onClick={(e) => setAddMenuAnchor(e.currentTarget)}
      aria-haspopup="menu"
    >
      Добавить вопрос
    </Button>
  )

  if (!test) {
    const titleError = createTouched && !newTitle.trim()
    return (
      <Box sx={{ maxWidth: 880 }}>
        {header(<StatusChip size="small" status="draft" label="Не создан" />)}
        <SectionCard>
          <EmptyState
            icon={<QuizOutlined />}
            title="Тест ещё не создан"
            description="Задайте название и проходной балл. После создания можно добавлять вопросы и медиа."
          />
          <Box
            component="form"
            noValidate
            onSubmit={(e: React.FormEvent) => { e.preventDefault(); void createTestHandler() }}
            sx={{ maxWidth: 520, mx: 'auto', pb: 2 }}
          >
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                required
                autoFocus
                label="Название теста (RU)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                error={titleError}
                helperText={titleError ? 'Введите название теста' : 'Ученик видит его в начале теста'}
              />
              <PassingScoreField id="new-test-passing" value={newPassing} onChange={setNewPassing} />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={creating}
                startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <Add />}
                sx={{ alignSelf: 'flex-start' }}
              >
                Создать тест
              </Button>
            </Stack>
          </Box>
        </SectionCard>
      </Box>
    )
  }

  const readyCount = questions.length - issuesCount

  return (
    <Box>
      {header(
        <StatusChip
          size="small"
          tone={questions.length === 0 ? 'neutral' : issuesCount ? 'warning' : 'success'}
          label={
            questions.length === 0
              ? 'Нет вопросов'
              : issuesCount
                ? `Требуют внимания: ${issuesCount}`
                : 'Все вопросы готовы'
          }
        />,
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' },
        }}
      >
        <SectionCard
          title="Вопросы"
          description={
            questions.length
              ? `${questions.length} ${questionsWord(questions.length)} в порядке показа. Перетащите вопрос за ручку, чтобы изменить порядок.`
              : 'Добавьте первый вопрос — выберите его тип в меню.'
          }
          actions={questions.length > 0 ? addButton('contained') : undefined}
          padding="dense"
          sx={{ position: 'relative' }}
        >
          {(reordering || (loading && test)) && (
            <LinearProgress aria-label="Сохранение" sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2 }} />
          )}
          {questions.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<QuizOutlined />}
              title="В тесте пока нет вопросов"
              description="Вопросы бывают с выбором ответа, вводом текста, парами, аудио и буквами."
              action={addButton('contained')}
            />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void handleDragEnd(e)}>
              <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                <Stack spacing={1}>
                  {questions.map((q: any, idx: number) => (
                    <SortableQuestion
                      key={q.id}
                      id={q.id}
                      disabled={reordering}
                      render={(handle) => (
                        <TestQuestionEditor
                          index={idx}
                          question={q}
                          mediaMode="test"
                          mediaFiles={testMediaFiles}
                          onSave={saveQuestion}
                          onDelete={() => removeQuestion(q.id)}
                          onAddAnswer={() => addAnswer(q.id, (q.answers || []).length)}
                          onSaveAnswer={saveAnswer}
                          onDeleteAnswer={removeAnswer}
                          defaultExpanded={q.id === justCreatedId}
                          headerStart={handle}
                        />
                      )}
                    />
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>
          )}
          {addMenu}
        </SectionCard>

        <Stack spacing={2.5} sx={{ position: { lg: 'sticky' }, top: { lg: 72 } }}>
          <SectionCard
            title="Настройки теста"
            footer={
              <Button
                variant={metaDirty ? 'contained' : 'outlined'}
                onClick={() => void updateMeta()}
                disabled={!metaDirty || savingMeta || !meta.titleRu.trim()}
                startIcon={savingMeta ? <CircularProgress size={14} color="inherit" /> : <SaveOutlined fontSize="small" />}
              >
                Сохранить настройки
              </Button>
            }
          >
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="Название"
                value={meta.titleRu}
                onChange={(e) => setMeta((m) => ({ ...m, titleRu: e.target.value }))}
                error={!meta.titleRu.trim()}
                helperText={!meta.titleRu.trim() ? 'Введите название теста' : undefined}
              />
              <PassingScoreField
                id="test-passing"
                value={meta.passingScore}
                onChange={(v) => setMeta((m) => ({ ...m, passingScore: v }))}
              />
              {questions.length > 0 && (
                <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'surface.sunken', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    Готово {readyCount} из {questions.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {issuesCount
                      ? 'Откройте вопросы с замечаниями — там написано, что исправить.'
                      : 'Во всех вопросах есть текст и правильные ответы.'}
                  </Typography>
                </Box>
              )}
            </Stack>
          </SectionCard>

          <SectionCard
            title="Медиа теста"
            description="Аудио и изображения для вопросов. После загрузки выберите файл в настройках ответа вопроса."
            padding="dense"
          >
            <MediaUploader
              blockId={undefined}
              mediaFiles={testMediaFiles}
              onUpload={handleTestMediaUpload}
              onDelete={handleTestMediaDelete}
              onRefresh={() => test?.id && loadTestMedia(test.id)}
            />
          </SectionCard>

          <SectionCard variant="muted" padding="dense">
            <Stack spacing={1} alignItems="flex-start">
              <Box>
                <Typography variant="subtitle2">Удаление теста</Typography>
                <Typography variant="caption" color="text.secondary">Вопросы и ответы удалятся вместе с тестом.</Typography>
              </Box>
              <Button color="error" variant="outlined" size="small" startIcon={<DeleteOutline />} onClick={() => void removeTest()}>
                Удалить тест
              </Button>
            </Stack>
          </SectionCard>
        </Stack>
      </Box>
    </Box>
  )
}
