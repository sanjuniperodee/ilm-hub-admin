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
  IconButton,
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
  Menu,
} from '@mui/material'
import {
  ArrowBack,
  DeleteOutline,
  EditOutlined,
  ExpandMore,
  SaveOutlined,
  VisibilityOutlined,
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
  uploadTestMedia,
  uploadQuestionMedia,
  getTestMedia,
  deleteTestMedia,
  getQuestionMedia,
  deleteQuestionMedia,
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
  AudioMultipleChoiceEditor,
  MatchPairsEditor,
  ManualInputEditor,
  ListenRepeatEditor,
  ImageWordMatchEditor,
  AudioChoiceEditor,
  FindLetterInWordEditor,
  ListenAndChooseWordEditor,
} from '../components/ExerciseEditors'
import {
  FillBlankConfigEditor,
  MatchPairsConfigEditor,
  ManualInputConfigEditor,
  MultipleChoiceConfigEditor,
  AudioMultipleChoiceConfigEditor,
  AudioChoiceConfigEditor,
  FindLetterInWordConfigEditor,
  ListenAndChooseWordConfigEditor,
  ImageWordMatchConfigEditor,
  getConfigTemplate,
} from '../components/QuestionConfigEditors'
import MobilePreview from '../components/MobilePreview'
import GridBlockEditor, { newGridItemRow, type GridItemRow } from '../components/GridBlockEditor'
import { wrapRichTextTables } from '../utils/wrapRichTextTables'

type BlockType =
  | 'theory'
  | 'illustration'
  | 'audio'
  | 'video'
  | 'lesson_complete'
  | 'multiple_choice'
  | 'audio_multiple_choice'
  | 'single_choice'
  | 'match_pairs'
  | 'fill_blank'
  | 'manual_input'
  | 'listen_repeat'
  | 'image_word_match'
  | 'audio_choice'
  | 'find_letter_in_word'
  | 'listen_and_choose_word'
  | 'grid'
type DetailTab = 'meta' | 'blocks' | 'test'
type QuestionType = 'multiple_choice' | 'single_choice' | 'fill_blank' | 'match_pairs' | 'manual_input'

const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: 'theory', label: 'Теория' },
  { value: 'illustration', label: 'Иллюстрация' },
  { value: 'audio', label: 'Аудио' },
  { value: 'video', label: 'Видео' },
  { value: 'lesson_complete', label: 'Завершение урока' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'audio_multiple_choice', label: 'Audio Multiple Choice' },
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'match_pairs', label: 'Match Pairs (текст / аудио / картинка)' },
  { value: 'fill_blank', label: 'Fill Blank' },
  { value: 'manual_input', label: 'Manual Input' },
  { value: 'listen_repeat', label: 'Послушай и повтори' },
  { value: 'image_word_match', label: 'Картинка ↔ Слово' },
  { value: 'audio_choice', label: 'Аудио → Буква (Махрадж)' },
  { value: 'find_letter_in_word', label: 'Найди букву в слове' },
  { value: 'listen_and_choose_word', label: 'Послушай → Слово' },
  { value: 'grid', label: 'Сетка' },
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
  /** Shown in Match Pairs audio chips when set (stored on media_files). */
  description?: string
}

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

