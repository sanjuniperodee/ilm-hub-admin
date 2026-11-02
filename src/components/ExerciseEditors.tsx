/**
 * Editors for in-lesson exercise blocks. Each editor receives the block's `exerciseConfig`
 * and emits a new object (never mutates). The language tab lives in the lesson editor:
 * `lang` decides which translation is edited; Arabic, media and correct answers are shared
 * by both languages and are always visible.
 *
 * Config shapes are converted to the stored payload by
 * `pages/lesson-editor/blockMapping.ts` — keep them in sync.
 */
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { Add, AudiotrackOutlined, ImageOutlined, NotesOutlined } from '@mui/icons-material'
import { ArabicText, StatusChip, arabicInputProps } from './ui'
import {
  CorrectToggle,
  EditorRow,
  FieldIssues,
  ListHeader,
  RowActions,
  SharedFieldsNote,
  mixedInputProps,
  mixedInputPropsFor,
  moveItem,
} from './lesson-editor/EditorPrimitives'
import { MediaChoice, mediaDisplayName, type MediaChoiceFile } from './lesson-editor/MediaChoice'
import { issuesFor, validateExerciseConfig } from './lesson-editor/exerciseValidation'

export type EditorLang = 'ru' | 'kz'

export interface EditorProps {
  value: any
  onChange: (value: any) => void
  /** Language being edited (default RU). */
  lang?: EditorLang
  /** Show validation messages (after a save attempt or for saved blocks). */
  showIssues?: boolean
}

const LANG_LABEL: Record<EditorLang, string> = { ru: 'RU', kz: 'KZ' }

const isEmptyConfig = (v: any) => !v || (typeof v === 'object' && Object.keys(v).length === 0)

/**
 * New blocks start with an empty config object. Emit sensible defaults once on mount so
 * what the editor shows is exactly what gets saved.
 */
