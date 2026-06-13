import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  Menu,
  Paper,
  Divider,
} from '@mui/material'
import {
  Add,
  ArrowBack,
  DeleteOutline,
  DragIndicator,
  EditOutlined,
  SaveOutlined,
  VisibilityOutlined,
  QuizOutlined,
  SchoolOutlined,
  TuneOutlined,
  ViewListOutlined,
  PermMediaOutlined,
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
  getTestMedia,
  deleteTestMedia,
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
  getConfigTemplate,
} from '../components/QuestionConfigEditors'
import {
  TestQuestionEditor,
  renderQuestionTypeMenuItems,
  type QuestionType,
} from '../components/TestQuestionEditor'
import MobilePreview, { MobilePreviewFrame, type MobilePreviewBlock } from '../components/MobilePreview'
import GridBlockEditor, { newGridItemRow, type GridItemRow } from '../components/GridBlockEditor'
import { wrapRichTextTables } from '../utils/wrapRichTextTables'
import { editorMaxWidthSx, pageTitleH4Sx } from '../utils/responsivePageSx'

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

const BLOCK_TYPES: { value: BlockType; label: string; group: string }[] = [
  { value: 'theory', label: 'Теория', group: 'Контент' },
  { value: 'illustration', label: 'Иллюстрация', group: 'Контент' },
  { value: 'audio', label: 'Аудио', group: 'Контент' },
  { value: 'video', label: 'Видео', group: 'Контент' },
  { value: 'grid', label: 'Сетка', group: 'Контент' },
  { value: 'multiple_choice', label: 'Multiple Choice', group: 'Упражнения' },
  { value: 'single_choice', label: 'Single Choice', group: 'Упражнения' },
  { value: 'fill_blank', label: 'Fill Blank', group: 'Упражнения' },
  { value: 'manual_input', label: 'Manual Input', group: 'Упражнения' },
  { value: 'match_pairs', label: 'Match Pairs (текст / аудио / картинка)', group: 'Упражнения' },
  { value: 'image_word_match', label: 'Картинка ↔ Слово', group: 'Упражнения' },
  { value: 'audio_multiple_choice', label: 'Audio Multiple Choice', group: 'Аудио-упражнения' },
  { value: 'audio_choice', label: 'Аудио → Буква (Махрадж)', group: 'Аудио-упражнения' },
  { value: 'listen_repeat', label: 'Послушай и повтори', group: 'Аудио-упражнения' },
  { value: 'listen_and_choose_word', label: 'Послушай → Слово', group: 'Аудио-упражнения' },
  { value: 'find_letter_in_word', label: 'Найди букву в слове', group: 'Буквы' },
  { value: 'lesson_complete', label: 'Завершение урока', group: 'Системные' },
]

/** Ordered, unique block-type group names for rendering grouped pickers. */
const BLOCK_TYPE_GROUPS: string[] = BLOCK_TYPES.reduce<string[]>((groups, bt) => {
  if (!groups.includes(bt.group)) groups.push(bt.group)
  return groups
}, [])

