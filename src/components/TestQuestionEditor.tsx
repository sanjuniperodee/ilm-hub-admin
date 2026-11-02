import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  ListSubheader,
  MenuItem,
  Radio,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Add,
  CodeOutlined,
  DeleteOutline,
  ExpandMore,
  KeyboardArrowRight,
  PermMediaOutlined,
  SaveOutlined,
  WarningAmberRounded,
} from '@mui/icons-material'
import {
  deleteQuestionMedia,
  getQuestionMedia,
  uploadQuestionMedia,
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
import { StatusChip, arabicInputProps, useConfirm } from './ui'
import { color, motion } from '../theme'
import { QuestionPreview } from './tests/QuestionPreview'
import { validateQuestion } from './tests/questionValidation'

export type QuestionType =
  | 'multiple_choice'
  | 'single_choice'
  | 'fill_blank'
  | 'match_pairs'
  | 'manual_input'
  | 'audio_multiple_choice'
  | 'image_word_match'
  | 'audio_choice'
  | 'find_letter_in_word'
  | 'listen_and_choose_word'

export interface QuestionTypeOption {
  type: QuestionType
  /** Full, human-friendly description shown in the add menu. */
  label: string
  /** Compact label used in chips and the type dropdown. */
  shortLabel: string
  /** Logical category used to group options in pickers. */
  group: string
}

/**
 * Single source of truth for the question types supported by every test editor.
 * Grouped so pickers can render labelled sections instead of one long flat list.
 */
export const QUESTION_TYPE_OPTIONS: QuestionTypeOption[] = [
  { type: 'single_choice', label: 'Один правильный вариант', shortLabel: 'Один ответ', group: 'Выбор ответа' },
  { type: 'multiple_choice', label: 'Несколько правильных вариантов', shortLabel: 'Несколько ответов', group: 'Выбор ответа' },
  { type: 'fill_blank', label: 'Заполни пропуск в предложении', shortLabel: 'Пропуск', group: 'Ввод текста' },
  { type: 'manual_input', label: 'Ручной ввод ответа', shortLabel: 'Ввод ответа', group: 'Ввод текста' },
  { type: 'match_pairs', label: 'Сопоставь пары (текст / аудио / картинка)', shortLabel: 'Пары', group: 'Сопоставление' },
  { type: 'image_word_match', label: 'Сопоставь картинку и слово', shortLabel: 'Картинка и слово', group: 'Сопоставление' },
  { type: 'audio_multiple_choice', label: 'Аудио + выбор варианта', shortLabel: 'Аудио и выбор', group: 'Аудио' },
  { type: 'audio_choice', label: 'Аудио → буква (махрадж)', shortLabel: 'Аудио и буква', group: 'Аудио' },
  { type: 'listen_and_choose_word', label: 'Послушай и выбери слово', shortLabel: 'Аудио и слово', group: 'Аудио' },
  { type: 'find_letter_in_word', label: 'Найди букву в слове', shortLabel: 'Найди букву', group: 'Буквы' },
]

/** Ordered, unique group names derived from the options list. */
export const QUESTION_TYPE_GROUPS: string[] = QUESTION_TYPE_OPTIONS.reduce<string[]>((groups, option) => {
  if (!groups.includes(option.group)) groups.push(option.group)
  return groups
}, [])

/** Question types that rely on media (audio/images) selectable inside their config. */
const MEDIA_QUESTION_TYPES: QuestionType[] = [
  'match_pairs',
  'audio_multiple_choice',
  'image_word_match',
  'audio_choice',
  'listen_and_choose_word',
]

export function getQuestionTypeLabel(type: string): string {
  return QUESTION_TYPE_OPTIONS.find((o) => o.type === type)?.shortLabel || 'Вопрос'
}

export function questionTypeNeedsMedia(type: string): boolean {
  return MEDIA_QUESTION_TYPES.includes(type as QuestionType)
}

interface TestQuestion {
  id?: string
  type?: QuestionType
  orderIndex?: number
  questionRu?: { text?: string; hint?: string }
  config?: Record<string, unknown>
  answers?: TestAnswer[]
}

interface TestAnswer {
  id: string
  answerRu?: string
  orderIndex?: number
  isCorrect?: boolean
}

export interface TestQuestionEditorProps {
  index: number
  question: TestQuestion
  /**
   * How media is sourced for this question's config editors:
   * - `test`: shared, test-level media passed via `mediaFiles` (read-only here).
   * - `question`: per-question media managed inline by this component.
   */
  mediaMode: 'test' | 'question'
  /** Test-level media files; used only when `mediaMode === 'test'`. */
  mediaFiles?: any[]
  /** May return a promise — the editor then shows a spinner until it settles. */
  onSave: (q: TestQuestion) => void
  onDelete: () => void
  onAddAnswer: () => void
  /** May return a promise — the editor then shows a spinner until it settles. */
  onSaveAnswer: (a: TestAnswer) => void
  onDeleteAnswer: (id: string) => void
  /** Optional: start expanded (e.g. for a just-created question). */
  defaultExpanded?: boolean
  /**
   * Optional: ask for confirmation (useConfirm) before `onDelete` / `onDeleteAnswer`.
   * Default `true`. Pass `false` if the parent already confirms.
   */
  confirmBeforeDelete?: boolean
  /** Optional: element rendered at the start of the header row (e.g. a drag handle). */
  headerStart?: ReactNode
  /** Optional: show the learner preview next to the editor (default `true`). */
  showPreview?: boolean
}

type DraftFields = Pick<TestQuestion, 'type' | 'orderIndex' | 'questionRu' | 'config'>

const pickFields = (q: TestQuestion): DraftFields => ({
  type: q.type,
  orderIndex: q.orderIndex,
  questionRu: q.questionRu,
  config: q.config,
})

const ARABIC_RE = /[\u0600-\u06FF]/
const smartInputProps = (value?: string) => (value && ARABIC_RE.test(value) ? arabicInputProps : { dir: 'auto' as const })

const answerEquals = (a: TestAnswer, b: TestAnswer) =>
  (a.answerRu ?? '') === (b.answerRu ?? '') && !!a.isCorrect === !!b.isCorrect && (a.orderIndex ?? 1) === (b.orderIndex ?? 1)

/**
 * Unified, collapsible editor for a single test question. Shared by the lesson
 * test tab and the standalone module/level/placement test editor so behaviour
 * and styling stay consistent across the admin.
 *
 * Local edits survive parent reloads (e.g. after saving another question): the
 * draft is replaced only when the server copy of *this* question changes.
 */
export function TestQuestionEditor({
  index,
  question,
  mediaMode,
  mediaFiles = [],
  onSave,
  onDelete,
  onAddAnswer,
  onSaveAnswer,
  onDeleteAnswer,
  defaultExpanded = false,
  confirmBeforeDelete = true,
  headerStart,
  showPreview = true,
}: TestQuestionEditorProps) {
  const confirm = useConfirm()
  const [draft, setDraft] = useState<DraftFields>(() => pickFields(question))
  const synced = useRef<DraftFields>(pickFields(question))
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, TestAnswer>>({})
  const [configText, setConfigText] = useState(() => JSON.stringify(question.config || {}, null, 2))
  const [configTextError, setConfigTextError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [questionMedia, setQuestionMedia] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [savingAnswerId, setSavingAnswerId] = useState<string | null>(null)

  // Sync the draft with the server copy without discarding unrelated local edits.
  useEffect(() => {
    const next = pickFields(question)
    const prev = synced.current
    if (JSON.stringify(next) === JSON.stringify(prev)) return
    setDraft((d) => {
      const wasDirty = JSON.stringify(d) !== JSON.stringify(prev)
      if (!wasDirty) return next
      const onlyOrderChanged =
        JSON.stringify({ ...next, orderIndex: prev.orderIndex }) === JSON.stringify(prev)
      return onlyOrderChanged ? { ...d, orderIndex: next.orderIndex } : next
    })
    synced.current = next
  }, [question])

  // Drop answer drafts that the server now matches (saved) or that no longer exist.
  useEffect(() => {
    const server = new Map((question.answers || []).map((a) => [a.id, a]))
    setAnswerDrafts((drafts) => {
      let changed = false
      const next: Record<string, TestAnswer> = {}
      for (const [id, d] of Object.entries(drafts)) {
        const s = server.get(id)
        if (!s || answerEquals(s, d)) {
          changed = true
          continue
        }
        next[id] = d
      }
      return changed ? next : drafts
    })
  }, [question.answers])

  // Reflect config editor changes back into the raw JSON view.
  useEffect(() => {
    setConfigText(JSON.stringify(draft.config || {}, null, 2))
    setConfigTextError(null)
  }, [draft.config])

  const type = (draft.type || 'multiple_choice') as QuestionType
  const isChoice = type === 'multiple_choice' || type === 'single_choice'
  const needsMedia = questionTypeNeedsMedia(type)
  const usesOwnMedia = mediaMode === 'question'
  const activeMedia = usesOwnMedia ? questionMedia : mediaFiles

  const answers = useMemo(
    () => (question.answers || []).map((a) => answerDrafts[a.id] ?? a),
    [question.answers, answerDrafts],
  )
  const dirtyAnswers = answers.filter((a) => !!answerDrafts[a.id])
  const questionDirty = JSON.stringify(draft) !== JSON.stringify(synced.current)
  const anyDirty = questionDirty || dirtyAnswers.length > 0

  const merged: TestQuestion = { ...question, ...draft, answers }
  const issues = useMemo(
    () => validateQuestion({ type, questionRu: draft.questionRu, config: draft.config as Record<string, any>, answers }),
    [type, draft.questionRu, draft.config, answers],
  )

  const typeLabel = getQuestionTypeLabel(type)
  const correctCount = answers.filter((a) => a.isCorrect).length

  const loadQuestionMedia = async (questionId: string) => {
    try {
      const { data } = await getQuestionMedia(questionId)
      setQuestionMedia(Array.isArray(data) ? data : [])
    } catch {
      setQuestionMedia([])
    }
  }

  useEffect(() => {
    if (usesOwnMedia && question.id && needsMedia) {
      void loadQuestionMedia(question.id)
    } else if (usesOwnMedia) {
      setQuestionMedia([])
    }
  }, [usesOwnMedia, question.id, type, needsMedia])

  const handleMediaUpload = async (file: File, _type: 'image' | 'audio' | 'video', description?: string) => {
    if (!question.id) return
    await uploadQuestionMedia(question.id, file, description)
    await loadQuestionMedia(question.id)
  }

  const handleMediaDelete = async (mediaFileId: string) => {
    if (!question.id) return
    await deleteQuestionMedia(question.id, mediaFileId)
    await loadQuestionMedia(question.id)
  }

  const setConfig = (config: Record<string, any>) => setDraft((d) => ({ ...d, config }))

  const changeType = async (newType: QuestionType) => {
    if (newType === type) return
    const ok = await confirm({
      title: 'Сменить тип вопроса?',
      description: `Тип изменится на «${getQuestionTypeLabel(newType)}». Настройки ответа заменятся шаблоном нового типа — изменения применятся после сохранения вопроса.`,
      confirmLabel: 'Сменить тип',
    })
    if (!ok) return
    setDraft((d) => ({ ...d, type: newType, config: getConfigTemplate(newType) }))
  }

  const updateAnswer = (id: string, patch: Partial<TestAnswer>) => {
    setAnswerDrafts((drafts) => {
      const base = drafts[id] ?? (question.answers || []).find((a) => a.id === id)
      if (!base) return drafts
      const next = { ...drafts, [id]: { ...base, ...patch } }
      // Single choice: marking one answer correct un-marks the others.
      if (type === 'single_choice' && patch.isCorrect) {
        for (const a of question.answers || []) {
          if (a.id === id) continue
          const current = next[a.id] ?? a
          if (current.isCorrect) next[a.id] = { ...current, isCorrect: false }
        }
      }
      // Remove drafts that equal the server copy again.
      for (const a of question.answers || []) {
        if (next[a.id] && answerEquals(next[a.id], a)) delete next[a.id]
      }
      return next
    })
  }

  const saveAnswer = async (a: TestAnswer) => {
    setSavingAnswerId(a.id)
    try {
      await Promise.resolve(onSaveAnswer(a))
    } finally {
      setSavingAnswerId(null)
    }
  }

  const saveAll = async () => {
    if (saving) return
    setSaving(true)
    try {
      if (questionDirty || dirtyAnswers.length === 0) {
        await Promise.resolve(onSave({ ...question, ...draft, answers }))
      }
      for (const a of dirtyAnswers) {
        await Promise.resolve(onSaveAnswer(a))
      }
    } finally {
      setSaving(false)
    }
  }

  const requestDelete = async () => {
    if (confirmBeforeDelete) {
      const ok = await confirm({
        title: `Удалить вопрос ${index + 1}?`,
        description: `«${draft.questionRu?.text || 'Без текста'}» и его варианты ответов будут удалены. Действие нельзя отменить.`,
        confirmLabel: 'Удалить вопрос',
        destructive: true,
      })
      if (!ok) return
    }
    onDelete()
  }

  const requestDeleteAnswer = async (a: TestAnswer) => {
    if (confirmBeforeDelete) {
      const ok = await confirm({
        title: 'Удалить вариант ответа?',
        description: a.answerRu ? `«${a.answerRu}» будет удалён.` : undefined,
        confirmLabel: 'Удалить',
        destructive: true,
      })
      if (!ok) return
    }
    onDeleteAnswer(a.id)
  }

  const renderConfigEditor = () => {
    const value = (draft.config || {}) as Record<string, any>
    switch (type) {
      case 'fill_blank':
        return <FillBlankConfigEditor value={value} onChange={setConfig} />
      case 'match_pairs':
        return <MatchPairsConfigEditor value={value} onChange={setConfig} mediaFiles={activeMedia} />
      case 'manual_input':
        return <ManualInputConfigEditor value={value} onChange={setConfig} />
      case 'audio_multiple_choice':
        return <AudioMultipleChoiceConfigEditor value={value} onChange={setConfig} mediaFiles={activeMedia} />
      case 'image_word_match':
        return <ImageWordMatchConfigEditor value={value} onChange={setConfig} mediaFiles={activeMedia} />
      case 'audio_choice':
        return <AudioChoiceConfigEditor value={value} onChange={setConfig} mediaFiles={activeMedia} />
      case 'find_letter_in_word':
        return <FindLetterInWordConfigEditor value={value} onChange={setConfig} />
      case 'listen_and_choose_word':
        return <ListenAndChooseWordConfigEditor value={value} onChange={setConfig} mediaFiles={activeMedia} />
      default:
        return <MultipleChoiceConfigEditor />
    }
  }

  const headerId = `question-${question.id ?? index}-header`
  const bodyId = `question-${question.id ?? index}-body`

  return (
    <Box
      sx={{
        borderRadius: 2,
        minWidth: 0,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: expanded ? 'surface.borderStrong' : 'divider',
        bgcolor: 'background.paper',
        transition: `border-color ${motion.fast}`,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          p: { xs: 1, sm: 1.25 },
          pl: headerStart ? 0.5 : { xs: 1, sm: 1.25 },
          bgcolor: expanded ? 'surface.sunken' : 'transparent',
          transition: `background-color ${motion.fast}`,
          '&:hover': { bgcolor: 'surface.sunken' },
        }}
      >
        {headerStart}
        <Box
          aria-hidden
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: color.bronze[800],
            bgcolor: 'brand.sand',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {index + 1}
        </Box>
        <Box
          component="button"
          type="button"
          id={headerId}
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((v) => !v)}
          sx={{
            all: 'unset',
            minWidth: 0,
            flex: 1,
            cursor: 'pointer',
            borderRadius: 1,
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.light', outlineOffset: 2 },
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            dir="auto"
          >
            {draft.questionRu?.text || 'Без текста вопроса'}
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
            <StatusChip size="small" tone="brand" hideDot label={typeLabel} />
            {isChoice && (
              <StatusChip
                size="small"
                tone={correctCount ? 'neutral' : 'warning'}
                hideDot
                label={`${answers.length} вар., верных ${correctCount}`}
              />
            )}
            {needsMedia && (
              <StatusChip
                size="small"
                tone="neutral"
                hideDot
                icon={<PermMediaOutlined sx={{ fontSize: '14px !important' }} />}
                label={usesOwnMedia ? `${activeMedia.length} медиа` : 'Медиа теста'}
              />
            )}
            {issues.length > 0 && (
              <StatusChip
                size="small"
                tone="warning"
                icon={<WarningAmberRounded sx={{ fontSize: '14px !important' }} />}
                hideDot
                label={`${issues.length} ${issues.length === 1 ? 'замечание' : issues.length < 5 ? 'замечания' : 'замечаний'}`}
              />
            )}
            {anyDirty && <StatusChip size="small" tone="info" label="Не сохранено" />}
          </Stack>
        </Box>
        <Tooltip title="Удалить вопрос">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); void requestDelete() }}
            aria-label={`Удалить вопрос ${index + 1}`}
            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
          >
            <DeleteOutline fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton
          size="small"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Свернуть вопрос' : 'Развернуть вопрос'}
          aria-expanded={expanded}
          aria-controls={bodyId}
        >
          <KeyboardArrowRight sx={{ transition: `transform ${motion.base}`, transform: expanded ? 'rotate(90deg)' : 'none' }} />
        </IconButton>
      </Stack>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider />
        <Box id={bodyId} role="region" aria-labelledby={headerId} sx={{ containerType: 'inline-size', minWidth: 0 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 2.5,
              p: { xs: 1.5, sm: 2 },
              ...(showPreview && {
                '@container (min-width: 880px)': { gridTemplateColumns: 'minmax(0, 1fr) 300px' },
              }),
            }}
          >
            <Stack spacing={2} sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 120px' } }}>
                <TextField
                  select
                  size="small"
                  label="Тип вопроса"
                  value={type}
                  onChange={(e) => void changeType(e.target.value as QuestionType)}
                  SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 420 } } } }}
                >
                  {QUESTION_TYPE_GROUPS.flatMap((group) => [
                    <ListSubheader key={`g-${group}`} sx={{ lineHeight: 2.2, fontWeight: 600 }}>{group}</ListSubheader>,
                    ...QUESTION_TYPE_OPTIONS.filter((o) => o.group === group).map((qt) => (
                      <MenuItem key={qt.type} value={qt.type}>{qt.label}</MenuItem>
                    )),
                  ])}
                </TextField>
                <TextField
                  size="small"
                  type="number"
                  label="Порядок"
                  value={draft.orderIndex || 1}
                  onChange={(e) => setDraft((d) => ({ ...d, orderIndex: Number(e.target.value) || 1 }))}
                />
              </Box>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Текст вопроса"
                value={draft.questionRu?.text || ''}
                onChange={(e) => setDraft((d) => ({ ...d, questionRu: { ...(d.questionRu || {}), text: e.target.value } }))}
                inputProps={{ dir: 'auto' }}
                error={!draft.questionRu?.text?.trim()}
                helperText={!draft.questionRu?.text?.trim() ? 'Введите текст вопроса' : undefined}
              />
              <TextField
                fullWidth
                size="small"
                label="Подсказка"
                helperText="Необязательно. Показывается под вопросом."
                value={draft.questionRu?.hint || ''}
                onChange={(e) => setDraft((d) => ({ ...d, questionRu: { ...(d.questionRu || {}), hint: e.target.value } }))}
                inputProps={{ dir: 'auto' }}
              />

              {usesOwnMedia && needsMedia && question.id && (
                <Box sx={{ borderRadius: 2, p: { xs: 1, sm: 1.5 }, border: '1px solid', borderColor: 'divider', bgcolor: 'surface.sunken', minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <PermMediaOutlined fontSize="small" sx={{ color: 'primary.main' }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2">Медиа этого вопроса</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activeMedia.length
                          ? `${activeMedia.length} файлов доступно в полях ниже`
                          : 'Загрузите аудио или изображение, затем выберите его в настройках ответа'}
                      </Typography>
                    </Box>
                  </Stack>
                  <MediaUploader
                    blockId={undefined}
                    mediaFiles={questionMedia}
                    onUpload={handleMediaUpload}
                    onDelete={handleMediaDelete}
                    onRefresh={() => question.id && loadQuestionMedia(question.id)}
                  />
                </Box>
              )}

              {isChoice ? (
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle2">Варианты ответов</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {type === 'single_choice' ? 'Отметьте один правильный вариант.' : 'Отметьте все правильные варианты.'}
                      </Typography>
                    </Box>
                    <Button size="small" variant="outlined" startIcon={<Add />} onClick={onAddAnswer}>
                      Добавить вариант
                    </Button>
                  </Stack>
                  {answers.length === 0 ? (
                    <Box sx={{ p: 2, textAlign: 'center', border: '1px dashed', borderColor: 'surface.borderStrong', borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary">Вариантов пока нет.</Typography>
                    </Box>
                  ) : (
                    <Stack spacing={0.75} role={type === 'single_choice' ? 'radiogroup' : 'group'} aria-label="Варианты ответов">
                      {answers.map((a, i) => (
                        <TestAnswerRow
                          key={a.id}
                          answer={a}
                          index={i}
                          single={type === 'single_choice'}
                          dirty={!!answerDrafts[a.id]}
                          saving={savingAnswerId === a.id}
                          onChange={(patch) => updateAnswer(a.id, patch)}
                          onSave={() => void saveAnswer(a)}
                          onDelete={() => void requestDeleteAnswer(a)}
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
              ) : (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Настройки ответа</Typography>
                  {renderConfigEditor()}
                </Box>
              )}

              {issues.length > 0 && (
                <Alert severity="warning" variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>Ученик увидит вопрос с ошибками</Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
                    {issues.map((issue) => (
                      <Typography component="li" variant="body2" key={issue}>{issue}</Typography>
                    ))}
                  </Box>
                </Alert>
              )}

              <Accordion variant="outlined" disableGutters sx={{ borderRadius: 1.5, overflow: 'hidden', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CodeOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
                    <Typography variant="body2">Настройки в JSON (для опытных)</Typography>
                  </Stack>
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
                        setDraft((d) => ({ ...d, config: JSON.parse(configText || '{}') }))
                        setConfigTextError(null)
                      } catch {
                        setConfigTextError('Некорректный JSON — изменения не применены. Исправьте и уберите фокус с поля.')
                      }
                    }}
                    error={!!configTextError}
                    helperText={configTextError ?? 'Изменения применяются, когда поле теряет фокус.'}
                    inputProps={{ spellCheck: false, style: { fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace", fontSize: 12 } }}
                  />
                </AccordionDetails>
              </Accordion>
            </Stack>

            {showPreview && (
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ position: { md: 'sticky' }, top: 72 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Как увидит ученик</Typography>
                  <QuestionPreview
                    type={type}
                    questionRu={merged.questionRu}
                    config={merged.config as Record<string, any>}
                    answers={answers}
                  />
                </Box>
              </Box>
            )}
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            sx={{ px: { xs: 1.5, sm: 2 }, py: 1.25, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'surface.sunken' }}
          >
            <Typography variant="caption" color="text.secondary" aria-live="polite">
              {anyDirty
                ? `Не сохранено: ${[questionDirty ? 'вопрос' : null, dirtyAnswers.length ? `вариантов ${dirtyAnswers.length}` : null].filter(Boolean).join(', ')}`
                : 'Все изменения сохранены'}
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlined />}
              onClick={() => void saveAll()}
              disabled={saving}
            >
              {dirtyAnswers.length > 0 ? 'Сохранить всё' : 'Сохранить вопрос'}
            </Button>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  )
}

function TestAnswerRow({
  answer,
  index,
  single,
  dirty,
  saving,
  onChange,
  onSave,
  onDelete,
}: {
  answer: TestAnswer
  index: number
  single: boolean
  dirty: boolean
  saving: boolean
  onChange: (patch: Partial<TestAnswer>) => void
  onSave: () => void
  onDelete: () => void
}) {
  const correct = !!answer.isCorrect
  const label = `Вариант ${index + 1}`
  const Control = single ? Radio : Checkbox
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        minWidth: 0,
        p: 0.75,
        pr: 1,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: correct ? 'success.main' : 'divider',
        bgcolor: correct ? color.success.soft : 'background.paper',
        transition: `border-color ${motion.fast}, background-color ${motion.fast}`,
      }}
    >
      <Tooltip title={correct ? 'Правильный ответ' : 'Отметить правильным'}>
        <Control
          size="small"
          color="success"
          checked={correct}
          onChange={(_, checked) => onChange({ isCorrect: single ? true : checked })}
          inputProps={{ 'aria-label': `${label}: правильный` }}
        />
      </Tooltip>
      <TextField
        fullWidth
        size="small"
        placeholder="Текст ответа"
        value={answer.answerRu || ''}
        onChange={(e) => onChange({ answerRu: e.target.value })}
        inputProps={{ ...smartInputProps(answer.answerRu), 'aria-label': label }}
        error={!answer.answerRu?.trim()}
        sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
      />
      {correct && (
        <Typography variant="caption" sx={{ color: 'success.dark', fontWeight: 600, display: { xs: 'none', sm: 'block' }, whiteSpace: 'nowrap' }}>
          Верный
        </Typography>
      )}
      <TextField
        size="small"
        type="number"
        label="Порядок"
        value={answer.orderIndex || 1}
        onChange={(e) => onChange({ orderIndex: Number(e.target.value) || 1 })}
        sx={{ width: 92, flexShrink: 0, bgcolor: 'background.paper', borderRadius: 1 }}
      />
      <Tooltip title={dirty ? 'Сохранить вариант' : 'Сохранено'}>
        <span>
          <IconButton
            size="small"
            color={dirty ? 'primary' : 'default'}
            onClick={onSave}
            disabled={saving}
            aria-label={`Сохранить ${label.toLowerCase()}`}
            sx={dirty ? { bgcolor: color.bronze[50], border: '1px solid', borderColor: color.bronze[200] } : undefined}
          >
            {saving ? <CircularProgress size={16} /> : <SaveOutlined fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Удалить вариант">
        <IconButton
          size="small"
          onClick={onDelete}
          aria-label={`Удалить ${label.toLowerCase()}`}
          sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
        >
          <DeleteOutline fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}

/**
 * Grouped list of `MenuItem`s (with `ListSubheader` separators) for the
 * "Add question" menu. Returned as an array because MUI `Menu` does not accept
 * a fragment child for keyboard navigation.
 */
export function renderQuestionTypeMenuItems(onPick: (type: QuestionType) => void) {
  const items: React.ReactNode[] = []
  for (const group of QUESTION_TYPE_GROUPS) {
    items.push(
      <ListSubheader key={`group-${group}`} disableSticky sx={{ lineHeight: 2.2, fontWeight: 600 }}>
        {group}
      </ListSubheader>,
    )
    for (const option of QUESTION_TYPE_OPTIONS.filter((o) => o.group === group)) {
      items.push(
        <MenuItem key={option.type} onClick={() => onPick(option.type)} sx={{ py: 0.75 }}>
          <Stack spacing={0}>
            <Typography variant="body2">{option.label}</Typography>
            <Typography variant="caption" color="text.secondary">{option.shortLabel}</Typography>
          </Stack>
        </MenuItem>,
      )
    }
  }
  return items
}