function useEnsureDefaults(value: any, onChange: (v: any) => void, defaults: () => any) {
  useEffect(() => {
    if (isEmptyConfig(value)) onChange(defaults())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, [])
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** Placeholder for a KZ field: the Russian text, so translators see what to translate. */
function kzPlaceholder(lang: EditorLang, ru: string | undefined, fallback?: string) {
  if (lang === 'kz' && ru?.trim()) return `RU: ${ru.trim()}`
  return fallback
}

/** Placeholder props; the label is kept raised in KZ so the Russian original stays visible. */
function kzProps(lang: EditorLang, ru: string | undefined, fallback?: string) {
  const placeholder = kzPlaceholder(lang, ru, fallback)
  return lang === 'kz' && ru?.trim() ? { placeholder, InputLabelProps: { shrink: true } } : { placeholder }
}

function InstructionField({
  lang,
  ru,
  kz,
  onChange,
  placeholderRu,
  placeholderKz,
  label = 'Инструкция',
}: {
  lang: EditorLang
  ru?: string
  kz?: string
  onChange: (lang: EditorLang, text: string) => void
  placeholderRu?: string
  placeholderKz?: string
  label?: string
}) {
  return (
    <TextField
      fullWidth
      multiline
      minRows={1}
      label={`${label} (${LANG_LABEL[lang]})`}
      value={(lang === 'ru' ? ru : kz) ?? ''}
      onChange={(e) => onChange(lang, e.target.value)}
      {...(lang === 'ru' ? { placeholder: placeholderRu } : kzProps(lang, ru, placeholderKz))}
      helperText="Короткая задача для ученика над упражнением"
    />
  )
}

// ----------------------------------------------------------------------
// Multiple / single choice
// ----------------------------------------------------------------------

const mcDefaults = () => ({
  question: { ru: '', kz: '' },
  options: [
    { text: { ru: '', kz: '' }, isCorrect: false },
    { text: { ru: '', kz: '' }, isCorrect: false },
  ],
})

export const MultipleChoiceEditor = ({
  value,
  onChange,
  lang = 'ru',
  showIssues,
  single = false,
  validationType,
}: EditorProps & {
  /** Exactly one correct option (radio semantics). */
  single?: boolean
  /** Validation rules to apply; defaults to single/multiple choice. */
  validationType?: string
}) => {
  useEnsureDefaults(value, onChange, mcDefaults)
  const content = isEmptyConfig(value) ? mcDefaults() : value
  const options: any[] = Array.isArray(content.options) ? content.options : []
  const issues = showIssues ? validateExerciseConfig(validationType ?? (single ? 'single_choice' : 'multiple_choice'), content) : []

  const setQuestion = (text: string) => onChange({ ...content, question: { ...(content.question || {}), [lang]: text } })
  const setOptions = (next: any[]) => onChange({ ...content, options: next })
  const setOptionText = (index: number, text: string) =>
    setOptions(options.map((o, i) => (i === index ? { ...o, text: { ...(typeof o.text === 'object' ? o.text : { ru: o.text ?? '' }), [lang]: text } } : o)))
  const toggleCorrect = (index: number) =>
    setOptions(options.map((o, i) => (single ? { ...o, isCorrect: i === index } : i === index ? { ...o, isCorrect: !o.isCorrect } : o)))
  const optionTextOf = (o: any, l: EditorLang) => (typeof o.text === 'string' ? (l === 'ru' ? o.text : '') : o.text?.[l] ?? '')

  return (
    <Stack gap={2.5}>
      <Box>
        <TextField
          fullWidth
          multiline
          minRows={2}
          required={lang === 'ru'}
          label={`Вопрос (${LANG_LABEL[lang]})`}
          value={content.question?.[lang] || ''}
          onChange={(e) => setQuestion(e.target.value)}
          {...kzProps(lang, content.question?.ru, 'Что означает это слово?')}
          error={lang === 'ru' && issuesFor(issues, 'question').length > 0}
          inputProps={mixedInputProps}
        />
        {lang === 'ru' && <FieldIssues issues={issuesFor(issues, 'question')} sx={{ mt: 0.75 }} />}
      </Box>

      <Box>
        <ListHeader
          title="Варианты ответа"
          hint={single ? 'Отметьте один верный вариант. Порядок — как в приложении.' : 'Отметьте все верные варианты. Порядок — как в приложении.'}
        />
        <Stack gap={1}>
          {options.map((option, index) => (
            <EditorRow key={index} tone={option.isCorrect ? 'correct' : 'default'}>
              <Stack direction="row" alignItems="center" gap={1}>
                <CorrectToggle
                  checked={!!option.isCorrect}
                  single={single}
                  onChange={() => toggleCorrect(index)}
                  label={`Вариант ${index + 1} — правильный`}
                />
                <TextField
                  fullWidth
                  size="small"
                  label={`Вариант ${index + 1}`}
                  value={optionTextOf(option, lang)}
                  onChange={(e) => setOptionText(index, e.target.value)}
                  {...kzProps(lang, optionTextOf(option, 'ru'))}
                  inputProps={mixedInputPropsFor(optionTextOf(option, lang))}
                />
                <RowActions
                  index={index}
                  count={options.length}
                  minCount={2}
                  itemLabel={`вариант ${index + 1}`}
                  onMove={(from, to) => setOptions(moveItem(options, from, to))}
                  onRemove={() => setOptions(options.filter((_, i) => i !== index))}
                />
              </Stack>
            </EditorRow>
          ))}
        </Stack>
        <FieldIssues issues={[...issuesFor(issues, 'options'), ...issuesFor(issues, 'correct')]} sx={{ mt: 1 }} />
        <Button
          startIcon={<Add />}
          onClick={() => setOptions([...options, { text: { ru: '', kz: '' }, isCorrect: false }])}
          variant="outlined"
          size="small"
          sx={{ mt: 1.5 }}
        >
          Добавить вариант
        </Button>
      </Box>
    </Stack>
  )
}

// ----------------------------------------------------------------------
// Audio multiple choice (multiple_choice + block audio)
// ----------------------------------------------------------------------

export const AudioMultipleChoiceEditor = (props: EditorProps) => (
  <Stack gap={2}>
    <Alert severity="info" icon={<AudiotrackOutlined fontSize="small" />}>
      Ученик сначала слушает запись, потом выбирает ответ. Аудио загружается в разделе «Медиа блока» ниже.
    </Alert>
    <MultipleChoiceEditor {...props} validationType="audio_multiple_choice" />
  </Stack>
)

// ----------------------------------------------------------------------
// Listen & repeat
// ----------------------------------------------------------------------

const listenRepeatDefaults = () => ({
  instructionRu: 'Слушай и повторяй',
  instructionKz: 'Тыңда және қайтала',
  audioUrl: '',
})

export const ListenRepeatEditor = ({ value, onChange, lang = 'ru' }: EditorProps) => {
  useEnsureDefaults(value, onChange, listenRepeatDefaults)
  const content = isEmptyConfig(value) ? listenRepeatDefaults() : value
  return (
    <Stack gap={2}>
      <InstructionField
        lang={lang}
        ru={content.instructionRu}
        kz={content.instructionKz}
        placeholderRu="Слушай и повторяй"
        placeholderKz="Тыңда және қайтала"
        onChange={(l, text) => onChange({ ...content, [l === 'ru' ? 'instructionRu' : 'instructionKz']: text })}
      />
      <Alert severity="info" icon={<AudiotrackOutlined fontSize="small" />}>
        Запись для повторения загружается в разделе «Медиа блока» ниже.
      </Alert>
    </Stack>
  )
}

// ----------------------------------------------------------------------
// Match pairs
// ----------------------------------------------------------------------

// Supports distractors (more right items than left).
// Data shape: { leftItems, rightItems, correctPairs, instructionRu, instructionKz }
// Media references use imageMediaId / audioMediaId (picked from uploaded block media).

type MatchItemType = 'text' | 'audio' | 'image'

type MatchItem = {
  id: string
  text: { ru: string; kz: string }
  imageUrl: string
  imageMediaId?: string
  itemType?: MatchItemType
  audioUrl?: string
  audioMediaId?: string
  /** Admin-only label in the audio picker (not used by the mobile app). */
  audioLabel?: string
}
type CorrectPair = { leftId: string; rightId: string }

/** Compare stored URLs to block media list (query tokens / signing may differ). */
function urlsProbablyMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const strip = (u: string) => u.split('?')[0].replace(/\/$/, '')
  return strip(a) === strip(b)
}

function inferMatchItemType(item: MatchItem): MatchItemType {
  if (item.itemType === 'audio' || item.itemType === 'image' || item.itemType === 'text') {
    return item.itemType
  }
  if (item.audioUrl || item.audioMediaId) return 'audio'
  if (item.imageUrl || item.imageMediaId) return 'image'
  return 'text'
}

function migrateMatchPairsValue(value: any): {
  leftItems: MatchItem[]
  rightItems: MatchItem[]
  correctPairs: CorrectPair[]
  instructionRu: string
  instructionKz: string
} {
  // Old format: { pairs: [{left:{ru,kz,ar}, right:{ru,kz,ar}, leftImageUrl, rightImageUrl}] }
  if (Array.isArray(value?.pairs) && value.pairs.length > 0 && value.pairs[0]?.left) {
    const leftItems: MatchItem[] = value.pairs.map((p: any, i: number) => ({
      id: `l${i + 1}`,
      text: { ru: p.left?.ru ?? '', kz: p.left?.kz ?? '' },
      imageUrl: p.leftImageUrl ?? '',
    }))
    const rightItems: MatchItem[] = value.pairs.map((p: any, i: number) => ({
      id: `r${i + 1}`,
      text: { ru: p.right?.ru ?? '', kz: p.right?.kz ?? '' },
      imageUrl: p.rightImageUrl ?? '',
    }))
    const correctPairs: CorrectPair[] = value.pairs.map((_: any, i: number) => ({ leftId: `l${i + 1}`, rightId: `r${i + 1}` }))
    return { leftItems, rightItems, correctPairs, instructionRu: value.instructionRu ?? '', instructionKz: value.instructionKz ?? '' }
  }
  // New format: { leftItems, rightItems, correctPairs }
  if (Array.isArray(value?.leftItems)) {
    const mapRow = (item: any): MatchItem => {
      const rawText = item.text
      const text = typeof rawText === 'string' ? { ru: rawText, kz: '' } : { ru: rawText?.ru ?? '', kz: rawText?.kz ?? '' }
      const base: MatchItem = {
        id: item.id,
        text,
        imageUrl: item.imageUrl ?? '',
        imageMediaId: item.imageMediaId ?? '',
        itemType: item.itemType,
        audioUrl: item.audioUrl ?? '',
        audioMediaId: item.audioMediaId ?? '',
        audioLabel: item.audioLabel ?? '',
      }
      base.itemType = inferMatchItemType(base)
      return base
    }
    return {
      leftItems: value.leftItems.map(mapRow),
      rightItems: (value.rightItems ?? []).map(mapRow),
      correctPairs: value.correctPairs ?? [],
      instructionRu: value.instructionRu ?? '',
      instructionKz: value.instructionKz ?? '',
    }
  }
  return { leftItems: [], rightItems: [], correctPairs: [], instructionRu: '', instructionKz: '' }
}

const emptyMatchItem = (id: string): MatchItem => ({
  id,
  text: { ru: '', kz: '' },
  imageUrl: '',
  imageMediaId: '',
  itemType: 'text',
  audioUrl: '',
  audioMediaId: '',
  audioLabel: '',
})

interface MatchPairsEditorProps extends EditorProps {
  mediaFiles?: MediaChoiceFile[]
  /** When set, URL→mediaId patch runs only for this block (avoids stale list from another block). */
  blockId?: string
}

function ItemTypeToggle({ value, onChange, label }: { value: MatchItemType; onChange: (t: MatchItemType) => void; label: string }) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, v) => v && onChange(v as MatchItemType)}
      aria-label={label}
      sx={{ flexShrink: 0, '& .MuiToggleButton-root': { px: 1, py: 0.25, gap: 0.5, textTransform: 'none', fontSize: 13 } }}
    >
      <ToggleButton value="text" aria-label="Текст">
        <NotesOutlined sx={{ fontSize: 16 }} /> Текст
      </ToggleButton>
      <ToggleButton value="audio" aria-label="Аудио">
        <AudiotrackOutlined sx={{ fontSize: 16 }} /> Аудио
      </ToggleButton>
      <ToggleButton value="image" aria-label="Картинка">
        <ImageOutlined sx={{ fontSize: 16 }} /> Картинка
      </ToggleButton>
    </ToggleButtonGroup>
  )
}