interface StudioBlock {
  id: string
  lessonId: string
  type: string
  orderIndex: number
  contentRu?: Record<string, any>
  contentKz?: Record<string, any>
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

function getBlockTypeLabel(type: string) {
  const normalized = type === 'element_grid' ? 'grid' : type
  return BLOCK_TYPES.find((bt) => bt.value === normalized)?.label || type
}

function getBlockDisplayTitle(block: StudioBlock) {
  if (block.type === 'illustration') {
    return (
      (block.contentRu?.arabicWord as string) ||
      (block.contentRu?.translation as string) ||
      'Без заголовка'
    )
  }
  if (block.type === 'element_grid' || block.type === 'grid') {
    const firstItem =
      Array.isArray((block.contentRu as { items?: any[] } | undefined)?.items) &&
      (block.contentRu as { items: any[] }).items[0]
    return (
      (block.contentRu?.title as string) ||
      (typeof firstItem === 'string' ? firstItem : firstItem?.mainText) ||
      'Сетка'
    )
  }
  return (
    (block.contentRu?.title as string) ||
    (block.contentRu?.question as string) ||
    stripHtml((block.contentRu?.html as string) || (block.contentRu?.text as string) || '').slice(0, 72) ||
    'Без заголовка'
  )
}

function formatDraftSavedAt(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function parseGridBlockForDraft(block: StudioBlock): {
  gridItemRows: GridItemRow[]
  gridColumnMode: '2' | '3' | '4' | 'auto'
  gridShowCaption: boolean
  gridInteractive: boolean
} {
  const cr = (block.contentRu || {}) as Record<string, any>
  const kz = (block.contentKz || {}) as Record<string, any>
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
        if (typeof r?.id === 'string' && r.id.trim()) g.id = r.id
        g.mainRu = (r?.mainText as string) || ''
        g.mainKz = (Array.isArray(kz.items) ? kz.items[i] : null)?.mainText || ''
        g.captionRu = (r?.caption as string) || ''
        g.captionKz = (Array.isArray(kz.items) ? kz.items[i] : null)?.caption || ''
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

function isGridItemAudioDescription(description: string | undefined, rowId: string) {
  const desc = (description || '').trim()
  if (!desc) return false
  return desc === `grid-${rowId}` || desc === `grid-${rowId.slice(0, 12)}` || desc.startsWith(`grid-${rowId}`)
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
  const type = block.type

  if (type === 'multiple_choice' || type === 'single_choice') {
    return {
      question: { ru: ru.question, kz: kz.question },
      options: (ru.options || []).map((opt: any, i: number) => ({
        text: {
          ru: opt.text,
          kz: kz.options?.[i]?.text,
        },
        isCorrect: opt.isCorrect,
      })),
    }
  }
  if (type === 'manual_input') {
    return {
      question: { ru: ru.question, kz: kz.question },
      correctAnswers: {
        ru: ru.correctAnswers || [],
        kz: kz.correctAnswers || [],
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
      const textRu = item.text
      const text =
        typeof textRu === 'string'
          ? { ru: textRu, kz: kzArr?.[i]?.text ?? '' }
          : { ru: textRu?.ru ?? '', kz: textRu?.kz ?? kzArr?.[i]?.text ?? '' }
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
        left: { ru: p.left, kz: kz.pairs?.[i]?.left },
        right: { ru: p.right, kz: kz.pairs?.[i]?.right },
        leftImageUrl: p.leftImageUrl,
        rightImageUrl: p.rightImageUrl,
      })),
    }
  }
  if (type === 'audio_multiple_choice') {
    return {
      question: { ru: ru.question, kz: kz.question },
      options: (ru.options || []).map((opt: any, i: number) => ({
        text: {
          ru: opt.text,
          kz: kz.options?.[i]?.text,
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

function mapExerciseConfigToContent(config: any, type: BlockType): { contentRu: any; contentKz: any } {
  if (!config) return { contentRu: {}, contentKz: {} }
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
          instructionKz: config.instructionKz ?? '',
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
        instructionKz: config.instructionKz,
        audioUrl: config.audioUrl,
      }
    }
    if (type === 'fill_blank') {
      return {
        instructionRu: config.instructionRu,
        instructionKz: config.instructionKz,
        sentenceTemplateRu: config.sentenceTemplateRu,
        sentenceTemplateKz: config.sentenceTemplateKz,
        options: config.options,
        correctAnswerId: config.correctAnswerId,
        explanationRu: config.explanationRu,
        explanationKz: config.explanationKz,
      }
    }
    if (type === 'image_word_match') {
      return {
        instructionRu: config.instructionRu,
        instructionKz: config.instructionKz,
        pairs: config.pairs,
      }
    }
    if (type === 'audio_choice') {
      return {
        instructionRu: config.instructionRu,
        instructionKz: config.instructionKz,
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
        instructionKz: config.instructionKz,
        word: config.word ?? '',
        targetLetter: config.targetLetter ?? '',
      }
    }
    if (type === 'listen_and_choose_word') {
      return {
        instructionRu: config.instructionRu,
        instructionKz: config.instructionKz,
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
  }
}

type BlockDraft = {
  id?: string
  type: BlockType
  orderIndex: number
  titleRu: string
  textRuHtml: string
  titleKz: string
  textKz: string
  arabicWord: string
  transcription: string
  translationRu: string
  translationKz: string
  exerciseConfig?: any
  messageRu?: string
  messageKz?: string
  summaryRu?: string
  summaryKz?: string
  nextActionRu?: string
  nextActionKz?: string
  nextActionButtonRu?: string
  nextActionButtonKz?: string
  gridItemRows: GridItemRow[]
  gridColumnMode: '2' | '3' | '4' | 'auto'
  gridShowCaption: boolean
  gridInteractive: boolean
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
  const [previewBlock, setPreviewBlock] = useState<MobilePreviewBlock | null>(null)
  const [deleteBlockConfirm, setDeleteBlockConfirm] = useState<StudioBlock | null>(null)
  const [confirmLeaveBlockEditor, setConfirmLeaveBlockEditor] = useState(false)
  const [availableDraft, setAvailableDraft] = useState<{
    key: string
    savedAt: string
    draft: BlockDraft
  } | null>(null)

  const [blockDraft, setBlockDraft] = useState<BlockDraft>({
    type: 'theory',
    orderIndex: 1,
    titleRu: '',
    textRuHtml: '',
    titleKz: '',
    textKz: '',
    arabicWord: '',
    transcription: '',
    translationRu: '',
    translationKz: '',
    gridItemRows: [newGridItemRow()],
    gridColumnMode: '3',
    gridShowCaption: false,
    gridInteractive: false,
  })
  const [blockDraftBaseline, setBlockDraftBaseline] = useState('')

  const snapshotBlockDraft = (draft: BlockDraft) => JSON.stringify(draft)

  const blockDraftStorageKey = useMemo(
    () => lessonId ? `ilmhub:lesson-block-draft:${lessonId}:${blockDraft.id || 'new'}` : '',
    [lessonId, blockDraft.id],
  )

  const hasUnsavedBlockChanges = useMemo(() => {
    if (!blockDraftBaseline) return false
    return snapshotBlockDraft(blockDraft) !== blockDraftBaseline
  }, [blockDraft, blockDraftBaseline])

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

  useEffect(() => {
    if (!blockDraftBaseline) {
      setBlockDraftBaseline(snapshotBlockDraft(blockDraft))
    }
  }, [blockDraft, blockDraftBaseline])

  useEffect(() => {
    if (!blockDraftStorageKey || typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(blockDraftStorageKey)
      if (!raw) {
        setAvailableDraft(null)
        return
      }
      const parsed = JSON.parse(raw) as { savedAt?: string; draft?: BlockDraft }
      if (!parsed?.draft) {
        setAvailableDraft(null)
        return
      }
      if (snapshotBlockDraft(parsed.draft) === snapshotBlockDraft(blockDraft)) {
        setAvailableDraft(null)
        return
      }
      setAvailableDraft({
        key: blockDraftStorageKey,
        savedAt: parsed.savedAt || '',
        draft: parsed.draft,
      })
    } catch {
      setAvailableDraft(null)
    }
  }, [blockDraftStorageKey])

  useEffect(() => {
    if (!blockDraftStorageKey || !blockDraftBaseline || typeof window === 'undefined') return
    const timer = window.setTimeout(() => {
      try {
        if (!hasUnsavedBlockChanges) return
        window.localStorage.setItem(
          blockDraftStorageKey,
          JSON.stringify({ savedAt: new Date().toISOString(), draft: blockDraft }),
        )
      } catch {
        // localStorage may be unavailable; editing should continue.
      }
    }, 900)
    return () => window.clearTimeout(timer)
  }, [blockDraft, blockDraftBaseline, blockDraftStorageKey, hasUnsavedBlockChanges])

  const clearBlockDraftStorage = (key = blockDraftStorageKey) => {
    if (!key || typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
    if (availableDraft?.key === key) setAvailableDraft(null)
  }

  const saveLessonMeta = async () => {
    if (!lessonDraft?.id) return
    try {
      await updateLesson(lessonDraft.id, {
        courseId: lessonDraft.courseId,
        moduleId: lessonDraft.moduleId || undefined,
        titleRu: lessonDraft.titleRu,
        titleKz: lessonDraft.titleKz,
        descriptionRu: lessonDraft.descriptionRu,
        descriptionKz: lessonDraft.descriptionKz,
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
    clearBlockDraftStorage()
    const nextOrder = (blocks[blocks.length - 1]?.orderIndex || 0) + 1
    const nextDraft: BlockDraft = {
      type: 'theory',
      orderIndex: nextOrder,
      titleRu: '',
      textRuHtml: '',
      titleKz: '',
      textKz: '',
      arabicWord: '',
      transcription: '',
      translationRu: '',
      translationKz: '',
      exerciseConfig: undefined,
      messageRu: undefined,
      messageKz: undefined,
      summaryRu: undefined,
      summaryKz: undefined,
      nextActionRu: undefined,
      nextActionKz: undefined,
      nextActionButtonRu: undefined,
      nextActionButtonKz: undefined,
      gridItemRows: [newGridItemRow()],
      gridColumnMode: '3',
      gridShowCaption: false,
      gridInteractive: false,
    }
    setBlockDraft(nextDraft)
    setBlockDraftBaseline(snapshotBlockDraft(nextDraft))
    setMediaFiles([])
  }

  const editBlock = (block: StudioBlock) => {
    const isExercise = EXERCISE_BLOCK_TYPES.includes(block.type as BlockType)
    const isLessonComplete = block.type === 'lesson_complete'
    const isGridLike = block.type === 'grid' || block.type === 'element_grid'
    const gridDraft = isGridLike ? parseGridBlockForDraft(block) : null
    const nextDraft: BlockDraft = {
      id: block.id,
      type: (isGridLike ? 'grid' : block.type) as BlockType,
      orderIndex: block.orderIndex,
      titleRu: (block.contentRu?.title as string) || '',
      textRuHtml: (block.contentRu?.html as string) || (block.contentRu?.text as string) || '',
      titleKz: (block.contentKz?.title as string) || '',
      textKz: (block.contentKz?.html as string) || (block.contentKz?.text as string) || '',
      arabicWord: (block.contentRu?.arabicWord as string) || '',
      transcription: (block.contentRu?.transcription as string) || '',
      translationRu: (block.contentRu?.translation as string) || (block.contentRu?.translationRu as string) || '',
      translationKz: (block.contentKz?.translation as string) || (block.contentKz?.translationKz as string) || '',
      exerciseConfig: isExercise ? buildExerciseConfigFromBlock(block) : undefined,
      messageRu: isLessonComplete ? (block.contentRu?.messageRu as string) || '' : undefined,
      messageKz: isLessonComplete ? (block.contentKz?.messageKz as string) || '' : undefined,
      summaryRu: isLessonComplete ? (block.contentRu?.summaryRu as string) || '' : undefined,
      summaryKz: isLessonComplete ? (block.contentKz?.summaryKz as string) || '' : undefined,
      nextActionRu: isLessonComplete ? (block.contentRu?.nextActionRu as string) || '' : undefined,
      nextActionKz: isLessonComplete ? (block.contentKz?.nextActionKz as string) || '' : undefined,
      nextActionButtonRu: isLessonComplete ? (block.contentRu?.nextActionButtonRu as string) || '' : undefined,
      nextActionButtonKz: isLessonComplete ? (block.contentKz?.nextActionButtonKz as string) || '' : undefined,
      gridItemRows: gridDraft?.gridItemRows || [newGridItemRow()],
      gridColumnMode: gridDraft?.gridColumnMode || '3',
      gridShowCaption: gridDraft?.gridShowCaption ?? false,
      gridInteractive: gridDraft?.gridInteractive ?? false,
    }
    setBlockDraft(nextDraft)
    setBlockDraftBaseline(snapshotBlockDraft(nextDraft))
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

  const handleBackFromBlockEditor = () => {
    if (hasUnsavedBlockChanges) {
      setConfirmLeaveBlockEditor(true)
      return
    }
    resetBlockDraft()
  }

  const getGridRowsWithMediaAudio = (rows: GridItemRow[]) => {
    const audioFiles = mediaFiles.filter((f) => f.type === 'audio' && f.url)
    const canFallbackByOrder = audioFiles.length >= rows.length
    return rows.map((row, index) => {
      if ((row.audioUrl || '').trim()) return row
      const byDescription = audioFiles.find((file) => isGridItemAudioDescription(file.description, row.id))
      const byOrder = canFallbackByOrder ? audioFiles[index] : undefined
      const audioUrl = byDescription?.url || byOrder?.url || ''
      return audioUrl ? { ...row, audioUrl } : row
    })
  }

  const buildBlockPayload = (includeLessonId: boolean, options?: { allowDraftGridWithoutAudio?: boolean }) => {
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
        contentKz: {
          messageKz: blockDraft.messageKz || '',
          summaryKz: blockDraft.summaryKz || '',
          nextActionKz: blockDraft.nextActionKz || '',
          nextActionButtonKz: blockDraft.nextActionButtonKz || '',
        },
      }
      return includeLessonId && lessonId ? { lessonId, ...base } : base
    }

    if (blockDraft.type === 'grid') {
      const rows = getGridRowsWithMediaAudio(
        (blockDraft.gridItemRows || []).filter((r) => (r.mainRu || '').trim().length > 0),
      )
      const col =
        blockDraft.gridColumnMode === 'auto' ? 'auto' : Number(blockDraft.gridColumnMode)
      const showCaption = blockDraft.gridShowCaption
      const interactive = blockDraft.gridInteractive
      const buildItems = (locale: 'ru' | 'kz') =>
        rows.map((r) => {
          const main =
            locale === 'ru' ? r.mainRu.trim() : (r.mainKz || r.mainRu).trim()
          const cap = locale === 'ru' ? (r.captionRu || '').trim() : (r.captionKz || '').trim()
          const audio = (r.audioUrl || '').trim()
          return {
            id: r.id,
            mainText: main,
            ...(showCaption ? { caption: cap } : {}),
            ...(interactive && audio ? { audioUrl: audio } : {}),
            ...(options?.allowDraftGridWithoutAudio && audio ? { audioUrl: audio } : {}),
          }
        })
      const base = {
        type: 'grid' as const,
        orderIndex: Number(blockDraft.orderIndex) || 0,
        contentRu: {
          title: blockDraft.titleRu || '',
          columns: col,
          showCaption,
          interactive: options?.allowDraftGridWithoutAudio ? false : interactive,
          items: buildItems('ru'),
        },
        contentKz: {
          title: blockDraft.titleKz || '',
          columns: col,
          showCaption,
          interactive: options?.allowDraftGridWithoutAudio ? false : interactive,
          items: buildItems('kz'),
        },
      }
      return includeLessonId && lessonId ? { lessonId, ...base } : base
    }

    const isExercise = EXERCISE_BLOCK_TYPES.includes(blockDraft.type)
    if (isExercise && blockDraft.exerciseConfig) {
      const { contentRu, contentKz } = mapExerciseConfigToContent(
        blockDraft.exerciseConfig,
        blockDraft.type,
      )
      const base = {
        type: blockDraft.type,
        orderIndex: Number(blockDraft.orderIndex) || 0,
        contentRu: contentRu || {},
        contentKz: contentKz || {},
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
    const contentKz = isIllustration
      ? {
          translation: blockDraft.translationKz || '',
        }
      : {
          title: blockDraft.titleKz,
          text: stripHtml(blockDraft.textKz),
          html: wrapRichTextTables(blockDraft.textKz),
        }

    const basePayload = {
      type: blockDraft.type,
      orderIndex: Number(blockDraft.orderIndex) || 0,
      contentRu,
      contentKz,
    }
    return includeLessonId && lessonId ? { lessonId, ...basePayload } : basePayload
  }

  const draftPreviewBlock = useMemo<MobilePreviewBlock>(() => {
    const payload = buildBlockPayload(false, { allowDraftGridWithoutAudio: true }) as {
      type?: string
      contentRu?: Record<string, any>
      contentKz?: Record<string, any>
    }
    return {
      type: payload.type || blockDraft.type,
      contentRu: payload.contentRu || {},
      contentKz: payload.contentKz || {},
    }
  }, [blockDraft, mediaFiles])

  const ensureBlockIdForMedia = async (): Promise<string> => {
    let blockId = blockDraft.id
    if (!blockId && lessonId) {
      const payload = buildBlockPayload(true, { allowDraftGridWithoutAudio: blockDraft.type === 'grid' })
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
      const rows = getGridRowsWithMediaAudio(
        (blockDraft.gridItemRows || []).filter((r) => (r.mainRu || '').trim().length > 0),
      )
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
      if (rows.some((row) => row.audioUrl && row.audioUrl !== blockDraft.gridItemRows.find((draftRow) => draftRow.id === row.id)?.audioUrl)) {
        const resolvedById = new Map(rows.map((row) => [row.id, row.audioUrl]))
        setBlockDraft((prev) => ({
          ...prev,
          gridItemRows: prev.gridItemRows.map((row) => {
            const audioUrl = resolvedById.get(row.id)
            return audioUrl && audioUrl !== row.audioUrl ? { ...row, audioUrl } : row
          }),
        }))
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
      clearBlockDraftStorage()
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
    const { data } = await uploadBlockMedia(blockId, file, 'audio', `grid-${rowId}`)
    await loadBlockMedia(blockId)
    const url = (data as { url?: string })?.url
    if (!url) throw new Error('Нет URL в ответе загрузки')
    setBlockDraft((prev) => ({
      ...prev,
      gridItemRows: prev.gridItemRows.map((row) => (row.id === rowId ? { ...row, audioUrl: url } : row)),
    }))
  }

  const removeBlock = async (id: string) => {
    try {
      await deleteLessonBlock(id)
      await loadLessonAndContext()
      notifySuccess('Блок удален')
      if (blockDraft.id === id) resetBlockDraft()
      setDeleteBlockConfirm(null)
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
    <Box sx={editorMaxWidthSx}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1}
        sx={{ mb: 1.5, gap: { xs: 0.5, sm: 0 } }}
      >
        <Button startIcon={<ArrowBack />} onClick={backToContent} size="small" variant="text">
          К контенту
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
          {breadcrumb}
        </Typography>
      </Stack>

      {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!!success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 3,
          p: { xs: 2, md: 2.5 },
          mb: 2.5,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(129,140,248,0.03) 100%)',
          borderColor: 'rgba(99,102,241,0.2)',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
              bgcolor: 'rgba(99,102,241,0.1)',
            }}
          >
            <SchoolOutlined />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ ...pageTitleH4Sx, mb: 0.25, fontSize: { xs: 20, md: 24 } }}>
              {lesson.titleRu}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip size="small" icon={<ViewListOutlined sx={{ fontSize: '16px !important' }} />} label={`${blocks.length} блоков`} sx={{ height: 24 }} />
              <Chip
                size="small"
                color={lessonTest ? 'success' : 'default'}
                variant={lessonTest ? 'filled' : 'outlined'}
                icon={<QuizOutlined sx={{ fontSize: '16px !important' }} />}
                label={lessonTest ? `Тест: ${(lessonTest.questions || []).length} вопр.` : 'Тест не создан'}
                sx={{ height: 24 }}
              />
              {lessonDraft.isPremium ? <Chip size="small" color="warning" label="Premium" sx={{ height: 24 }} /> : null}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          minHeight: 48,
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 48, fontWeight: 600, textTransform: 'none', fontSize: 15 },
        }}
      >
        <Tab value="meta" iconPosition="start" icon={<TuneOutlined sx={{ fontSize: 20 }} />} label="Метаданные" />
        <Tab value="blocks" iconPosition="start" icon={<ViewListOutlined sx={{ fontSize: 20 }} />} label="Блоки" />
        <Tab value="test" iconPosition="start" icon={<QuizOutlined sx={{ fontSize: 20 }} />} label="Тест урока" />
      </Tabs>

      {activeTab === 'meta' && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <TuneOutlined fontSize="small" color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Размещение и описание
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Укажите, к какому курсу и модулю относится урок, и заполните основную информацию.
            </Typography>
            <Grid container spacing={2.5}>
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
                  size="small"
                  label="Название урока (RU)"
                  value={lessonDraft.titleRu || ''}
                  onChange={(e) => setLessonDraft((p) => ({ ...p, titleRu: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Порядок"
                  helperText="Позиция урока в списке"
                  value={lessonDraft.orderIndex ?? 0}
                  onChange={(e) => setLessonDraft((p) => ({ ...p, orderIndex: Number(e.target.value) || 0 }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
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
                  size="small"
                  type="number"
                  label="Длительность (мин)"
                  value={lessonDraft.estimatedMinutes ?? 10}
                  onChange={(e) => setLessonDraft((p) => ({ ...p, estimatedMinutes: Number(e.target.value) || 10 }))}
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 0.5 }} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Параметры доступа
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Paper
                    variant="outlined"
                    sx={{ borderRadius: 2, px: 2, py: 1, flex: 1, borderColor: lessonDraft.isPremium ? 'warning.main' : 'divider' }}
                  >
                    <FormControlLabel
                      sx={{ m: 0, width: '100%' }}
                      control={
                        <Switch
                          checked={!!lessonDraft.isPremium}
                          onChange={(e) => setLessonDraft((p) => ({ ...p, isPremium: e.target.checked }))}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>Premium урок</Typography>
                          <Typography variant="caption" color="text.secondary">Доступен только по подписке</Typography>
                        </Box>
                      }
                    />
                  </Paper>
                  <Paper
                    variant="outlined"
                    sx={{ borderRadius: 2, px: 2, py: 1, flex: 1, borderColor: lessonDraft.isTest ? 'primary.main' : 'divider' }}
                  >
                    <FormControlLabel
                      sx={{ m: 0, width: '100%' }}
                      control={
                        <Switch
                          checked={!!lessonDraft.isTest}
                          onChange={(e) => setLessonDraft((p) => ({ ...p, isTest: e.target.checked }))}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>Тестовый урок</Typography>
                          <Typography variant="caption" color="text.secondary">Урок-проверка знаний</Typography>
                        </Box>
                      }
                    />
                  </Paper>
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" size="large" startIcon={<SaveOutlined />} onClick={saveLessonMeta} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  Сохранить урок
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeTab === 'blocks' && (
        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} md={4} lg={3} xl={2}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              position: { md: 'sticky' },
              top: { md: 88 },
              maxHeight: { xs: 420, md: 'calc(100vh - 116px)' },
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
            }}
          >
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ViewListOutlined fontSize="small" color="primary" />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      Блоки урока
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {blocks.length ? `${blocks.length} блоков · перетащите для сортировки` : 'Пока пусто'}
                    </Typography>
                  </Box>
                </Stack>
                <Button size="small" variant="contained" onClick={resetBlockDraft} startIcon={<Add />} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  Новый
                </Button>
              </Stack>
              <Stack spacing={1} sx={{ overflowY: 'auto', pr: { md: 0.5 }, maxHeight: { xs: 320, md: 'calc(100vh - 224px)' } }}>
                {blocks.map((b) => (
                  <Paper
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
                      borderColor:
                        blockDraft.id === b.id || draggingBlockId === b.id
                          ? 'primary.main'
                          : 'divider',
                      bgcolor: blockDraft.id === b.id ? 'action.selected' : 'background.paper',
                      transition: 'border-color 120ms ease, background-color 120ms ease',
                    }}
                  >
                    <Box sx={{ py: 1, px: 1.25 }}>
                      <Stack direction="row" alignItems="flex-start" spacing={0.75}>
                        <DragIndicator fontSize="small" sx={{ color: 'text.disabled', mt: 0.25, flexShrink: 0 }} />
                        <Box sx={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => editBlock(b)}>
                          <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mb: 0.25 }}>
                            <Chip size="small" label={`#${b.orderIndex}`} sx={{ height: 20 }} />
                            <Chip size="small" color="primary" variant="outlined" label={getBlockTypeLabel(b.type)} sx={{ height: 20, maxWidth: { xs: '100%', md: 140 } }} />
                          </Stack>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }} noWrap>
                            {getBlockDisplayTitle(b)}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                          <IconButton size="small" onClick={() => setPreviewBlock(b)} title="Просмотр">
                            <VisibilityOutlined fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => editBlock(b)} title="Изменить">
                            <EditOutlined fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => setDeleteBlockConfirm(b)} title="Удалить">
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Box>
                  </Paper>
                ))}
                {blocks.length === 0 && (
                  <Stack alignItems="center" spacing={1} sx={{ py: 4, px: 2, textAlign: 'center' }}>
                    <ViewListOutlined sx={{ fontSize: 36, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary">
                      Блоки ещё не созданы
                    </Typography>
                    <Button size="small" variant="outlined" startIcon={<Add />} onClick={resetBlockDraft}>
                      Создать первый блок
                    </Button>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
          </Grid>

          <Grid item xs={12} md={8} lg={9} xl={7}>
          <Card variant="outlined" sx={{ borderRadius: 2, minWidth: 0 }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, minWidth: 0 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  spacing={1}
                  sx={{ mb: 2 }}
                >
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {blockDraft.id ? 'Редактировать блок' : 'Создать блок'}
                      </Typography>
                      {hasUnsavedBlockChanges ? <Chip size="small" color="warning" label="Есть изменения" /> : null}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {getBlockTypeLabel(blockDraft.type)} · порядок {blockDraft.orderIndex}
                    </Typography>
                  </Box>
                  <Button size="small" startIcon={<ArrowBack />} onClick={handleBackFromBlockEditor}>
                    Сбросить выбор
                  </Button>
                </Stack>
                {availableDraft ? (
                  <Alert
                    severity="warning"
                    sx={{ mb: 2 }}
                    action={
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <Button
                          size="small"
                          color="inherit"
                          onClick={() => {
                            setBlockDraft(availableDraft.draft)
                            setAvailableDraft(null)
                          }}
                        >
                          Восстановить
                        </Button>
                        <Button size="small" color="inherit" onClick={() => clearBlockDraftStorage(availableDraft.key)}>
                          Удалить
                        </Button>
                      </Stack>
                    }
                  >
                    Найден автосохранённый черновик
                    {availableDraft.savedAt ? ` от ${formatDraftSavedAt(availableDraft.savedAt)}` : ''}.
                  </Alert>
                ) : null}
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
                        {BLOCK_TYPE_GROUPS.flatMap((group) => [
                          <ListSubheader key={`group-${group}`} disableSticky sx={{ lineHeight: 2.2, fontWeight: 700 }}>
                            {group}
                          </ListSubheader>,
                          ...BLOCK_TYPES.filter((bt) => bt.group === group).map((bt) => (
                            <MenuItem key={bt.value} value={bt.value}>{bt.label}</MenuItem>
                          )),
                        ])}
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
                          size="small"
                          label="Заголовок (messageKz)"
                          value={blockDraft.messageKz || ''}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, messageKz: e.target.value }))}
                          placeholder="Сіз сабақты аяқтадыңыз!"
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
                          label="Краткий итог урока (summaryKz)"
                          value={blockDraft.summaryKz || ''}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, summaryKz: e.target.value }))}
                          placeholder="Бұл сабақта не үйрендіңіз"
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
                          multiline
                          minRows={2}
                          size="small"
                          label="Следующее действие (nextActionKz)"
                          value={blockDraft.nextActionKz || ''}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, nextActionKz: e.target.value }))}
                          placeholder="Енді сіз қаншалықты меңгергеніңізді тексереміз"
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
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Текст кнопки (nextActionButtonKz)"
                          value={blockDraft.nextActionButtonKz || ''}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, nextActionButtonKz: e.target.value }))}
                          placeholder="Мини-тестке өту"
                        />
                      </Grid>
                    </>
                  ) : blockDraft.type === 'grid' ? (
                    <Grid item xs={12}>
                      <GridBlockEditor
                        titleRu={blockDraft.titleRu}
                        titleKz={blockDraft.titleKz}
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
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Перевод (KZ)"
                          value={blockDraft.translationKz}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, translationKz: e.target.value }))}
                          placeholder="Алма"
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
                          Медиа можно загрузить кнопками панели, перетащить прямо в текст или вставить из буфера.
                          Для компактного аудио используйте таблицу «текст + аудио» и бросайте файл в правую ячейку.
                          Чтобы уд��лить медиа: кликните по нему в тексте, затем нажмите корзину на панели.
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
                      <Grid item xs={12}>
                        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                          <Chip size="small" color="primary" variant="outlined" label="Rich text KZ" />
                        </Stack>
                        <RichTextEditor
                          value={blockDraft.textKz}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, textKz: v }))}
                          minHeight={240}
                          placeholder="Қазақша мәтінді енгізіңіз..."
                          onUploadFile={uploadEditorMedia}
                          onRemoveMedia={removeEditorMedia}
                        />
                      </Grid>
                    </>
                  )}
                  <Grid item xs={12}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      sx={{
                        flexWrap: 'wrap',
                        gap: 1,
                        position: { md: 'sticky' },
                        bottom: { md: 12 },
                        zIndex: 1,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 1,
                        '& .MuiButton-root': {
                          width: { xs: '100%', sm: 'auto' },
                        },
                      }}
                    >
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
          <Grid item xs={12} xl={3} sx={{ display: { xs: 'none', xl: 'block' } }}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2,
                position: { lg: 'sticky' },
                top: { lg: 88 },
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: 1.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Live mobile preview
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Обновляется из текущей формы
                    </Typography>
                  </Box>
                  <Button size="small" onClick={() => setPreviewBlock(draftPreviewBlock)}>
                    Открыть
                  </Button>
                </Stack>
                <MobilePreviewFrame block={draftPreviewBlock} maxFrameH={520} compact />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 'test' && (
        <Box>
          {!lessonTest ? (
            <Card sx={{ borderRadius: 3, minWidth: 0 }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
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
                    Тест для этого урока ещё не создан
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
                      value={newTestTitle}
                      onChange={(e) => setNewTestTitle(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Проходной %"
                      value={newTestPassing}
                      onChange={(e) => setNewTestPassing(Number(e.target.value) || 70)}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <Button fullWidth variant="contained" startIcon={<Add />} onClick={createLessonTest} sx={{ height: 40 }}>
                      Создать
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ) : (
            <Stack spacing={{ xs: 2, md: 3 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, minWidth: 0 }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, minWidth: 0 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Настройки теста
                    </Typography>
                    <Button color="error" variant="outlined" onClick={removeLessonTest} sx={{ width: { xs: '100%', sm: 'auto' } }}>
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
                  <Button sx={{ mt: 2, width: { xs: '100%', sm: 'auto' } }} variant="contained" onClick={updateLessonTestMeta}>
                    Сохранить настройки
                  </Button>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 3, minWidth: 0 }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, minWidth: 0 }}>
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
                    onRefresh={() => lessonTest?.id && loadTestMedia(lessonTest.id)}
                  />
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 3, minWidth: 0 }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, minWidth: 0 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2, gap: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <QuizOutlined fontSize="small" color="primary" />
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                          Вопросы и ответы
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(lessonTest.questions || []).length
                            ? `${(lessonTest.questions || []).length} вопросов в тесте`
                            : 'Добавьте первый вопрос'}
                        </Typography>
                      </Box>
                    </Stack>
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Add />}
                        onClick={(e) => setAddQuestionMenuAnchor(e.currentTarget)}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        Добавить вопрос
                      </Button>
                      <Menu
                        anchorEl={addQuestionMenuAnchor}
                        open={Boolean(addQuestionMenuAnchor)}
                        onClose={() => setAddQuestionMenuAnchor(null)}
                      >
                        {renderQuestionTypeMenuItems((type) => {
                          setAddQuestionMenuAnchor(null)
                          void addQuestion(type)
                        })}
                      </Menu>
                    </>
                  </Stack>
                  {(lessonTest.questions || []).length === 0 ? (
                    <Stack alignItems="center" spacing={1} sx={{ py: 4, textAlign: 'center' }}>
                      <QuizOutlined sx={{ fontSize: 36, color: 'text.disabled' }} />
                      <Typography variant="body2" color="text.secondary">
                        В тесте пока нет вопросов
                      </Typography>
                    </Stack>
                  ) : (
                    <Stack spacing={2}>
                      {(lessonTest.questions || []).map((q: any, idx: number) => (
                        <TestQuestionEditor
                          key={q.id}
                          index={idx}
                          question={q}
                          mediaMode="question"
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
      )}

      <MobilePreview
        open={!!previewBlock}
        onClose={() => setPreviewBlock(null)}
        block={previewBlock}
      />

      <Dialog
        open={!!deleteBlockConfirm}
        onClose={() => setDeleteBlockConfirm(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Удалить блок?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Блок #{deleteBlockConfirm?.orderIndex} ({deleteBlockConfirm?.type}) будет удален из урока. Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteBlockConfirm(null)}>Отмена</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteBlockConfirm && removeBlock(deleteBlockConfirm.id)}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmLeaveBlockEditor} onClose={() => setConfirmLeaveBlockEditor(false)} fullWidth maxWidth="xs">
        <DialogTitle>Несохранённые изменения</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Несохранённые изменения будут потеряны. Продолжить?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmLeaveBlockEditor(false)}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setConfirmLeaveBlockEditor(false)
              resetBlockDraft()
            }}
          >
            Выйти без сохранения
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