function parseGridBlockForDraft(block: StudioBlock): {
  gridItemRows: GridItemRow[]
  gridColumnMode: '2' | '3' | '4' | 'auto'
  gridShowCaption: boolean
  gridInteractive: boolean
} {
  const cr = (block.contentRu || {}) as Record<string, any>
  const kz = (block.contentKz || {}) as Record<string, any>
  const ar = (block.contentAr || {}) as Record<string, any>
  const colRaw = cr.columns
  let gridColumnMode: '2' | '3' | '4' | 'auto' = '3'
  if (colRaw === 'auto' || colRaw === 'Auto') {
    gridColumnMode = 'auto'
  } else {
    const n = Math.min(4, Math.max(2, Number(colRaw) || 3))
    gridColumnMode = (String(n) as '2' | '3' | '4')
  }
  const gridShowCaption = !!cr.showCaption
  const gridInteractive = !!cr.interactive
  const itemsRaw = cr.items
  if (Array.isArray(itemsRaw) && itemsRaw.length > 0) {
    if (typeof itemsRaw[0] === 'string') {
      const strs = (itemsRaw as string[]).map((s) => String(s))
      return {
        gridItemRows: strs.length
          ? strs.map((s) => {
              const g = newGridItemRow()
              g.mainRu = s
              g.mainKz = s
              g.mainAr = s
              return g
            })
          : [newGridItemRow()],
        gridColumnMode,
        gridShowCaption: false,
        gridInteractive: false,
      }
    }
    return {
      gridItemRows: (itemsRaw as any[]).map((r, i) => {
        const g = newGridItemRow()
        g.mainRu = (r?.mainText as string) || ''
        g.mainKz = (Array.isArray(kz.items) ? kz.items[i] : null)?.mainText || ''
        g.mainAr = (Array.isArray(ar.items) ? ar.items[i] : null)?.mainText || ''
        g.captionRu = (r?.caption as string) || ''
        g.captionKz = (Array.isArray(kz.items) ? kz.items[i] : null)?.caption || ''
        g.captionAr = (Array.isArray(ar.items) ? ar.items[i] : null)?.caption || ''
        g.audioUrl = (r?.audioUrl as string) || ''
        return g
      }),
      gridColumnMode,
      gridShowCaption,
      gridInteractive,
    }
  }
  return {
    gridItemRows: [newGridItemRow()],
    gridColumnMode,
    gridShowCaption,
    gridInteractive,
  }
}

const EXERCISE_BLOCK_TYPES: BlockType[] = [
  'multiple_choice',
  'audio_multiple_choice',
  'single_choice',
  'match_pairs',
  'fill_blank',
  'manual_input',
  'listen_repeat',
  'image_word_match',
  'audio_choice',
  'find_letter_in_word',
  'listen_and_choose_word',
]

/** Block types that use the MediaUploader for audio files */
const AUDIO_MEDIA_BLOCK_TYPES: BlockType[] = [
  'audio_multiple_choice',
  'listen_repeat',
  'audio_choice',
  'listen_and_choose_word',
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
    const inferItemType = (item: any): 'text' | 'audio' | 'image' => {
      if (item.itemType === 'audio' || item.itemType === 'image' || item.itemType === 'text') {
        return item.itemType
      }
      if (item.audioUrl || item.audioMediaId) return 'audio'
      if (item.imageUrl || item.imageMediaId) return 'image'
      return 'text'
    }
    const mapMatchItem = (item: any, i: number, side: 'left' | 'right') => {
      const kzArr = side === 'left' ? kz.leftItems : kz.rightItems
      const arArr = side === 'left' ? ar.leftItems : ar.rightItems
      const textRu = item.text
      const text =
        typeof textRu === 'string'
          ? { ru: textRu, kz: kzArr?.[i]?.text ?? '', ar: arArr?.[i]?.text ?? '' }
          : { ru: textRu?.ru ?? '', kz: textRu?.kz ?? kzArr?.[i]?.text ?? '', ar: textRu?.ar ?? arArr?.[i]?.text ?? '' }
      return {
        id: item.id,
        text,
        imageUrl: item.imageUrl ?? '',
        imageMediaId: item.imageMediaId ?? '',
        itemType: inferItemType(item),
        audioUrl: item.audioUrl ?? '',
        audioMediaId: item.audioMediaId ?? '',
        audioLabel: item.audioLabel ?? '',
      }
    }
    // New format: leftItems/rightItems/correctPairs (supports distractors)
    if (Array.isArray(ru.leftItems)) {
      return {
        instructionRu: ru.instructionRu ?? '',
        leftItems: ru.leftItems.map((item: any, i: number) => mapMatchItem(item, i, 'left')),
        rightItems: (ru.rightItems ?? []).map((item: any, i: number) => mapMatchItem(item, i, 'right')),
        correctPairs: ru.correctPairs ?? [],
      }
    }
    // Legacy pairs format (backward compat)
    return {
      pairs: (ru.pairs || []).map((p: any, i: number) => ({
        left: { ru: p.left, kz: kz.pairs?.[i]?.left, ar: ar.pairs?.[i]?.left },
        right: { ru: p.right, kz: kz.pairs?.[i]?.right, ar: ar.pairs?.[i]?.right },
        leftImageUrl: p.leftImageUrl,
        rightImageUrl: p.rightImageUrl,
      })),
    }
  }
  if (type === 'audio_multiple_choice') {
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
      audioUrl: ru.audioUrl,
    }
  }
  if (type === 'listen_repeat') {
    return {
      instructionRu: ru.instructionRu || 'Слушай и повторяй',
      audioUrl: ru.audioUrl,
    }
  }
  if (type === 'fill_blank') {
    return {
      instructionRu: ru.instructionRu,
      sentenceTemplateRu: ru.sentenceTemplateRu,
      options: ru.options,
      correctAnswerId: ru.correctAnswerId,
      explanationRu: ru.explanationRu,
    }
  }
  if (type === 'image_word_match') {
    return {
      instruction: ru.instruction ?? '',
      pairs: ru.pairs ?? [],
    }
  }
  if (type === 'audio_choice') {
    return {
      instructionRu: ru.instructionRu ?? '',
      audioUrl: ru.audioUrl ?? '',
      options: (ru.options || []).map((opt: any) => ({
        id: opt.id,
        text: opt.text ?? '',
        isCorrect: opt.isCorrect ?? false,
      })),
    }
  }
  if (type === 'find_letter_in_word') {
    return {
      instructionRu: ru.instructionRu ?? 'Найдите букву в слове',
      word: ru.word ?? '',
      targetLetter: ru.targetLetter ?? '',
    }
  }
  if (type === 'listen_and_choose_word') {
    return {
      instructionRu: ru.instructionRu ?? '',
      audioUrl: ru.audioUrl ?? '',
      options: (ru.options || []).map((opt: any) => ({
        id: opt.id,
        text: opt.text ?? '',
        isCorrect: opt.isCorrect ?? false,
      })),
    }
  }
  return {}
}