export const MatchPairsEditor = ({ value, onChange, mediaFiles = [], blockId, lang = 'ru', showIssues }: MatchPairsEditorProps) => {
  const [withImage, setWithImage] = useState<Set<string>>(() => new Set())
  const valueRef = useRef(value)
  valueRef.current = value

  const { leftItems, rightItems, correctPairs, instructionRu, instructionKz } = migrateMatchPairsValue(value)
  const images = mediaFiles.filter((f) => f.type === 'image')
  const audios = mediaFiles.filter((f) => f.type === 'audio')
  const issues = showIssues ? validateExerciseConfig('match_pairs', value) : []

  const emit = (li: MatchItem[], ri: MatchItem[], cp: CorrectPair[], instr?: string, instrKz?: string) => {
    onChange({ leftItems: li, rightItems: ri, correctPairs: cp, instructionRu: instr ?? instructionRu, instructionKz: instrKz ?? instructionKz })
  }

  const resolveAudioMediaId = (item: MatchItem): string | undefined => {
    if (item.audioMediaId) return item.audioMediaId
    if (!item.audioUrl) return undefined
    return audios.find((a) => urlsProbablyMatch(a.url, item.audioUrl))?.id
  }

  const resolveImageMediaId = (item: MatchItem): string | undefined => {
    if (item.imageMediaId) return item.imageMediaId
    if (!item.imageUrl) return undefined
    return images.find((img) => urlsProbablyMatch(img.url, item.imageUrl))?.id
  }

  /** After block media loads, attach media ids by URL so pickers show the selection without re-upload. */
  useEffect(() => {
    if (!blockId || !mediaFiles.length) return
    const auds = mediaFiles.filter((f) => f.type === 'audio')
    const imgs = mediaFiles.filter((f) => f.type === 'image')
    const { leftItems: li, rightItems: ri, correctPairs: cp, instructionRu: instr } = migrateMatchPairsValue(valueRef.current)
    let changed = false
    const patch = (it: MatchItem): MatchItem => {
      const n = { ...it }
      if (n.audioUrl && !n.audioMediaId) {
        const m = auds.find((a) => urlsProbablyMatch(a.url, n.audioUrl))
        if (m) {
          n.audioMediaId = m.id
          changed = true
        }
      }
      if (n.imageUrl && !n.imageMediaId) {
        const m = imgs.find((img) => urlsProbablyMatch(img.url, n.imageUrl))
        if (m) {
          n.imageMediaId = m.id
          changed = true
        }
      }
      return n
    }
    const nli = li.map(patch)
    const nri = ri.map(patch)
    if (changed) emit(nli, nri, cp, instr)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when block media list loads; emit would change every render
  }, [mediaFiles, blockId])

  useEffect(() => {
    const { leftItems: li } = migrateMatchPairsValue(value)
    const legacyPairs = Array.isArray(value?.pairs) ? value.pairs : []
    if (li.length === 0 && legacyPairs.length === 0) {
      emit([emptyMatchItem('l1'), emptyMatchItem('l2')], [emptyMatchItem('r1'), emptyMatchItem('r2')], [
        { leftId: 'l1', rightId: 'r1' },
        { leftId: 'l2', rightId: 'r2' },
      ])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, [])

  const usedIds = new Set([...leftItems, ...rightItems].map((i) => i.id))
  const freeId = (prefix: string) => {
    let n = 1
    while (usedIds.has(`${prefix}${n}`)) n += 1
    return `${prefix}${n}`
  }

  const addPair = () => {
    const lId = freeId('l')
    const rId = freeId('r')
    emit([...leftItems, emptyMatchItem(lId)], [...rightItems, emptyMatchItem(rId)], [...correctPairs, { leftId: lId, rightId: rId }])
  }
  const addDistractor = () => emit(leftItems, [...rightItems, emptyMatchItem(freeId('d'))], correctPairs)

  const patchItem = (side: 'left' | 'right', id: string, patch: (i: MatchItem) => MatchItem) => {
    if (side === 'left') emit(leftItems.map((i) => (i.id === id ? patch(i) : i)), rightItems, correctPairs)
    else emit(leftItems, rightItems.map((i) => (i.id === id ? patch(i) : i)), correctPairs)
  }
  const assignAudio = (side: 'left' | 'right', id: string, mediaId: string) => {
    const media = audios.find((a) => a.id === mediaId)
    patchItem(side, id, (i) =>
      resolveAudioMediaId(i) === mediaId ? { ...i, audioMediaId: '', audioUrl: '' } : { ...i, audioMediaId: mediaId, audioUrl: media?.url ?? '' },
    )
  }
  const assignImage = (side: 'left' | 'right', id: string, mediaId: string) => {
    const media = images.find((img) => img.id === mediaId)
    patchItem(side, id, (i) =>
      resolveImageMediaId(i) === mediaId ? { ...i, imageMediaId: '', imageUrl: '' } : { ...i, imageMediaId: mediaId, imageUrl: media?.url ?? '' },
    )
  }
  const removeItem = (side: 'left' | 'right', id: string) => {
    if (side === 'left') emit(leftItems.filter((i) => i.id !== id), rightItems, correctPairs.filter((p) => p.leftId !== id))
    else emit(leftItems, rightItems.filter((i) => i.id !== id), correctPairs.filter((p) => p.rightId !== id))
  }
  const moveSide = (side: 'left' | 'right', from: number, to: number) => {
    if (side === 'left') emit(moveItem(leftItems, from, to), rightItems, correctPairs)
    else emit(leftItems, moveItem(rightItems, from, to), correctPairs)
  }
  const setPairRight = (leftId: string, rightId: string) => {
    const next = correctPairs.filter((p) => p.leftId !== leftId)
    if (rightId) next.push({ leftId, rightId })
    emit(leftItems, rightItems, next)
  }

  const getPairedRight = (leftId: string) => correctPairs.find((p) => p.leftId === leftId)?.rightId ?? ''
  const usedRightIds = new Set(correctPairs.map((p) => p.rightId))
  const rightLabel = (r: MatchItem, index: number) => {
    const t = r.itemType ?? 'text'
    if (t === 'audio') {
      const media = audios.find((a) => a.id === resolveAudioMediaId(r))
      return `Аудио: ${r.audioLabel?.trim() || (media ? mediaDisplayName(media) : 'не выбрано')}`
    }
    if (t === 'image') {
      const media = images.find((a) => a.id === resolveImageMediaId(r))
      return `Картинка: ${media ? mediaDisplayName(media) : 'не выбрана'}`
    }
    return r.text[lang] || r.text.ru || `Ответ ${index + 1} (пусто)`
  }

  const renderItemBody = (side: 'left' | 'right', item: MatchItem, index: number) => {
    const type = item.itemType ?? 'text'
    const name = side === 'left' ? `элемента слева ${index + 1}` : `ответа ${index + 1}`
    return (
      <Stack gap={1.25} sx={{ minWidth: 0, flex: 1 }}>
        <ItemTypeToggle value={type} label={`Тип ${name}`} onChange={(t) => patchItem(side, item.id, (i) => ({ ...i, itemType: t }))} />
        {type === 'text' && (
          <>
            <TextField
              fullWidth
              size="small"
              label={`Текст (${LANG_LABEL[lang]})`}
              value={item.text[lang] || ''}
              onChange={(e) => patchItem(side, item.id, (i) => ({ ...i, text: { ...i.text, [lang]: e.target.value } }))}
              {...kzProps(lang, item.text.ru)}
              inputProps={mixedInputPropsFor(item.text[lang])}
            />
            {images.length > 0 &&
              (resolveImageMediaId(item) || withImage.has(item.id) ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 0.5 }}>
                    Картинка к тексту (необязательно)
                  </Typography>
                  <MediaChoice
                    kind="image"
                    files={images}
                    selectedId={resolveImageMediaId(item)}
                    onSelect={(id) => assignImage(side, item.id, id)}
                    label={`Картинка для ${name}`}
                  />
                </Box>
              ) : (
                <Box>
                  <Button size="small" startIcon={<ImageOutlined fontSize="small" />} onClick={() => setWithImage((s) => new Set(s).add(item.id))}>
                    Добавить картинку к тексту
                  </Button>
                </Box>
              ))}
          </>
        )}
        {type === 'audio' && (
          <>
            <MediaChoice
              kind="audio"
              files={audios}
              selectedId={resolveAudioMediaId(item)}
              onSelect={(id) => assignAudio(side, item.id, id)}
              label={`Аудио для ${name}`}
            />
            <TextField
              fullWidth
              size="small"
              label="Подпись для себя"
              placeholder="Например: звук «ба»"
              value={item.audioLabel ?? ''}
              onChange={(e) => patchItem(side, item.id, (i) => ({ ...i, audioLabel: e.target.value }))}
              helperText="Видна только в админке, в приложении не показывается"
            />
          </>
        )}
        {type === 'image' && (
          <MediaChoice
            kind="image"
            files={images}
            selectedId={resolveImageMediaId(item)}
            onSelect={(id) => assignImage(side, item.id, id)}
            label={`Картинка для ${name}`}
          />
        )}
      </Stack>
    )
  }

  const distractors = rightItems.filter((r) => !usedRightIds.has(r.id)).length

  return (
    <Stack gap={3}>
      <InstructionField
        lang={lang}
        ru={instructionRu}
        kz={instructionKz}
        placeholderRu="Соедините пары"
        placeholderKz="Жұптарды сәйкестендіріңіз"
        onChange={(l, text) => (l === 'kz' ? emit(leftItems, rightItems, correctPairs, instructionRu, text) : emit(leftItems, rightItems, correctPairs, text, instructionKz))}
      />

      {images.length === 0 && audios.length === 0 && (
        <Alert severity="info">Чтобы использовать аудио или картинки, сначала загрузите их в разделе «Медиа блока» ниже.</Alert>
      )}

      <Box>
        <ListHeader title="Левая колонка" hint="Что ученик сопоставляет. Для каждого элемента выберите правильный ответ справа." />
        <Stack gap={1}>
          {leftItems.map((item, i) => {
            const paired = getPairedRight(item.id)
            return (
              <EditorRow key={item.id} tone={paired ? 'correct' : 'default'}>
                <Stack direction="row" alignItems="flex-start" gap={1}>
                  <Typography variant="subtitle2" sx={{ width: 22, pt: 0.75, color: 'text.secondary', flexShrink: 0 }}>
                    {i + 1}
                  </Typography>
                  <Stack gap={1.25} sx={{ flex: 1, minWidth: 0 }}>
                    {renderItemBody('left', item, i)}
                    <TextField
                      select
                      size="small"
                      fullWidth
                      label="Правильный ответ справа"
                      value={paired}
                      onChange={(e) => setPairRight(item.id, e.target.value)}
                      SelectProps={{ displayEmpty: true }}
                      InputLabelProps={{ shrink: true }}
                      error={showIssues && !paired}
                    >
                      <MenuItem value="">
                        <Typography component="span" color="text.secondary">
                          Не выбран
                        </Typography>
                      </MenuItem>
                      {rightItems.map((r, ri) => {
                        const taken = usedRightIds.has(r.id) && paired !== r.id
                        return (
                          <MenuItem key={r.id} value={r.id} disabled={taken}>
                            {rightLabel(r, ri)}
                            {taken ? ' — уже в паре' : ''}
                          </MenuItem>
                        )
                      })}
                    </TextField>
                  </Stack>
                  <RowActions
                    index={i}
                    count={leftItems.length}
                    minCount={1}
                    itemLabel={`элемент слева ${i + 1}`}
                    onMove={(from, to) => moveSide('left', from, to)}
                    onRemove={() => removeItem('left', item.id)}
                  />
                </Stack>
              </EditorRow>
            )
          })}
        </Stack>
      </Box>

      <Box>
        <ListHeader
          title="Правая колонка"
          hint={distractors > 0 ? `Ответы и лишние варианты: лишних — ${distractors}` : 'Ответы. Добавьте лишние варианты, чтобы усложнить задание.'}
        />
        <Stack gap={1}>
          {rightItems.map((item, i) => {
            const pairIndex = leftItems.findIndex((l) => getPairedRight(l.id) === item.id)
            return (
              <EditorRow key={item.id} tone={pairIndex >= 0 ? 'correct' : 'muted'}>
                <Stack direction="row" alignItems="flex-start" gap={1}>
                  <Stack gap={1} sx={{ flex: 1, minWidth: 0 }}>
                    <Box>
                      {pairIndex >= 0 ? (
                        <StatusChip label={`Ответ к элементу ${pairIndex + 1}`} tone="success" />
                      ) : (
                        <StatusChip label="Лишний вариант" tone="warning" />
                      )}
                    </Box>
                    {renderItemBody('right', item, i)}
                  </Stack>
                  <RowActions
                    index={i}
                    count={rightItems.length}
                    minCount={1}
                    itemLabel={`ответ ${i + 1}`}
                    onMove={(from, to) => moveSide('right', from, to)}
                    onRemove={() => removeItem('right', item.id)}
                  />
                </Stack>
              </EditorRow>
            )
          })}
        </Stack>
      </Box>

      <FieldIssues issues={[...issuesFor(issues, 'pairs'), ...issuesFor(issues, 'correct'), ...issuesFor(issues, 'items')]} />

      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button startIcon={<Add />} onClick={addPair} variant="outlined" size="small">
          Добавить пару
        </Button>
        <Button startIcon={<Add />} onClick={addDistractor} variant="text" size="small">
          Добавить лишний вариант
        </Button>
      </Stack>
    </Stack>
  )
}

