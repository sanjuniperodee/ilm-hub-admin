import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from '@mui/material'
import {
  ArrowBack,
  DeleteOutline,
  EditOutlined,
  ExpandMore,
  SaveOutlined,
} from '@mui/icons-material'
import {
  createLessonBlock,
  createTest,
  createTestAnswer,
  createTestQuestion,
  deleteBlockMedia,
  deleteMediaFile,
  deleteLessonBlock,
  deleteTest,
  deleteTestAnswer,
  deleteTestQuestion,
  getBlockMedia,
  getCourseById,
  getCourses,
  getLessonBlocks,
  getLessonById,
  getModuleById,
  getModules,
  getTests,
  uploadBlockMedia,
  updateLesson,
  updateLessonBlock,
  updateTestAnswer,
  updateTestMeta,
  updateTestQuestion,
} from '../api/adminApi'
import RichTextEditor from '../components/RichTextEditor'
import MediaUploader from '../components/MediaUploader'
import {
  MultipleChoiceEditor,
  MatchPairsEditor,
  FillBlankEditor,
  ManualInputEditor,
} from '../components/ExerciseEditors'
import {
  FillBlankConfigEditor,
  MatchPairsConfigEditor,
  ManualInputConfigEditor,
  DragDropConfigEditor,
  MultipleChoiceConfigEditor,
  getConfigTemplate,
} from '../components/QuestionConfigEditors'

type BlockType =
  | 'theory'
  | 'illustration'
  | 'audio'
  | 'video'
  | 'lesson_complete'
  | 'multiple_choice'
  | 'single_choice'
  | 'match_pairs'
  | 'fill_blank'
  | 'manual_input'
  | 'drag_drop'
type DetailTab = 'meta' | 'blocks' | 'test'
type QuestionType = 'multiple_choice' | 'single_choice' | 'fill_blank' | 'match_pairs' | 'manual_input' | 'drag_drop'

const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: 'theory', label: 'Теория' },
  { value: 'illustration', label: 'Иллюстрация' },
  { value: 'audio', label: 'Аудио' },
  { value: 'video', label: 'Видео' },
  { value: 'lesson_complete', label: 'Завершение урока' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'match_pairs', label: 'Match Pairs' },
  { value: 'fill_blank', label: 'Fill Blank' },
  { value: 'manual_input', label: 'Manual Input' },
  { value: 'drag_drop', label: 'Drag & Drop' },
]

interface StudioBlock {
  id: string
  lessonId: string
  type: string
  orderIndex: number
  contentRu?: Record<string, any>
  contentKz?: Record<string, any>
  contentAr?: Record<string, any>
}

interface MediaFile {
  id: string
  type: 'image' | 'audio' | 'video'
  url: string
  filename: string
  mimeType: string
  size: number
  description?: string
}

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

const EXERCISE_BLOCK_TYPES: BlockType[] = [
  'multiple_choice',
  'single_choice',
  'match_pairs',
  'fill_blank',
  'manual_input',
  'drag_drop',
]

function buildExerciseConfigFromBlock(block: StudioBlock): any {
  const ru = block.contentRu || {}
  const kz = block.contentKz || {}
  const ar = block.contentAr || {}
  const type = block.type

  if (type === 'multiple_choice' || type === 'single_choice') {
    return {
      question: { ru: ru.question, kz: kz.question, ar: ar.question },
      options: (ru.options || []).map((opt: any, i: number) => ({
        text: {
          ru: opt.text,
          kz: kz.options?.[i]?.text,
          ar: ar.options?.[i]?.text,
        },
        isCorrect: opt.isCorrect,
      })),
    }
  }
  if (type === 'manual_input') {
    return {
      question: { ru: ru.question, kz: kz.question, ar: ar.question },
      correctAnswers: {
        ru: ru.correctAnswers || [],
        kz: kz.correctAnswers || [],
        ar: ar.correctAnswers || [],
      },
    }
  }
  if (type === 'match_pairs') {
    return {
      pairs: (ru.pairs || []).map((p: any, i: number) => ({
        left: { ru: p.left, kz: kz.pairs?.[i]?.left, ar: ar.pairs?.[i]?.left },
        right: { ru: p.right, kz: kz.pairs?.[i]?.right, ar: ar.pairs?.[i]?.right },
      })),
    }
  }
  if (type === 'fill_blank') {
    return {
      text: { ru: ru.text, kz: kz.text, ar: ar.text },
    }
  }
  if (type === 'drag_drop') {
    return {
      instructionRu: ru.instructionRu,
      sentenceTemplateRu: ru.sentenceTemplateRu,
      options: ru.options,
      correctAnswerId: ru.correctAnswerId,
      explanationRu: ru.explanationRu,
    }
  }
  return {}
}