function mapExerciseConfigToContent(config: any, type: BlockType): { contentRu: any; contentKz: any; contentAr: any } {
  if (!config) return { contentRu: {}, contentKz: {}, contentAr: {} }
  const mapContent = (lang: string) => {
    if (type === 'multiple_choice' || type === 'single_choice' || type === 'audio_multiple_choice' || type === 'manual_input') {
      return {
        question: config.question?.[lang],
        options: config.options?.map((o: any, i: number) => ({
          id: o.id || `opt_${i + 1}`,
          text: o.text?.[lang] ?? (typeof o.text === 'string' ? o.text : ''),
          isCorrect: o.isCorrect,
        })),
        correctAnswers: config.correctAnswers?.[lang],
      }
    }
    if (type === 'match_pairs') {
      // New format with distractors (media ids stored on each locale for parity; editor uses RU as source)
      if (Array.isArray(config.leftItems)) {
        return {
          instructionRu: config.instructionRu ?? '',
          leftItems: config.leftItems.map((item: any) => ({
            id: item.id,
            text: item.text?.[lang] ?? '',
            imageUrl: item.imageUrl ?? '',
            imageMediaId: item.imageMediaId ?? '',
            itemType: item.itemType ?? 'text',
            audioUrl: item.audioUrl ?? '',
            audioMediaId: item.audioMediaId ?? '',
            audioLabel: item.audioLabel ?? '',
          })),
          rightItems: (config.rightItems ?? []).map((item: any) => ({
            id: item.id,
            text: item.text?.[lang] ?? '',
            imageUrl: item.imageUrl ?? '',
            imageMediaId: item.imageMediaId ?? '',
            itemType: item.itemType ?? 'text',
            audioUrl: item.audioUrl ?? '',
            audioMediaId: item.audioMediaId ?? '',
            audioLabel: item.audioLabel ?? '',
          })),
          correctPairs: config.correctPairs ?? [],
        }
      }
      // Legacy pairs format
      return {
        pairs: config.pairs?.map((p: any) => ({
          left: p.left?.[lang],
          right: p.right?.[lang],
          leftImageUrl: p.leftImageUrl,
          rightImageUrl: p.rightImageUrl,
        })),
      }
    }
    if (type === 'listen_repeat') {
      return {
        instructionRu: config.instructionRu,
        audioUrl: config.audioUrl,
      }
    }
    if (type === 'fill_blank') {
      return {
        instructionRu: config.instructionRu,
        sentenceTemplateRu: config.sentenceTemplateRu,
        options: config.options,
        correctAnswerId: config.correctAnswerId,
        explanationRu: config.explanationRu,
      }
    }
    if (type === 'image_word_match') {
      return {
        instruction: config.instruction,
        pairs: config.pairs,
      }
    }
    if (type === 'audio_choice') {
      return {
        instructionRu: config.instructionRu,
        audioUrl: config.audioUrl ?? '',
        options: config.options?.map((o: any, i: number) => ({
          id: o.id || `opt_${i + 1}`,
          text: o.text ?? '',
          isCorrect: o.isCorrect ?? false,
        })),
      }
    }
    if (type === 'find_letter_in_word') {
      return {
        instructionRu: config.instructionRu,
        word: config.word ?? '',
        targetLetter: config.targetLetter ?? '',
      }
    }
    if (type === 'listen_and_choose_word') {
      return {
        instructionRu: config.instructionRu,
        audioUrl: config.audioUrl ?? '',
        options: config.options?.map((o: any, i: number) => ({
          id: o.id || `opt_${i + 1}`,
          text: o.text ?? '',
          isCorrect: o.isCorrect ?? false,
        })),
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
  const [testMediaFiles, setTestMediaFiles] = useState<MediaFile[]>([])
  const [newTestTitle, setNewTestTitle] = useState('')
  const [newTestPassing, setNewTestPassing] = useState(70)
  const [addQuestionMenuAnchor, setAddQuestionMenuAnchor] = useState<null | HTMLElement>(null)
  const [previewBlock, setPreviewBlock] = useState<StudioBlock | null>(null)

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
    messageRu?: string
    summaryRu?: string
    nextActionRu?: string
    nextActionButtonRu?: string
    gridItemRows: GridItemRow[]
    gridColumnMode: '2' | '3' | '4' | 'auto'
    gridShowCaption: boolean
    gridInteractive: boolean
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
    gridItemRows: [newGridItemRow()],
    gridColumnMode: '3',
    gridShowCaption: false,
    gridInteractive: false,
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

  const loadTestMedia = async (miniTestId: string) => {
    try {
      const { data } = await getTestMedia(miniTestId)
      setTestMediaFiles(Array.isArray(data) ? data : [])
    } catch {
      setTestMediaFiles([])
    }
  }

  const handleTestMediaUpload = async (file: File, _type: 'image' | 'audio' | 'video', description?: string) => {
    if (!lessonTest?.id) return
    await uploadTestMedia(lessonTest.id, file, description)
  }

  const handleTestMediaDelete = async (mediaFileId: string) => {
    if (!lessonTest?.id) return
    await deleteTestMedia(lessonTest.id, mediaFileId)
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
      if (list[0]?.id) {
        await loadTestMedia(list[0].id)
      }
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
      messageRu: undefined,
      summaryRu: undefined,
      nextActionRu: undefined,
      nextActionButtonRu: undefined,
      gridItemRows: [newGridItemRow()],
      gridColumnMode: '3',
      gridShowCaption: false,
      gridInteractive: false,
    })
    setMediaFiles([])
  }

  const editBlock = (block: StudioBlock) => {
    const isExercise = EXERCISE_BLOCK_TYPES.includes(block.type as BlockType)
    const isLessonComplete = block.type === 'lesson_complete'
    const isGridLike = block.type === 'grid' || block.type === 'element_grid'
    const gridDraft = isGridLike ? parseGridBlockForDraft(block) : null
    setBlockDraft({
      id: block.id,
      type: (isGridLike ? 'grid' : block.type) as BlockType,
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
      messageRu: isLessonComplete ? (block.contentRu?.messageRu as string) || '' : undefined,
      summaryRu: isLessonComplete ? (block.contentRu?.summaryRu as string) || '' : undefined,
      nextActionRu: isLessonComplete ? (block.contentRu?.nextActionRu as string) || '' : undefined,
      nextActionButtonRu: isLessonComplete ? (block.contentRu?.nextActionButtonRu as string) || '' : undefined,
      gridItemRows: gridDraft?.gridItemRows || [newGridItemRow()],
      gridColumnMode: gridDraft?.gridColumnMode || '3',
      gridShowCaption: gridDraft?.gridShowCaption ?? false,
      gridInteractive: gridDraft?.gridInteractive ?? false,
    })
    if (
      block.type === 'illustration' ||
      block.type === 'audio_multiple_choice' ||
      block.type === 'listen_repeat' ||
      block.type === 'image_word_match' ||
      block.type === 'match_pairs' ||
      block.type === 'grid' ||
      block.type === 'element_grid'
    ) {
      setMediaFiles([])
      void loadBlockMedia(block.id)
    } else {
      setMediaFiles([])
    }
  }

  const buildBlockPayload = (includeLessonId: boolean) => {
    if (blockDraft.type === 'lesson_complete') {
      const base = {
        type: 'lesson_complete',
        orderIndex: Number(blockDraft.orderIndex) || 0,
        contentRu: {
          messageRu: blockDraft.messageRu || 'Вы завершили урок!',
          summaryRu: blockDraft.summaryRu || '',
          nextActionRu: blockDraft.nextActionRu || '',
          nextActionButtonRu: blockDraft.nextActionButtonRu || 'Перейти к мини-тесту',
        },
        contentKz: {},
        contentAr: {},
      }
      return includeLessonId && lessonId ? { lessonId, ...base } : base
    }

    if (blockDraft.type === 'grid') {
      const rows = (blockDraft.gridItemRows || []).filter((r) => (r.mainRu || '').trim().length > 0)
      const col =
        blockDraft.gridColumnMode === 'auto' ? 'auto' : Number(blockDraft.gridColumnMode)
      const showCaption = blockDraft.gridShowCaption
      const interactive = blockDraft.gridInteractive
      const buildItems = (locale: 'ru' | 'kz' | 'ar') =>
        rows.map((r) => {
          const main =
            locale === 'ru' ? r.mainRu.trim() : locale === 'kz' ? (r.mainKz || r.mainRu).trim() : (r.mainAr || r.mainRu).trim()
          const cap =
            locale === 'ru'
              ? (r.captionRu || '').trim()
              : locale === 'kz'
                ? (r.captionKz || '').trim()
                : (r.captionAr || '').trim()
          const audio = (r.audioUrl || '').trim()
          return {
            mainText: main,
            ...(showCaption ? { caption: cap } : {}),
            ...(interactive && audio ? { audioUrl: audio } : {}),
          }
        })
      const base = {
        type: 'grid' as const,
        orderIndex: Number(blockDraft.orderIndex) || 0,
        contentRu: {
          title: blockDraft.titleRu || '',
          columns: col,
          showCaption,
          interactive,
          items: buildItems('ru'),
        },
        contentKz: {
          title: blockDraft.titleKz || '',
          columns: col,
          showCaption,
          interactive,
          items: buildItems('kz'),
        },
        contentAr: {
          title: blockDraft.titleAr || '',
          columns: col,
          showCaption,
          interactive,
          items: buildItems('ar'),
        },
      }
      return includeLessonId && lessonId ? { lessonId, ...base } : base
    }

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
          // Same contract as mobile [preprocessIlmRichtextHtml]: bare tables get a clip wrapper
          // (idempotent; matches RichTextEditor + MobilePreview [wrapRichTextTables]).
          html: wrapRichTextTables(blockDraft.textRuHtml),
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
    if (blockDraft.type === 'grid') {
      const rows = (blockDraft.gridItemRows || []).filter((r) => (r.mainRu || '').trim().length > 0)
      if (rows.length === 0) {
        setError('Сетка: добавьте хотя бы один элемент с основным текстом (RU)')
        return
      }
      if (blockDraft.gridInteractive) {
        for (const r of rows) {
          if (!(r.audioUrl || '').trim()) {
            setError('Сетка: для интерактивного режима загрузите аудио у каждой карточки (или отключите интерактив)')
            return
          }
        }
      }
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

  const handleMediaUpload = async (file: File, type: 'image' | 'audio' | 'video', description?: string) => {
    const blockId = await ensureBlockIdForMedia()
    await uploadBlockMedia(blockId, file, type, description)
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

  const handleGridItemAudio = async (rowId: string, file: File) => {
    const blockId = await ensureBlockIdForMedia()
    const { data } = await uploadBlockMedia(blockId, file, 'audio', `grid-${rowId.slice(0, 12)}`)
    await loadBlockMedia(blockId)
    const url = (data as { url?: string })?.url
    if (!url) throw new Error('Нет URL в ответе загрузки')
    return url
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

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 3, minHeight: 44 }}>
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
        <Stack direction="column" spacing={3}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 2 }}>
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
                    <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }} noWrap>
                            #{b.orderIndex} • {b.type}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {b.type === 'illustration'
                              ? ((b.contentRu?.arabicWord as string) || (b.contentRu?.translation as string) || 'Без заголовка')
                              : b.type === 'element_grid' || b.type === 'grid'
                                ? ((b.contentRu?.title as string) ||
                                    (Array.isArray((b.contentRu as { items?: string[] } | undefined)?.items) &&
                                      (b.contentRu as { items: string[] }).items[0]) ||
                                    'Сетка')
                                : ((b.contentRu?.title as string) || (b.contentRu?.question as string) || 'Без заголовка')}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                          <IconButton size="small" onClick={() => setPreviewBlock(b)} title="Просмотр">
                            <VisibilityOutlined fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => editBlock(b)} title="Изменить">
                            <EditOutlined fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => removeBlock(b.id)} title="Удалить">
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
                {blocks.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    Блоки не созданы. Используйте форму справа.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

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
                            ...(t === 'grid'
                              ? {
                                  gridItemRows: p.gridItemRows?.length ? p.gridItemRows : [newGridItemRow()],
                                  gridColumnMode: p.gridColumnMode || '3',
                                  gridShowCaption: p.gridShowCaption ?? false,
                                  gridInteractive: p.gridInteractive ?? false,
                                }
                              : {}),
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
                      {blockDraft.type === 'audio_multiple_choice' && (
                        <AudioMultipleChoiceEditor
                          value={blockDraft.exerciseConfig}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, exerciseConfig: v }))}
                        />
                      )}
                      {blockDraft.type === 'match_pairs' && (
                        <MatchPairsEditor
                          key={blockDraft.id ?? `match-pairs-new-${blockDraft.orderIndex}`}
                          blockId={blockDraft.id}
                          value={blockDraft.exerciseConfig}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, exerciseConfig: v }))}
                          mediaFiles={mediaFiles}
                        />
                      )}
                      {blockDraft.type === 'fill_blank' && (
                        <FillBlankConfigEditor
                          value={blockDraft.exerciseConfig || {}}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, exerciseConfig: v }))}
                        />
                      )}
                      {blockDraft.type === 'manual_input' && (
                        <ManualInputEditor
                          value={blockDraft.exerciseConfig}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, exerciseConfig: v }))}
                        />
                      )}
                      {blockDraft.type === 'listen_repeat' && (
                        <ListenRepeatEditor
                          value={blockDraft.exerciseConfig}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, exerciseConfig: v }))}
                        />
                      )}
                      {blockDraft.type === 'image_word_match' && (
                        <ImageWordMatchEditor
                          value={blockDraft.exerciseConfig}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, exerciseConfig: v }))}
                          mediaFiles={mediaFiles}
                        />
                      )}
                      {blockDraft.type === 'audio_choice' && (
                        <AudioChoiceEditor
                          value={blockDraft.exerciseConfig}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, exerciseConfig: v }))}
                        />
                      )}
                      {blockDraft.type === 'find_letter_in_word' && (
                        <FindLetterInWordEditor
                          value={blockDraft.exerciseConfig}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, exerciseConfig: v }))}
                        />
                      )}
                      {blockDraft.type === 'listen_and_choose_word' && (
                        <ListenAndChooseWordEditor
                          value={blockDraft.exerciseConfig}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, exerciseConfig: v }))}
                        />
                      )}
                      {(AUDIO_MEDIA_BLOCK_TYPES.includes(blockDraft.type) || blockDraft.type === 'image_word_match' || blockDraft.type === 'match_pairs') && blockDraft.id ? (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            {(blockDraft.type === 'image_word_match' || blockDraft.type === 'match_pairs') ? 'Медиа файлы для пар' : 'Аудио файл'}
                          </Typography>
                          <MediaUploader
                            blockId={blockDraft.id}
                            mediaFiles={mediaFiles}
                            onUpload={handleMediaUpload}
                            onDelete={handleMediaDelete}
                            onRefresh={() => blockDraft.id && loadBlockMedia(blockDraft.id)}
                          />
                        </Box>
                      ) : null}
                    </Grid>
                  ) : blockDraft.type === 'lesson_complete' ? (
                    <>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Заголовок (messageRu)"
                          value={blockDraft.messageRu || ''}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, messageRu: e.target.value }))}
                          placeholder="Вы завершили урок!"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          size="small"
                          label="Краткий итог урока (summaryRu)"
                          value={blockDraft.summaryRu || ''}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, summaryRu: e.target.value }))}
                          placeholder="Что изучено в этом уроке"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          size="small"
                          label="Следующее действие (nextActionRu)"
                          value={blockDraft.nextActionRu || ''}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, nextActionRu: e.target.value }))}
                          placeholder="Теперь проверим, как вы усвоили материал"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Текст кнопки (nextActionButtonRu)"
                          value={blockDraft.nextActionButtonRu || ''}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, nextActionButtonRu: e.target.value }))}
                          placeholder="Перейти к мини-тесту"
                        />
                      </Grid>
                    </>
                  ) : blockDraft.type === 'grid' ? (
                    <Grid item xs={12}>
                      <GridBlockEditor
                        blockId={blockDraft.id}
                        titleRu={blockDraft.titleRu}
                        titleKz={blockDraft.titleKz}
                        titleAr={blockDraft.titleAr}
                        onTitleChange={(field, v) => setBlockDraft((p) => ({ ...p, [field]: v }))}
                        columnMode={blockDraft.gridColumnMode}
                        onColumnMode={(m) => setBlockDraft((p) => ({ ...p, gridColumnMode: m }))}
                        showCaption={blockDraft.gridShowCaption}
                        onShowCaption={(v) => setBlockDraft((p) => ({ ...p, gridShowCaption: v }))}
                        interactive={blockDraft.gridInteractive}
                        onInteractive={(v) => setBlockDraft((p) => ({ ...p, gridInteractive: v }))}
                        items={blockDraft.gridItemRows}
                        onItemsChange={(rows) => setBlockDraft((p) => ({ ...p, gridItemRows: rows }))}
                        onUploadItemAudio={handleGridItemAudio}
                      />
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
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Чтобы удалить или заменить вставленное аудио, фото или видео: кликните по нему в тексте, затем на
                          панели нажмите иконку корзины (удалит из текста и открепит загруженный файл на сервере).
                        </Typography>
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
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
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
          </Stack>
        )}
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
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
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
                    onRefresh={() => lessonTest?.id && loadTestMedia(lessonTest.id)}
                  />
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Вопросы и ответы
                    </Typography>
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={(e) => setAddQuestionMenuAnchor(e.currentTarget)}
                      >
                        + Добавить вопрос
                      </Button>
                      <Menu
                        anchorEl={addQuestionMenuAnchor}
                        open={Boolean(addQuestionMenuAnchor)}
                        onClose={() => setAddQuestionMenuAnchor(null)}
                      >
                        {(
                          [
                            { type: 'multiple_choice', label: 'Несколько вариантов (multiple choice)' },
                            { type: 'single_choice', label: 'Один вариант (single choice)' },
                            { type: 'fill_blank', label: 'Заполни пропуск (fill blank)' },
                            { type: 'match_pairs', label: 'Сопоставь пары (в т.ч. аудио ↔ текст)' },
                            { type: 'manual_input', label: 'Ввод вручную (manual input)' },
                          ] as { type: QuestionType; label: string }[]
                        ).map(({ type, label }) => (
                          <MenuItem
                            key={type}
                            onClick={() => {
                              setAddQuestionMenuAnchor(null)
                              void addQuestion(type)
                            }}
                          >
                            {label}
                          </MenuItem>
                        ))}
                      </Menu>
                    </>
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

      <MobilePreview
        open={!!previewBlock}
        onClose={() => setPreviewBlock(null)}
        block={previewBlock}
      />
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
  const [questionMediaFiles, setQuestionMediaFiles] = useState<any[]>([])

  const QUESTION_MEDIA_TYPES = [
    'match_pairs', 'audio_multiple_choice', 'image_word_match',
    'audio_choice', 'listen_and_choose_word',
  ]
  const needsMedia = QUESTION_MEDIA_TYPES.includes(q.type)

  useEffect(() => {
    setQ(question)
    setConfigText(JSON.stringify(question.config || {}, null, 2))
  }, [question])

  useEffect(() => {
    setConfigText(JSON.stringify(q.config || {}, null, 2))
  }, [q.config])

  useEffect(() => {
    if (q.id && needsMedia) {
      loadQuestionMedia(q.id)
    } else {
      setQuestionMediaFiles([])
    }
  }, [q.id, q.type, needsMedia])

  const loadQuestionMedia = async (questionId: string) => {
    try {
      const { data } = await getQuestionMedia(questionId)
      setQuestionMediaFiles(Array.isArray(data) ? data : [])
    } catch {
      setQuestionMediaFiles([])
    }
  }

  const handleQuestionMediaUpload = async (file: File, _type: 'image' | 'audio' | 'video', description?: string) => {
    if (!q.id) return
    await uploadQuestionMedia(q.id, file, description)
    await loadQuestionMedia(q.id)
  }

  const handleQuestionMediaDelete = async (mediaFileId: string) => {
    if (!q.id) return
    await deleteQuestionMedia(q.id, mediaFileId)
    await loadQuestionMedia(q.id)
  }

  const renderConfigEditor = () => {
    const type = q.type || 'multiple_choice'
    if (type === 'fill_blank') return <FillBlankConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} />
    if (type === 'match_pairs') return <MatchPairsConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} mediaFiles={questionMediaFiles} />
    if (type === 'manual_input') return <ManualInputConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} />
    if (type === 'audio_multiple_choice') return <AudioMultipleChoiceConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} mediaFiles={questionMediaFiles} />
    if (type === 'image_word_match') return <ImageWordMatchConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} mediaFiles={questionMediaFiles} />
    if (type === 'audio_choice') return <AudioChoiceConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} mediaFiles={questionMediaFiles} />
    if (type === 'find_letter_in_word') return <FindLetterInWordConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} />
    if (type === 'listen_and_choose_word') return <ListenAndChooseWordConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} mediaFiles={questionMediaFiles} />
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
                <MenuItem value="multiple_choice">Multiple choice</MenuItem>
                <MenuItem value="single_choice">Single choice</MenuItem>
                <MenuItem value="fill_blank">Fill blank</MenuItem>
                <MenuItem value="match_pairs">Match pairs</MenuItem>
                <MenuItem value="manual_input">Manual input</MenuItem>
                <MenuItem value="audio_multiple_choice">Аудио + выбор</MenuItem>
                <MenuItem value="image_word_match">Картинка ↔ Слово</MenuItem>
                <MenuItem value="audio_choice">Аудио → Буква (Махрадж)</MenuItem>
                <MenuItem value="find_letter_in_word">Найди букву в слове</MenuItem>
                <MenuItem value="listen_and_choose_word">Послушай → Слово</MenuItem>
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
          {needsMedia && q.id && (
            <Grid item xs={12}>
              <Accordion variant="outlined" sx={{ borderRadius: 1 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle2">Медиа файлы вопроса</Typography>
                    <Chip label={questionMediaFiles.length} size="small" />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <MediaUploader
                    blockId={undefined}
                    mediaFiles={questionMediaFiles}
                    onUpload={handleQuestionMediaUpload}
                    onDelete={handleQuestionMediaDelete}
                    onRefresh={() => q.id && loadQuestionMedia(q.id)}
                  />
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
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
          <Grid item xs={12}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button size="small" variant="contained" onClick={() => onSave(a)}>Сохранить</Button>
              <Button size="small" color="error" variant="outlined" onClick={() => onDelete(a.id)}>Удалить</Button>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