// ----------------------------------------------------------------------
// Fill blank — same config shape as the test editor's FillBlankConfigEditor
// { instructionRu/Kz, sentenceTemplateRu/Kz, options: [{id,text}], correctAnswerId, explanationRu/Kz }
// ----------------------------------------------------------------------

function normalizeFillOptions(raw: any): Array<{ id: string; text: string }> {
  if (!Array.isArray(raw)) return []
  return raw.map((o, i) => {
    if (typeof o === 'string') return { id: `opt_${i + 1}`, text: o }
    if (o && typeof o === 'object' && 'id' in o && 'text' in o) return { id: o.id, text: o.text ?? '' }
    return { id: `opt_${i + 1}`, text: (o?.text ?? o?.textRu ?? '') as string }
  })
}

export const FillBlankEditor = ({ value, onChange, lang = 'ru', showIssues }: EditorProps) => {
  const content = value || {}
  const options = normalizeFillOptions(content.options)
  const correctAnswerId = (content.correctAnswerId as string) || ''
  const issues = showIssues ? validateExerciseConfig('fill_blank', content) : []

  useEffect(() => {
    const raw = content.options
    if (options.length === 0) {
      onChange({ ...content, options: [{ id: 'opt_1', text: '' }, { id: 'opt_2', text: '' }], correctAnswerId: 'opt_1' })
    } else if ((Array.isArray(raw) && typeof raw[0] === 'string') || !correctAnswerId) {
      onChange({ ...content, options, correctAnswerId: correctAnswerId || options[0].id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- normalise once on mount
  }, [])

  const set = (patch: Record<string, unknown>) => onChange({ ...content, ...patch })
  const setOptions = (next: Array<{ id: string; text: string }>, nextCorrect = correctAnswerId) =>
    set({ options: next, correctAnswerId: next.some((o) => o.id === nextCorrect) ? nextCorrect : next[0]?.id || '' })
  const nextOptionId = () => {
    const max = options.reduce((m, o) => Math.max(m, Number(/^opt_(\d+)$/.exec(o.id)?.[1] ?? 0)), 0)
    return `opt_${Math.max(max, options.length) + 1}`
  }
  const k = lang === 'ru' ? 'Ru' : 'Kz'

  return (
    <Stack gap={2.5}>
      <InstructionField
        lang={lang}
        ru={content.instructionRu}
        kz={content.instructionKz}
        placeholderRu="Заполни пропуск"
        placeholderKz="Бос орынды толтырыңыз"
        onChange={(l, text) => set({ [l === 'ru' ? 'instructionRu' : 'instructionKz']: text })}
      />
      <Box>
        <TextField
          fullWidth
          multiline
          minRows={2}
          required={lang === 'ru'}
          label={`Предложение с пропуском (${LANG_LABEL[lang]})`}
          value={(content[`sentenceTemplate${k}`] as string) || ''}
          onChange={(e) => set({ [`sentenceTemplate${k}`]: e.target.value })}
          {...kzProps(lang, content.sentenceTemplateRu, 'Я читаю ___ каждый день')}
          helperText="Место пропуска — три подчёркивания или больше: ___"
          error={lang === 'ru' && issuesFor(issues, 'sentence').length > 0}
          inputProps={mixedInputProps}
        />
        {lang === 'ru' && <FieldIssues issues={issuesFor(issues, 'sentence')} sx={{ mt: 0.75 }} />}
      </Box>
      <Box>
        <ListHeader title="Варианты для пропуска" hint="Отметьте вариант, который подходит в пропуск." />
        <SharedFieldsNote />
        <Stack gap={1} sx={{ mt: 1 }}>
          {options.map((opt, i) => (
            <EditorRow key={opt.id} tone={correctAnswerId === opt.id ? 'correct' : 'default'}>
              <Stack direction="row" alignItems="center" gap={1}>
                <CorrectToggle single checked={correctAnswerId === opt.id} onChange={() => set({ correctAnswerId: opt.id })} label={`Вариант ${i + 1} — правильный`} />
                <TextField
                  fullWidth
                  size="small"
                  label={`Вариант ${i + 1}`}
                  value={opt.text}
                  onChange={(e) => setOptions(options.map((o, j) => (j === i ? { ...o, text: e.target.value } : o)))}
                  inputProps={mixedInputPropsFor(opt.text)}
                />
                <RowActions
                  index={i}
                  count={options.length}
                  minCount={1}
                  itemLabel={`вариант ${i + 1}`}
                  onMove={(from, to) => setOptions(moveItem(options, from, to))}
                  onRemove={() => setOptions(options.filter((_, j) => j !== i))}
                />
              </Stack>
            </EditorRow>
          ))}
        </Stack>
        <FieldIssues issues={[...issuesFor(issues, 'options'), ...issuesFor(issues, 'correct')]} sx={{ mt: 1 }} />
        <Button size="small" startIcon={<Add />} onClick={() => setOptions([...options, { id: nextOptionId(), text: '' }])} variant="outlined" sx={{ mt: 1.5 }}>
          Добавить вариант
        </Button>
      </Box>
      <TextField
        fullWidth
        multiline
        minRows={1}
        label={`Пояснение после ответа (${LANG_LABEL[lang]}), необязательно`}
        value={(content[`explanation${k}`] as string) || ''}
        onChange={(e) => set({ [`explanation${k}`]: e.target.value })}
        {...kzProps(lang, content.explanationRu)}
      />
    </Stack>
  )
}

// ----------------------------------------------------------------------
// Image ↔ word
// ----------------------------------------------------------------------

interface ImageWordMatchEditorProps extends EditorProps {
  mediaFiles?: MediaChoiceFile[]
}

export const ImageWordMatchEditor = ({ value, onChange, mediaFiles = [], lang = 'ru', showIssues }: ImageWordMatchEditorProps) => {
  const content = value || { instructionRu: '', instructionKz: '', pairs: [] }
  const pairs: Array<{ id: string; word: string; imageMediaId?: string }> = content.pairs ?? []
  const images = mediaFiles.filter((f) => f.type === 'image')
  const issues = showIssues ? validateExerciseConfig('image_word_match', content) : []

  const setPairs = (next: typeof pairs) => onChange({ ...content, pairs: next })
  const addPair = () => setPairs([...pairs, { id: newId(), word: '', imageMediaId: '' }])

  useEffect(() => {
    if (!content.pairs || content.pairs.length === 0) {
      onChange({ ...content, pairs: [{ id: newId(), word: '', imageMediaId: '' }, { id: newId(), word: '', imageMediaId: '' }] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, [])

  return (
    <Stack gap={2.5}>
      <InstructionField
        lang={lang}
        ru={content.instructionRu}
        kz={content.instructionKz}
        placeholderRu="Соедините картинки и слова"
        placeholderKz="Суреттер мен сөздерді сәйкестендіріңіз"
        onChange={(l, text) => onChange({ ...content, [l === 'ru' ? 'instructionRu' : 'instructionKz']: text })}
      />
      {images.length === 0 && <Alert severity="info">Загрузите изображения в разделе «Медиа блока» ниже — они появятся здесь для выбора.</Alert>}
      <Box>
        <ListHeader title="Пары" hint="Арабское слово и картинка, которая ему соответствует." />
        <SharedFieldsNote />
        <Stack gap={1} sx={{ mt: 1 }}>
          {pairs.map((pair, idx) => (
            <EditorRow key={pair.id} tone={pair.imageMediaId && pair.word ? 'correct' : 'default'}>
              <Stack direction="row" alignItems="flex-start" gap={1}>
                <Typography variant="subtitle2" sx={{ width: 22, pt: 1, color: 'text.secondary', flexShrink: 0 }}>
                  {idx + 1}
                </Typography>
                <Stack gap={1.25} sx={{ flex: 1, minWidth: 0 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Слово на арабском"
                    value={pair.word ?? ''}
                    onChange={(e) => setPairs(pairs.map((p) => (p.id === pair.id ? { ...p, word: e.target.value } : p)))}
                    inputProps={arabicInputProps}
                  />
                  <MediaChoice
                    kind="image"
                    files={images}
                    selectedId={pair.imageMediaId}
                    onSelect={(mediaId) =>
                      setPairs(pairs.map((p) => (p.id === pair.id ? { ...p, imageMediaId: p.imageMediaId === mediaId ? '' : mediaId } : p)))
                    }
                    label={`Картинка для пары ${idx + 1}`}
                  />
                </Stack>
                <RowActions
                  index={idx}
                  count={pairs.length}
                  minCount={1}
                  itemLabel={`пару ${idx + 1}`}
                  onMove={(from, to) => setPairs(moveItem(pairs, from, to))}
                  onRemove={() => setPairs(pairs.filter((p) => p.id !== pair.id))}
                />
              </Stack>
            </EditorRow>
          ))}
        </Stack>
        <FieldIssues issues={[...issuesFor(issues, 'pairs'), ...issuesFor(issues, 'media')]} sx={{ mt: 1 }} />
        <Button startIcon={<Add />} onClick={addPair} variant="outlined" size="small" sx={{ mt: 1.5 }}>
          Добавить пару
        </Button>
      </Box>
    </Stack>
  )
}

// ----------------------------------------------------------------------
// Single-answer option list for Mahraj exercises (letters / words, Arabic)
// ----------------------------------------------------------------------

function ArabicOptionList({
  options,
  onChange,
  itemNoun,
  wide,
  issues,
}: {
  options: any[]
  onChange: (next: any[]) => void
  itemNoun: string
  /** Full-width inputs (words) instead of short ones (letters). */
  wide?: boolean
  issues: ReturnType<typeof validateExerciseConfig>
}) {
  return (
    <Box>
      <Stack gap={1}>
        {options.map((opt: any, idx: number) => (
          <EditorRow key={opt.id ?? idx} tone={opt.isCorrect ? 'correct' : 'default'}>
            <Stack direction="row" alignItems="center" gap={1}>
              <CorrectToggle
                single
                checked={!!opt.isCorrect}
                onChange={() => onChange(options.map((o: any, i: number) => ({ ...o, isCorrect: i === idx })))}
                label={`${itemNoun} ${idx + 1} — правильный`}
              />
              <TextField
                size="small"
                label={`${itemNoun} ${idx + 1}`}
                value={opt.text || ''}
                onChange={(e) => onChange(options.map((o: any, i: number) => (i === idx ? { ...o, text: e.target.value } : o)))}
                inputProps={{ ...arabicInputProps, style: { ...arabicInputProps.style, textAlign: wide ? 'right' : 'center' } }}
                sx={{ width: wide ? '100%' : 140 }}
              />
              <Box sx={{ flex: 1 }} />
              <RowActions
                index={idx}
                count={options.length}
                minCount={2}
                itemLabel={`${itemNoun.toLowerCase()} ${idx + 1}`}
                onMove={(from, to) => onChange(moveItem(options, from, to))}
                onRemove={() => onChange(options.filter((_: any, i: number) => i !== idx))}
              />
            </Stack>
          </EditorRow>
        ))}
      </Stack>
      <FieldIssues issues={[...issuesFor(issues, 'options'), ...issuesFor(issues, 'correct')]} sx={{ mt: 1 }} />
      <Button
        startIcon={<Add />}
        onClick={() => onChange([...options, { id: newId(), text: '', isCorrect: false }])}
        variant="outlined"
        size="small"
        sx={{ mt: 1.5 }}
      >
        Добавить вариант
      </Button>
    </Box>
  )
}

// ----------------------------------------------------------------------
// Audio → letter (Mahraj)
// ----------------------------------------------------------------------

const audioChoiceDefaults = () => ({
  instructionRu: 'Послушайте звук и выберите правильную букву',
  instructionKz: 'Дыбысты тыңдап, дұрыс әріпті таңдаңыз',
  audioUrl: '',
  options: [
    { id: newId(), text: '', isCorrect: false },
    { id: newId(), text: '', isCorrect: false },
  ],
})

export const AudioChoiceEditor = ({ value, onChange, lang = 'ru', showIssues }: EditorProps) => {
  useEnsureDefaults(value, onChange, audioChoiceDefaults)
  const content = isEmptyConfig(value) ? audioChoiceDefaults() : value
  const issues = showIssues ? validateExerciseConfig('audio_choice', content) : []
  return (
    <Stack gap={2.5}>
      <Alert severity="info" icon={<AudiotrackOutlined fontSize="small" />}>
        Звук загружается в разделе «Медиа блока» ниже.
      </Alert>
      <InstructionField
        lang={lang}
        ru={content.instructionRu}
        kz={content.instructionKz}
        onChange={(l, text) => onChange({ ...content, [l === 'ru' ? 'instructionRu' : 'instructionKz']: text })}
      />
      <Box>
        <ListHeader title="Буквы или слоги" hint="Отметьте ту, что звучит в записи." />
        <SharedFieldsNote />
        <Box sx={{ mt: 1 }}>
          <ArabicOptionList options={content.options || []} onChange={(next) => onChange({ ...content, options: next })} itemNoun="Буква" issues={issues} />
        </Box>
      </Box>
    </Stack>
  )
}

// ----------------------------------------------------------------------
// Find letter in word (Mahraj)
// ----------------------------------------------------------------------

const HARAKAT_RE = /[\u064B-\u065F\u0670\u0640]/g

/** Split Arabic word into grapheme clusters (letter + attached diacritics) */
function splitArabicWord(word: string): string[] {
  const result: string[] = []
  let i = 0
  while (i < word.length) {
    let cluster = word[i]
    i++
    // Attach Arabic diacritics (harakat): U+064B–U+065F, tatweel U+0640, U+0670
    while (i < word.length) {
      const code = word.charCodeAt(i)
      if ((code >= 0x064b && code <= 0x065f) || code === 0x0670 || code === 0x0640) {
        cluster += word[i]
        i++
      } else {
        break
      }
    }
    result.push(cluster)
  }
  return result
}

const findLetterDefaults = () => ({
  instructionRu: 'Найдите букву в слове',
  instructionKz: 'Сөздегі әріпті табыңыз',
  word: '',
  targetLetter: '',
})

export const FindLetterInWordEditor = ({ value, onChange, lang = 'ru', showIssues }: EditorProps) => {
  useEnsureDefaults(value, onChange, findLetterDefaults)
  const content = isEmptyConfig(value) ? findLetterDefaults() : value
  const issues = showIssues ? validateExerciseConfig('find_letter_in_word', content) : []
  const letters = content.word ? splitArabicWord(content.word).filter((l: string) => l.trim()) : []
  const target = (content.targetLetter || '').replace(HARAKAT_RE, '')
  const found = letters.some((l: string) => l.replace(HARAKAT_RE, '') === target)

  return (
    <Stack gap={2.5}>
      <InstructionField
        lang={lang}
        ru={content.instructionRu}
        kz={content.instructionKz}
        placeholderRu="Найдите букву ح в слове"
        onChange={(l, text) => onChange({ ...content, [l === 'ru' ? 'instructionRu' : 'instructionKz']: text })}
      />
      <Box>
        <SharedFieldsNote />
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ mt: 1 }}>
          <TextField
            label="Слово на арабском"
            required
            value={content.word || ''}
            onChange={(e) => onChange({ ...content, word: e.target.value })}
            inputProps={{ ...arabicInputProps, style: { ...arabicInputProps.style, fontSize: 28 } }}
            sx={{ flex: 2 }}
            placeholder="حَرَكَة"
            error={issuesFor(issues, 'word').length > 0}
          />
          <TextField
            label="Буква, которую ищем"
            required
            value={content.targetLetter || ''}
            onChange={(e) => onChange({ ...content, targetLetter: e.target.value })}
            inputProps={{ ...arabicInputProps, style: { ...arabicInputProps.style, fontSize: 28, textAlign: 'center' } }}
            sx={{ flex: 1, maxWidth: { sm: 180 } }}
            placeholder="ح"
            error={issuesFor(issues, 'target').length > 0}
          />
        </Stack>
        <FieldIssues issues={[...issuesFor(issues, 'word'), ...issuesFor(issues, 'target')]} sx={{ mt: 1 }} />
      </Box>

      {letters.length > 0 && (
        <Box>
          <ListHeader title="Как ученик увидит слово" hint="Слово разбито на буквы; искомая выделена." />
          <Box dir="rtl" sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {letters.map((letter: string, idx: number) => {
              const isTarget = !!target && letter.replace(HARAKAT_RE, '') === target
              return (
                <Box
                  key={idx}
                  sx={{
                    minWidth: 48,
                    px: 1,
                    py: 0.25,
                    textAlign: 'center',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: isTarget ? 'primary.main' : 'divider',
                    bgcolor: isTarget ? 'brand.sand' : 'background.paper',
                  }}
                >
                  <ArabicText size="lg" weight={isTarget ? 600 : 400} align="center">
                    {letter}
                  </ArabicText>
                </Box>
              )
            })}
          </Box>
          {content.targetLetter && !found && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              Буквы «{content.targetLetter}» нет в слове «{content.word}». Проверьте написание.
            </Alert>
          )}
        </Box>
      )}
    </Stack>
  )
}

// ----------------------------------------------------------------------
// Listen → choose word (Mahraj)
// ----------------------------------------------------------------------

const listenChooseDefaults = () => ({
  instructionRu: 'Послушайте и выберите слово',
  instructionKz: 'Тыңдап, сөзді таңдаңыз',
  audioUrl: '',
  options: [
    { id: newId(), text: '', isCorrect: false },
    { id: newId(), text: '', isCorrect: false },
  ],
})

export const ListenAndChooseWordEditor = ({ value, onChange, lang = 'ru', showIssues }: EditorProps) => {
  useEnsureDefaults(value, onChange, listenChooseDefaults)
  const content = isEmptyConfig(value) ? listenChooseDefaults() : value
  const issues = showIssues ? validateExerciseConfig('listen_and_choose_word', content) : []
  return (
    <Stack gap={2.5}>
      <Alert severity="info" icon={<AudiotrackOutlined fontSize="small" />}>
        Запись загружается в разделе «Медиа блока» ниже.
      </Alert>
      <InstructionField
        lang={lang}
        ru={content.instructionRu}
        kz={content.instructionKz}
        onChange={(l, text) => onChange({ ...content, [l === 'ru' ? 'instructionRu' : 'instructionKz']: text })}
      />
      <Box>
        <ListHeader title="Слова с огласовками" hint="Отметьте слово, которое звучит в записи." />
        <SharedFieldsNote />
        <Box sx={{ mt: 1 }}>
          <ArabicOptionList options={content.options || []} onChange={(next) => onChange({ ...content, options: next })} itemNoun="Слово" wide issues={issues} />
        </Box>
      </Box>
    </Stack>
  )
}

// ----------------------------------------------------------------------
// Manual input
// ----------------------------------------------------------------------

const manualDefaults = () => ({ question: { ru: '', kz: '' }, correctAnswers: { ru: [], kz: [] } })

export const ManualInputEditor = ({ value, onChange, lang = 'ru', showIssues }: EditorProps) => {
  useEnsureDefaults(value, onChange, manualDefaults)
  const content = isEmptyConfig(value) ? manualDefaults() : value
  const issues = showIssues ? validateExerciseConfig('manual_input', content) : []
  // Rows are kept locally so an empty row can exist while typing; the config gets the
  // trimmed, non-empty list (same as the old comma/newline parser).
  const [rows, setRows] = useState<Record<EditorLang, string[]>>(() => ({
    ru: (content.correctAnswers?.ru as string[])?.length ? [...content.correctAnswers.ru] : [''],
    kz: (content.correctAnswers?.kz as string[])?.length ? [...content.correctAnswers.kz] : [''],
  }))
  const current = rows[lang]

  const commit = (next: string[]) => {
    setRows((r) => ({ ...r, [lang]: next }))
    onChange({
      ...content,
      correctAnswers: { ...(content.correctAnswers || {}), [lang]: next.map((s) => s.trim()).filter(Boolean) },
    })
  }

  return (
    <Stack gap={2.5}>
      <Box>
        <TextField
          fullWidth
          multiline
          minRows={2}
          required={lang === 'ru'}
          label={`Вопрос (${LANG_LABEL[lang]})`}
          value={content.question?.[lang] || ''}
          onChange={(e) => onChange({ ...content, question: { ...(content.question || {}), [lang]: e.target.value } })}
          {...kzProps(lang, content.question?.ru, 'Напишите перевод слова')}
          error={lang === 'ru' && issuesFor(issues, 'question').length > 0}
          inputProps={mixedInputProps}
        />
        {lang === 'ru' && <FieldIssues issues={issuesFor(issues, 'question')} sx={{ mt: 0.75 }} />}
      </Box>
      <Box>
        <ListHeader title={`Правильные ответы (${LANG_LABEL[lang]})`} hint="Ответ засчитывается, если совпадает с любым из вариантов." />
        <Stack gap={1}>
          {current.map((answer, i) => (
            <Stack key={i} direction="row" gap={1} alignItems="center">
              <TextField
                fullWidth
                size="small"
                label={`Ответ ${i + 1}`}
                value={answer}
                onChange={(e) => commit(current.map((a, j) => (j === i ? e.target.value : a)))}
                inputProps={mixedInputPropsFor(answer)}
              />
              <RowActions index={i} count={current.length} minCount={1} itemLabel={`ответ ${i + 1}`} onRemove={() => commit(current.filter((_, j) => j !== i))} />
            </Stack>
          ))}
        </Stack>
        {lang === 'ru' && <FieldIssues issues={issuesFor(issues, 'answers')} sx={{ mt: 1 }} />}
        <Button startIcon={<Add />} size="small" variant="outlined" onClick={() => setRows((r) => ({ ...r, [lang]: [...current, ''] }))} sx={{ mt: 1.5 }}>
          Добавить вариант ответа
        </Button>
      </Box>
    </Stack>
  )
}
