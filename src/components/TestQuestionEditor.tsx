import { useEffect, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Add,
  CheckCircle,
  CodeOutlined,
  DeleteOutline,
  ExpandLess,
  ExpandMore,
  PermMediaOutlined,
  RadioButtonUnchecked,
  SaveOutlined,
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
  { type: 'multiple_choice', label: 'Несколько правильных вариантов', shortLabel: 'Multiple choice', group: 'Выбор ответа' },
  { type: 'single_choice', label: 'Один правильный вариант', shortLabel: 'Single choice', group: 'Выбор ответа' },
  { type: 'fill_blank', label: 'Заполни пропуск в предложении', shortLabel: 'Fill blank', group: 'Ввод текста' },
  { type: 'manual_input', label: 'Ручной ввод ответа', shortLabel: 'Manual input', group: 'Ввод текста' },
  { type: 'match_pairs', label: 'Сопоставь пары (текст / аудио / картинка)', shortLabel: 'Match pairs', group: 'Сопоставление' },
  { type: 'image_word_match', label: 'Сопоставь картинку и слово', shortLabel: 'Картинка ↔ слово', group: 'Сопоставление' },
  { type: 'audio_multiple_choice', label: 'Аудио + выбор варианта', shortLabel: 'Аудио + выбор', group: 'Аудио' },
  { type: 'audio_choice', label: 'Аудио → буква (махрадж)', shortLabel: 'Аудио → буква', group: 'Аудио' },
  { type: 'listen_and_choose_word', label: 'Послушай и выбери слово', shortLabel: 'Послушай → слово', group: 'Аудио' },
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
  onSave: (q: TestQuestion) => void
  onDelete: () => void
  onAddAnswer: () => void
  onSaveAnswer: (a: TestAnswer) => void
  onDeleteAnswer: (id: string) => void
}