function mapExerciseConfigToContent(config: any, type: BlockType): { contentRu: any; contentKz: any; contentAr: any } {
  if (!config) return { contentRu: {}, contentKz: {}, contentAr: {} }
  const mapContent = (lang: string) => {
    if (type === 'multiple_choice' || type === 'single_choice' || type === 'manual_input') {
      return {
        question: config.question?.[lang],
        options: config.options?.map((o: any) => ({ text: o.text?.[lang], isCorrect: o.isCorrect })),
        correctAnswers: config.correctAnswers?.[lang],
      }
    }
    if (type === 'match_pairs') {
      return {
        pairs: config.pairs?.map((p: any) => ({ left: p.left?.[lang], right: p.right?.[lang] })),
      }
    }
    if (type === 'fill_blank') {
      return { text: config.text?.[lang] }
    }
    if (type === 'drag_drop') {
      return {
        instructionRu: config.instructionRu,
        sentenceTemplateRu: config.sentenceTemplateRu,
        options: config.options,
        correctAnswerId: config.correctAnswerId,
        explanationRu: config.explanationRu,
      }
    }
    return {}
  }
  return {
    contentRu: mapContent('ru'),
    contentKz: mapContent('kz'),
    contentAr: mapContent('ar'),
  }
}

export default function LessonEditorPage() {
  const { lessonId, courseId: urlCourseId, moduleId: urlModuleId } = useParams<{
    lessonId: string
    courseId: string
    moduleId?: string
  }>()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<DetailTab>('meta')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [lesson, setLesson] = useState<any>(null)
  const [course, setCourse] = useState<any>(null)
  const [module, setModule] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [blocks, setBlocks] = useState<StudioBlock[]>([])
  const [lessonDraft, setLessonDraft] = useState<Partial<any>>({})
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)

  const [lessonTest, setLessonTest] = useState<any | null>(null)
  const [newTestTitle, setNewTestTitle] = useState('')
  const [newTestPassing, setNewTestPassing] = useState(70)

  const [blockDraft, setBlockDraft] = useState<{
    id?: string
    type: BlockType
    orderIndex: number
    titleRu: string
    textRuHtml: string
    titleKz: string
    textKz: string
    titleAr: string
    textAr: string
    arabicWord: string
    transcription: string
    translationRu: string
    exerciseConfig?: any
  }>({
    type: 'theory',
    orderIndex: 1,
    titleRu: '',
    textRuHtml: '',
    titleKz: '',
    textKz: '',
    titleAr: '',
    textAr: '',
    arabicWord: '',
    transcription: '',
    translationRu: '',
  })

  const breadcrumb = useMemo(() => {
    const parts: string[] = []
    if (course?.titleRu) parts.push(course.titleRu)
    if (module?.titleRu) parts.push(module.titleRu)
    if (lesson?.titleRu) parts.push(lesson.titleRu)
    return parts.join(' / ')
  }, [course, module, lesson])

  const backToContent = () => {
    if (urlModuleId) {
      navigate(`/content/courses/${urlCourseId}/modules/${urlModuleId}`)
    } else {
      navigate(`/content/courses/${urlCourseId}`)
    }
  }

  const notifyError = (e: any, fallback: string) => {
    const msg = e?.response?.data?.message?.[0] || e?.message || fallback
    setError(msg)
  }

  const notifySuccess = (msg: string) => {
    setSuccess(msg)
    setError('')
  }

  const loadLessonAndContext = async () => {
    if (!lessonId) return
    setLoading(true)
    setError('')
    try {
      const [lessonRes, coursesRes] = await Promise.all([getLessonById(lessonId), getCourses()])
      const lessonData = lessonRes.data
      setLesson(lessonData)
      setLessonDraft({ ...lessonData })
      setCourses(coursesRes.data || [])

      if (lessonData?.courseId) {
        const { data: courseData } = await getCourseById(lessonData.courseId)
        setCourse(courseData)
        const { data: mods } = await getModules(lessonData.courseId)
        setModules(mods || [])
      } else {
        setCourse(null)
        setModules([])
      }

      if (lessonData?.moduleId) {
        const { data: moduleData } = await getModuleById(lessonData.moduleId)
        setModule(moduleData)
      } else setModule(null)

      const { data: blocksData } = await getLessonBlocks(lessonId)
      const mapped = (Array.isArray(blocksData) ? blocksData : []).map((b: any) => ({
        id: b.id,
        lessonId: b.lessonId,
        type: b.type,
        orderIndex: b.orderIndex ?? 0,
        contentRu: b.contentRu,
        contentKz: b.contentKz,
        contentAr: b.contentAr,
      }))
      setBlocks(mapped.sort((a: StudioBlock, b: StudioBlock) => a.orderIndex - b.orderIndex))

      const { data: testsData } = await getTests({ testType: 'lesson', lessonId })
      const list = Array.isArray(testsData) ? testsData : []
      setLessonTest(list[0] ?? null)
    } catch (e) {
      notifyError(e, 'Не удалось загрузить урок')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLessonAndContext()
  }, [lessonId])

  const saveLessonMeta = async () => {
    if (!lessonDraft?.id) return
    try {
      await updateLesson(lessonDraft.id, {
        courseId: lessonDraft.courseId,
        moduleId: lessonDraft.moduleId || undefined,
        titleRu: lessonDraft.titleRu,
        titleKz: lessonDraft.titleKz,
        titleAr: lessonDraft.titleAr,
        descriptionRu: lessonDraft.descriptionRu,
        descriptionKz: lessonDraft.descriptionKz,
        descriptionAr: lessonDraft.descriptionAr,
        estimatedMinutes: Number(lessonDraft.estimatedMinutes) || 10,
        isPremium: !!lessonDraft.isPremium,
        isTest: !!lessonDraft.isTest,
        orderIndex: Number(lessonDraft.orderIndex) || 0,
      })
      setLesson((prev: any) => ({ ...prev, ...lessonDraft }))
      notifySuccess('Урок обновлен')
    } catch (e) {
      notifyError(e, 'Не удалось обновить урок')
    }
  }

  const resetBlockDraft = () => {
    const nextOrder = (blocks[blocks.length - 1]?.orderIndex || 0) + 1
    setBlockDraft({
      type: 'theory',
      orderIndex: nextOrder,
      titleRu: '',
      textRuHtml: '',
      titleKz: '',
      textKz: '',
      titleAr: '',
      textAr: '',
      arabicWord: '',
      transcription: '',
      translationRu: '',
      exerciseConfig: undefined,
    })
    setMediaFiles([])
  }

  const editBlock = (block: StudioBlock) => {
    const isExercise = EXERCISE_BLOCK_TYPES.includes(block.type as BlockType)
    setBlockDraft({
      id: block.id,
      type: block.type as BlockType,
      orderIndex: block.orderIndex,
      titleRu: (block.contentRu?.title as string) || '',
      textRuHtml: (block.contentRu?.html as string) || (block.contentRu?.text as string) || '',
      titleKz: (block.contentKz?.title as string) || '',
      textKz: (block.contentKz?.text as string) || '',
      titleAr: (block.contentAr?.title as string) || '',
      textAr: (block.contentAr?.text as string) || '',
      arabicWord: (block.contentRu?.arabicWord as string) || '',
      transcription: (block.contentRu?.transcription as string) || '',
      translationRu: (block.contentRu?.translation as string) || (block.contentRu?.translationRu as string) || '',
      exerciseConfig: isExercise ? buildExerciseConfigFromBlock(block) : undefined,
    })
    if (block.type === 'illustration') {
      void loadBlockMedia(block.id)
    } else {
      setMediaFiles([])
    }
  }

  const buildBlockPayload = (includeLessonId: boolean) => {
    const isExercise = EXERCISE_BLOCK_TYPES.includes(blockDraft.type)
    if (isExercise && blockDraft.exerciseConfig) {
      const { contentRu, contentKz, contentAr } = mapExerciseConfigToContent(
        blockDraft.exerciseConfig,
        blockDraft.type,
      )
      const base = {
        type: blockDraft.type,
        orderIndex: Number(blockDraft.orderIndex) || 0,
        contentRu: contentRu || {},
        contentKz: contentKz || {},
        contentAr: contentAr || {},
      }
      return includeLessonId && lessonId ? { lessonId, ...base } : base
    }

    const isIllustration = blockDraft.type === 'illustration'
    const contentRu = isIllustration
      ? {
          arabicWord: blockDraft.arabicWord || '',
          transcription: blockDraft.transcription || '',
          translation: blockDraft.translationRu || '',
        }
      : {
          title: blockDraft.titleRu,
          text: stripHtml(blockDraft.textRuHtml),
          html: blockDraft.textRuHtml,
        }

    const basePayload = {
      type: blockDraft.type,
      orderIndex: Number(blockDraft.orderIndex) || 0,
      contentRu,
      contentKz: { title: blockDraft.titleKz, text: blockDraft.textKz },
      contentAr: { title: blockDraft.titleAr, text: blockDraft.textAr },
    }
    return includeLessonId && lessonId ? { lessonId, ...basePayload } : basePayload
  }

  const ensureBlockIdForMedia = async (): Promise<string> => {
    let blockId = blockDraft.id
    if (!blockId && lessonId) {
      const payload = buildBlockPayload(true)
      const createRes = await createLessonBlock(payload)
      blockId = createRes.data?.id
      if (blockId) {
        setBlockDraft((prev) => ({ ...prev, id: blockId }))
        await loadLessonAndContext()
        notifySuccess('Блок создан. Можно загружать медиа.')
      }
    }
    if (!blockId) throw new Error('Не удалось определить блок для загрузки')
    return blockId
  }

  const loadBlockMedia = async (blockId: string) => {
    try {
      const { data } = await getBlockMedia(blockId)
      setMediaFiles(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to load block media', e)
    }
  }

  const saveBlock = async () => {
    if (!lessonId) return
    if (!blockDraft.type) {
      setError('Укажите тип блока')
      return
    }
    const payload = buildBlockPayload(false)
    try {
      if (blockDraft.id) {
        await updateLessonBlock(blockDraft.id, payload)
      } else {
        await createLessonBlock({ lessonId, ...payload })
      }
      await loadLessonAndContext()
      notifySuccess(blockDraft.id ? 'Блок обновлен' : 'Блок создан')
      resetBlockDraft()
    } catch (e) {
      notifyError(e, 'Не удалось сохранить блок')
    }
  }

  const uploadEditorMedia = async (file: File): Promise<{ id: string; url: string; type: 'image' | 'audio' | 'video'; mimeType?: string }> => {
    let blockId = blockDraft.id
    if (!blockId && lessonId) {
      const payload = buildBlockPayload(true)
      const createRes = await createLessonBlock(payload)
      blockId = createRes.data?.id
      if (blockId) {
        setBlockDraft((prev) => ({ ...prev, id: blockId }))
        await loadLessonAndContext()
        notifySuccess('Блок создан. Можно вставлять медиа.')
      }
    }
    if (!blockId) throw new Error('Не удалось определить блок для загрузки')
    const mime = file.type || ''
    const type: 'image' | 'audio' | 'video' =
      mime.startsWith('audio/') ? 'audio' : mime.startsWith('video/') ? 'video' : 'image'
    const response = await uploadBlockMedia(blockId, file, type)
    const data = response.data || {}
    return {
      id: data.id,
      url: data.url,
      type: (data.type as 'image' | 'audio' | 'video') || type,
      mimeType: data.mimeType,
    }
  }

  const removeEditorMedia = async (mediaId: string) => {
    if (!blockDraft.id) return
    await deleteBlockMedia(blockDraft.id, mediaId)
    try {
      await deleteMediaFile(mediaId)
    } catch {
      /* ignore */
    }
  }

  const handleMediaUpload = async (file: File, type: 'image' | 'audio' | 'video') => {
    const blockId = await ensureBlockIdForMedia()
    await uploadBlockMedia(blockId, file, type)
    await loadBlockMedia(blockId)
  }

  const handleMediaDelete = async (mediaId: string) => {
    if (!blockDraft.id) return
    await deleteBlockMedia(blockDraft.id, mediaId)
    try {
      await deleteMediaFile(mediaId)
    } catch {
      /* ignore */
    }
    await loadBlockMedia(blockDraft.id)
  }

  const removeBlock = async (id: string) => {
    try {
      await deleteLessonBlock(id)
      await loadLessonAndContext()
      notifySuccess('Блок удален')
      if (blockDraft.id === id) resetBlockDraft()
    } catch (e) {
      notifyError(e, 'Не удалось удалить блок')
    }
  }

  const handleBlockDrop = async (targetBlockId: string) => {
    if (!draggingBlockId || draggingBlockId === targetBlockId) return
    const currentIndex = blocks.findIndex((b) => b.id === draggingBlockId)
    const targetIndex = blocks.findIndex((b) => b.id === targetBlockId)
    if (currentIndex === -1 || targetIndex === -1) return
    const updated = [...blocks]
    const [moved] = updated.splice(currentIndex, 1)
    updated.splice(targetIndex, 0, moved)
    const reindexed = updated.map((b, index) => ({ ...b, orderIndex: index + 1 }))
    setBlocks(reindexed)
    setDraggingBlockId(null)
    try {
      const tempOffset = 1000
      for (let i = 0; i < reindexed.length; i += 1) {
        await updateLessonBlock(reindexed[i].id, { orderIndex: tempOffset + i + 1 })
      }
      for (let i = reindexed.length - 1; i >= 0; i -= 1) {
        await updateLessonBlock(reindexed[i].id, { orderIndex: i + 1 })
      }
      notifySuccess('Порядок блоков обновлен')
    } catch (e) {
      notifyError(e, 'Не удалось сохранить порядок')
      await loadLessonAndContext()
    }
  }

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
      await loadLessonAndContext()
      notifySuccess('Тест урока создан')
    } catch (e) {
      notifyError(e, 'Не удалось создать тест')
    }
  }

  const updateLessonTestMeta = async () => {
    if (!lessonTest?.id) return
    try {
      await updateTestMeta(lessonTest.id, {
        titleRu: lessonTest.titleRu,
        passingScore: Number(lessonTest.passingScore) || 70,
      })
      await loadLessonAndContext()
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
        for (let i = 0; i < 4; i += 1) {
          await createTestAnswer(createdQuestion.id, {
            answerRu: `Вариант ${i + 1}`,
            isCorrect: i === 0,
            orderIndex: i + 1,
          })
        }
      }
      await loadLessonAndContext()
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
      await loadLessonAndContext()
      notifySuccess('Вопрос сохранен')
    } catch (e) {
      notifyError(e, 'Не удалось сохранить вопрос')
    }
  }

  const removeQuestion = async (questionId: string) => {
    try {
      await deleteTestQuestion(questionId)
      await loadLessonAndContext()
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
      await loadLessonAndContext()
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
      await loadLessonAndContext()
      notifySuccess('Ответ сохранен')
    } catch (e) {
      notifyError(e, 'Не удалось сохранить ответ')
    }
  }

  const removeAnswer = async (answerId: string) => {
    try {
      await deleteTestAnswer(answerId)
      await loadLessonAndContext()
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
      notifySuccess('Тест удален')
    } catch (e) {
      notifyError(e, 'Не удалось удалить тест')
    }
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
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Button startIcon={<ArrowBack />} onClick={backToContent} size="small" variant="text">
          К контенту
        </Button>
        <Typography variant="body2" color="text.secondary">
          {breadcrumb}
        </Typography>
      </Stack>

      {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!!success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        {lesson.titleRu}
      </Typography>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab value="meta" label="Метаданные" />
        <Tab value="blocks" label="Блоки" />
        <Tab value="test" label="Тест урока" />
      </Tabs>

      {activeTab === 'meta' && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Курс</InputLabel>
                  <Select
                    label="Курс"
                    value={lessonDraft.courseId || ''}
                    onChange={(e) => setLessonDraft((p) => ({ ...p, courseId: e.target.value }))}
                  >
                    {courses.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.titleRu} ({c.code})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Модуль (опционально)</InputLabel>
                  <Select
                    label="Модуль (опционально)"
                    value={lessonDraft.moduleId || ''}
                    onChange={(e) => setLessonDraft((p) => ({ ...p, moduleId: e.target.value || undefined }))}
                  >
                    <MenuItem value="">Без модуля</MenuItem>
                    {modules.map((m) => (
                      <MenuItem key={m.id} value={m.id}>{m.titleRu}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Название урока (RU)"
                  value={lessonDraft.titleRu || ''}
                  onChange={(e) => setLessonDraft((p) => ({ ...p, titleRu: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Порядок"
                  value={lessonDraft.orderIndex ?? 0}
                  onChange={(e) => setLessonDraft((p) => ({ ...p, orderIndex: Number(e.target.value) || 0 }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Описание урока (RU)"
                  value={lessonDraft.descriptionRu || ''}
                  onChange={(e) => setLessonDraft((p) => ({ ...p, descriptionRu: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Длительность (мин)"
                  value={lessonDraft.estimatedMinutes ?? 10}
                  onChange={(e) => setLessonDraft((p) => ({ ...p, estimatedMinutes: Number(e.target.value) || 10 }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!lessonDraft.isPremium}
                      onChange={(e) => setLessonDraft((p) => ({ ...p, isPremium: e.target.checked }))}
                    />
                  }
                  label="Premium урок"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!lessonDraft.isTest}
                      onChange={(e) => setLessonDraft((p) => ({ ...p, isTest: e.target.checked }))}
                    />
                  }
                  label="Тестовый урок"
                />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" startIcon={<SaveOutlined />} onClick={saveLessonMeta}>
                  Сохранить урок
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeTab === 'blocks' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Блоки урока
                  </Typography>
                  <Button size="small" onClick={resetBlockDraft}>
                    Новый
                  </Button>
                </Stack>
                <Stack spacing={1}>
                  {blocks.map((b) => (
                    <Card
                      key={b.id}
                      variant="outlined"
                      draggable
                      onDragStart={() => setDraggingBlockId(b.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleBlockDrop(b.id)}
                      sx={{
                        borderRadius: 2,
                        cursor: 'grab',
                        opacity: draggingBlockId === b.id ? 0.7 : 1,
                        borderColor: draggingBlockId === b.id ? 'primary.main' : 'divider',
                      }}
                    >
                      <CardContent sx={{ py: 1.2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              #{b.orderIndex} • {b.type}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {b.type === 'illustration'
                                ? ((b.contentRu?.arabicWord as string) || (b.contentRu?.translation as string) || 'Без заголовка')
                                : ((b.contentRu?.title as string) || (b.contentRu?.question as string) || 'Без заголовка')}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.5}>
                            <Button size="small" onClick={() => editBlock(b)} startIcon={<EditOutlined />}>
                              Изменить
                            </Button>
                            <Button size="small" color="error" onClick={() => removeBlock(b.id)} startIcon={<DeleteOutline />}>
                              Удалить
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  {blockDraft.id ? 'Редактировать блок' : 'Создать блок'}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Тип блока</InputLabel>
                      <Select
                        label="Тип блока"
                        value={blockDraft.type}
                        onChange={(e) => {
                          const t = e.target.value as BlockType
                          setBlockDraft((p) => ({
                            ...p,
                            type: t,
                            exerciseConfig: EXERCISE_BLOCK_TYPES.includes(t) ? (p.exerciseConfig || {}) : undefined,
                          }))
                        }}
                      >
                        {BLOCK_TYPES.map((bt) => (
                          <MenuItem key={bt.value} value={bt.value}>{bt.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Порядок"
                      type="number"
                      value={blockDraft.orderIndex}
                      onChange={(e) => setBlockDraft((p) => ({ ...p, orderIndex: Number(e.target.value) || 1 }))}
                    />
                  </Grid>

                  {EXERCISE_BLOCK_TYPES.includes(blockDraft.type) ? (
                    <Grid item xs={12}>
                      {(blockDraft.type === 'multiple_choice' || blockDraft.type === 'single_choice') && (
                        <MultipleChoiceEditor
                          value={blockDraft.exerciseConfig}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, exerciseConfig: v }))}
                        />
                      )}
                      {blockDraft.type === 'match_pairs' && (
                        <MatchPairsEditor
                          value={blockDraft.exerciseConfig}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, exerciseConfig: v }))}
                        />
                      )}
                      {blockDraft.type === 'fill_blank' && (
                        <FillBlankEditor
                          value={blockDraft.exerciseConfig}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, exerciseConfig: v }))}
                        />
                      )}
                      {blockDraft.type === 'manual_input' && (
                        <ManualInputEditor
                          value={blockDraft.exerciseConfig}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, exerciseConfig: v }))}
                        />
                      )}
                      {blockDraft.type === 'drag_drop' && (
                        <FillBlankConfigEditor
                          value={blockDraft.exerciseConfig || {}}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, exerciseConfig: v }))}
                        />
                      )}
                    </Grid>
                  ) : blockDraft.type === 'illustration' ? (
                    <>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Заполните поля для карточки-иллюстрации. Медиа загружается ниже после создания блока.
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Арабское слово"
                          value={blockDraft.arabicWord}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, arabicWord: e.target.value }))}
                          placeholder="تفاحة"
                          inputProps={{ dir: 'rtl', style: { fontSize: 24 } }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Транскрипция"
                          value={blockDraft.transcription}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, transcription: e.target.value }))}
                          placeholder="туфаха"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Перевод (RU)"
                          value={blockDraft.translationRu}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, translationRu: e.target.value }))}
                          placeholder="Яблоко"
                        />
                      </Grid>
                      {blockDraft.id ? (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>Медиа файлы</Typography>
                          <MediaUploader
                            blockId={blockDraft.id}
                            mediaFiles={mediaFiles}
                            onUpload={handleMediaUpload}
                            onDelete={handleMediaDelete}
                            onRefresh={() => loadBlockMedia(blockDraft.id!)}
                          />
                        </Grid>
                      ) : (
                        <Grid item xs={12}>
                          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'info.light', p: 2 }}>
                            <Typography variant="body2">
                              Сначала сохраните блок, чтобы загрузить медиа.
                            </Typography>
                          </Card>
                        </Grid>
                      )}
                    </>
                  ) : (
                    <>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Заголовок (RU)"
                          value={blockDraft.titleRu}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, titleRu: e.target.value }))}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                          <Chip size="small" color="primary" variant="outlined" label="Rich text" />
                        </Stack>
                        <RichTextEditor
                          value={blockDraft.textRuHtml}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, textRuHtml: v }))}
                          minHeight={280}
                          onUploadFile={uploadEditorMedia}
                          onRemoveMedia={removeEditorMedia}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Заголовок (KZ)"
                          value={blockDraft.titleKz}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, titleKz: e.target.value }))}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Заголовок (AR)"
                          value={blockDraft.titleAr}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, titleAr: e.target.value }))}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          size="small"
                          label="Текст (KZ)"
                          value={blockDraft.textKz}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, textKz: e.target.value }))}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          size="small"
                          label="Текст (AR)"
                          value={blockDraft.textAr}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, textAr: e.target.value }))}
                        />
                      </Grid>
                    </>
                  )}
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" startIcon={<SaveOutlined />} onClick={saveBlock}>
                        Сохранить блок
                      </Button>
                      <Button variant="outlined" onClick={resetBlockDraft}>
                        Очистить форму
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 'test' && (
        <Box>
          {!lessonTest ? (
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  Для этого урока тест ещё не создан
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Название теста (RU)"
                      value={newTestTitle}
                      onChange={(e) => setNewTestTitle(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Проходной %"
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
                        label="Проходной %"
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
                      {(['multiple_choice', 'single_choice', 'fill_blank', 'match_pairs', 'manual_input', 'drag_drop'] as QuestionType[]).map((t) => (
                        <Button key={t} size="small" variant="outlined" onClick={() => addQuestion(t)}>
                          + {t}
                        </Button>
                      ))}
                    </Stack>
                  </Stack>
                  <Stack spacing={2}>
                    {(lessonTest.questions || []).map((q: any) => (
                      <TestQuestionCard
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
      )}
    </Box>
  )
}

function TestQuestionCard({
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
    if (type === 'fill_blank') return <FillBlankConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} />
    if (type === 'match_pairs') return <MatchPairsConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} />
    if (type === 'manual_input') return <ManualInputConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} />
    if (type === 'drag_drop') return <DragDropConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} />
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Подсказка"
              value={q.questionRu?.hint || ''}
              onChange={(e) => setQ({ ...q, questionRu: { ...(q.questionRu || {}), hint: e.target.value } })}
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
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Конфиг</Typography>
            {renderConfigEditor()}
          </Grid>
          <Grid item xs={12}>
            <Accordion variant="outlined" sx={{ borderRadius: 1 }}>
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
                      const parsed = JSON.parse(configText || '{}')
                      setQ({ ...q, config: parsed })
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
                <TestAnswerRow key={a.id} answer={a} onSave={onSaveAnswer} onDelete={onDeleteAnswer} />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

function TestAnswerRow({
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
              label="Ответ"
              value={a.answerRu || ''}
              onChange={(e) => setA({ ...a, answerRu: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Порядок"
              value={a.orderIndex || 1}
              onChange={(e) => setA({ ...a, orderIndex: Number(e.target.value) || 1 })}
            />
          </Grid>
          <Grid item xs={12} md={1.5}>
            <FormControlLabel
              control={<Switch checked={!!a.isCorrect} onChange={(e) => setA({ ...a, isCorrect: e.target.checked })} />}
              label="Верно"
            />
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