/**
 * Unified, collapsible editor for a single test question. Shared by the lesson
 * test tab and the standalone module/level/placement test editor so behaviour
 * and styling stay consistent across the admin.
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
}: TestQuestionEditorProps) {
  const [q, setQ] = useState<TestQuestion>(question)
  const [configText, setConfigText] = useState(() => JSON.stringify(question.config || {}, null, 2))
  const [expanded, setExpanded] = useState(false)
  const [questionMedia, setQuestionMedia] = useState<any[]>([])

  const type = q.type || 'multiple_choice'
  const isChoice = type === 'multiple_choice' || type === 'single_choice'
  const needsMedia = questionTypeNeedsMedia(type)
  const usesOwnMedia = mediaMode === 'question'
  const activeMedia = usesOwnMedia ? questionMedia : mediaFiles

  const typeLabel = getQuestionTypeLabel(type)
  const answerCount = (q.answers || []).length
  const correctCount = (q.answers || []).filter((a) => a.isCorrect).length

  // Keep local state in sync when the parent reloads questions after a save.
  useEffect(() => {
    setQ(question)
    setConfigText(JSON.stringify(question.config || {}, null, 2))
  }, [question])

  // Reflect config editor changes back into the raw JSON view.
  useEffect(() => {
    setConfigText(JSON.stringify(q.config || {}, null, 2))
  }, [q.config])

  const loadQuestionMedia = async (questionId: string) => {
    try {
      const { data } = await getQuestionMedia(questionId)
      setQuestionMedia(Array.isArray(data) ? data : [])
    } catch {
      setQuestionMedia([])
    }
  }

  useEffect(() => {
    if (usesOwnMedia && q.id && needsMedia) {
      void loadQuestionMedia(q.id)
    } else if (usesOwnMedia) {
      setQuestionMedia([])
    }
  }, [usesOwnMedia, q.id, type, needsMedia])

  const handleMediaUpload = async (file: File, _type: 'image' | 'audio' | 'video', description?: string) => {
    if (!q.id) return
    await uploadQuestionMedia(q.id, file, description)
    await loadQuestionMedia(q.id)
  }

  const handleMediaDelete = async (mediaFileId: string) => {
    if (!q.id) return
    await deleteQuestionMedia(q.id, mediaFileId)
    await loadQuestionMedia(q.id)
  }

  const renderConfigEditor = () => {
    switch (type) {
      case 'fill_blank':
        return <FillBlankConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} />
      case 'match_pairs':
        return <MatchPairsConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} mediaFiles={activeMedia} />
      case 'manual_input':
        return <ManualInputConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} />
      case 'audio_multiple_choice':
        return <AudioMultipleChoiceConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} mediaFiles={activeMedia} />
      case 'image_word_match':
        return <ImageWordMatchConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} mediaFiles={activeMedia} />
      case 'audio_choice':
        return <AudioChoiceConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} mediaFiles={activeMedia} />
      case 'find_letter_in_word':
        return <FindLetterInWordConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} />
      case 'listen_and_choose_word':
        return <ListenAndChooseWordConfigEditor value={q.config || {}} onChange={(config) => setQ({ ...q, config })} mediaFiles={activeMedia} />
      default:
        return <MultipleChoiceConfigEditor />
    }
  }

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        minWidth: 0,
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
            {isChoice && (
              <Chip
                size="small"
                variant="outlined"
                color={correctCount ? 'success' : 'default'}
                label={`${answerCount} отв. · ${correctCount} верн.`}
                sx={{ height: 20 }}
              />
            )}
            {needsMedia && (
              <Chip
                size="small"
                variant="outlined"
                icon={<PermMediaOutlined sx={{ fontSize: '14px !important' }} />}
                label={usesOwnMedia ? `${activeMedia.length} медиа` : 'Медиа теста'}
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
        <CardContent sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
          <Grid container spacing={{ xs: 1.25, sm: 1.5 }}>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Тип</InputLabel>
                <Select
                  label="Тип"
                  value={type}
                  onChange={(e) => {
                    const newType = e.target.value as QuestionType
                    setQ({ ...q, type: newType, config: getConfigTemplate(newType) })
                  }}
                >
                  {QUESTION_TYPE_OPTIONS.map((qt) => (
                    <MenuItem key={qt.type} value={qt.type}>
                      {qt.shortLabel}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={8} md={7}>
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
                label="Подсказка (необязательно)"
                value={q.questionRu?.hint || ''}
                onChange={(e) => setQ({ ...q, questionRu: { ...(q.questionRu || {}), hint: e.target.value } })}
              />
            </Grid>

            {usesOwnMedia && needsMedia && q.id && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    borderRadius: 2,
                    p: { xs: 1, sm: 1.5 },
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                    minWidth: 0,
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1}
                    sx={{ mb: 1 }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PermMediaOutlined fontSize="small" color="primary" />
                      <Box>
                        <Typography variant="subtitle2">Медиа этого вопроса</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {activeMedia.length
                            ? `${activeMedia.length} файлов доступно в полях ниже`
                            : 'Загрузите аудио или изображение для выбора в конфиге'}
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip label={activeMedia.length} size="small" />
                  </Stack>
                  <MediaUploader
                    blockId={undefined}
                    mediaFiles={questionMedia}
                    onUpload={handleMediaUpload}
                    onDelete={handleMediaDelete}
                    onRefresh={() => q.id && loadQuestionMedia(q.id)}
                  />
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Конфигурация ответа
              </Typography>
              <Box sx={{ mt: 1 }}>{renderConfigEditor()}</Box>
            </Grid>

            <Grid item xs={12}>
              <Accordion variant="outlined" disableGutters sx={{ borderRadius: 1, overflow: 'hidden', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CodeOutlined fontSize="small" color="action" />
                    <Typography variant="body2">Raw JSON (для продвинутых)</Typography>
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
                        setQ({ ...q, config: JSON.parse(configText || '{}') })
                      } catch {
                        /* keep editing; invalid JSON is ignored until valid */
                      }
                    }}
                  />
                </AccordionDetails>
              </Accordion>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ mb: 1.5 }} />
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ flexWrap: 'wrap', gap: 1, '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}
              >
                <Button variant="contained" size="small" startIcon={<SaveOutlined />} onClick={() => onSave(q)}>
                  Сохранить вопрос
                </Button>
                {isChoice && (
                  <Button variant="outlined" size="small" startIcon={<Add />} onClick={onAddAnswer}>
                    Добавить ответ
                  </Button>
                )}
              </Stack>
            </Grid>

            {(q.answers || []).length > 0 && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Варианты ответов
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {(q.answers || []).map((a) => (
                    <TestAnswerRow key={a.id} answer={a} onSave={onSaveAnswer} onDelete={onDeleteAnswer} />
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

function TestAnswerRow({
  answer,
  onSave,
  onDelete,
}: {
  answer: TestAnswer
  onSave: (a: TestAnswer) => void
  onDelete: (id: string) => void
}) {
  const [a, setA] = useState<TestAnswer>(answer)

  useEffect(() => {
    setA(answer)
  }, [answer])

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 1.5,
        minWidth: 0,
        borderColor: a.isCorrect ? 'success.main' : 'divider',
        borderLeft: '4px solid',
        borderLeftColor: a.isCorrect ? 'success.main' : 'divider',
        bgcolor: a.isCorrect ? 'rgba(16,185,129,0.04)' : 'background.paper',
        transition: 'border-color 120ms ease, background-color 120ms ease',
      }}
    >
      <CardContent sx={{ p: { xs: 1, sm: 1.5 }, '&:last-child': { pb: { xs: 1, sm: 1.5 } } }}>
        <Grid container spacing={{ xs: 1, sm: 1.25 }} alignItems="center">
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
            <TextField
              fullWidth
              size="small"
              placeholder="Текст ответа"
              value={a.answerRu || ''}
              onChange={(e) => setA({ ...a, answerRu: e.target.value })}
            />
          </Grid>
          <Grid item xs={4} sm={2}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Порядок"
              value={a.orderIndex || 1}
              onChange={(e) => setA({ ...a, orderIndex: Number(e.target.value) || 1 })}
            />
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

/**
 * Grouped list of `MenuItem`s (with `ListSubheader` separators) for the
 * "Add question" menu. Returned as an array because MUI `Menu` does not accept
 * a fragment child for keyboard navigation.
 */
export function renderQuestionTypeMenuItems(onPick: (type: QuestionType) => void) {
  const items: React.ReactNode[] = []
  for (const group of QUESTION_TYPE_GROUPS) {
    items.push(
      <ListSubheader key={`group-${group}`} disableSticky sx={{ lineHeight: 2.2, fontWeight: 700 }}>
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
