import { useEffect, useRef, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Radio,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Add, DeleteOutline as Delete, LinkOff, CheckCircle, CancelOutlined } from '@mui/icons-material'
import { AudioMediaPicker, type MediaFile } from './AudioMediaPicker'
import { ImageMediaPicker } from './ImageMediaPicker'
import { ArabicText, arabicInputProps } from './ui'
import { color } from '../theme'

// ----------------------------------------------------------------------
// Shared presentation helpers (layout only — values/onChange shapes unchanged)
// ----------------------------------------------------------------------

/** Two fields side by side: RU and KZ versions of the same config key. */
function LangPair({
  label,
  value,
  onChange,
  keys,
  placeholders,
  helperText,
}: {
  label: string
  value: Record<string, any>
  onChange: (value: Record<string, any>) => void
  keys: [string, string]
  placeholders?: [string, string]
  helperText?: string
}) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      {keys.map((k, i) => (
        <TextField
          key={k}
          fullWidth
          size="small"
          label={`${label} (${i === 0 ? 'RU' : 'KZ'})`}
          value={(value?.[k] as string) || ''}
          onChange={(e) => onChange({ ...value, [k]: e.target.value })}
          placeholder={placeholders?.[i]}
          helperText={i === 0 ? helperText : undefined}
        />
      ))}
    </Box>
  )
}

function SectionLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle2">{children}</Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Box>
  )
}

function MediaHint({ children }: { children: ReactNode }) {
  return (
    <Alert severity="info" variant="outlined" sx={{ py: 0.25, bgcolor: 'background.paper', '& .MuiAlert-message': { fontSize: '0.8125rem' } }}>
      {children}
    </Alert>
  )
}

/** Option row with an obvious «correct» marker (radio + green border + label). */
function CorrectOptionRow({
  checked,
  onCheck,
  label,
  children,
  onRemove,
  removeDisabled,
}: {
  checked: boolean
  onCheck: () => void
  label: string
  children: ReactNode
  onRemove: () => void
  removeDisabled?: boolean
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        p: 0.5,
        pr: 0.75,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: checked ? 'success.main' : 'divider',
        bgcolor: checked ? color.success.soft : 'background.paper',
      }}
    >
      <Tooltip title={checked ? 'Правильный ответ' : 'Отметить правильным'}>
        <Radio checked={checked} onChange={onCheck} size="small" color="success" inputProps={{ 'aria-label': `${label}: правильный` }} />
      </Tooltip>
      <Box sx={{ flex: 1, minWidth: 0, '& .MuiInputBase-root': { bgcolor: 'background.paper' } }}>{children}</Box>
      {checked && (
        <Typography variant="caption" sx={{ color: 'success.dark', fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
          Верный
        </Typography>
      )}
      <Tooltip title="Удалить вариант">
        <span>
          <IconButton size="small" onClick={onRemove} disabled={removeDisabled} aria-label={`Удалить: ${label}`} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
            <Delete fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  )
}

const arabicFieldProps = (extra?: Record<string, unknown>) => ({ ...arabicInputProps, ...extra })

export type ConfigEditorType = 'multiple_choice' | 'single_choice' | 'fill_blank' | 'match_pairs' | 'manual_input' | 'audio_multiple_choice' | 'image_word_match' | 'audio_choice' | 'find_letter_in_word' | 'listen_and_choose_word'

interface EditorProps {
  value: Record<string, any>
  onChange: (value: Record<string, any>) => void
  mediaFiles?: MediaFile[]
}

// ----------------------------------------------------------------------
// FillBlankConfigEditor
// ----------------------------------------------------------------------

function normalizeOptions(raw: any): Array<{ id: string; text: string }> {
  if (!Array.isArray(raw)) return []
  return raw.map((o, i) => {
    if (typeof o === 'string') return { id: `opt_${i + 1}`, text: o }
    if (o && typeof o === 'object' && 'id' in o && 'text' in o) return { id: o.id, text: o.text ?? '' }
    return { id: `opt_${i + 1}`, text: (o?.text ?? o?.textRu ?? '') as string }
  })
}

export function FillBlankConfigEditor({ value, onChange }: EditorProps) {
  const rawOptions = value?.options
  const options = normalizeOptions(rawOptions)
  const correctAnswerId = (value?.correctAnswerId as string) || (options[0]?.id ?? '')
  const normalized = useRef(false)

  useEffect(() => {
    if (normalized.current) return
    if (options.length === 0) {
      normalized.current = true
      onChange({ ...value, options: [{ id: 'opt_1', text: '' }], correctAnswerId: 'opt_1' })
    } else if (Array.isArray(rawOptions) && rawOptions.length > 0 && typeof rawOptions[0] === 'string') {
      normalized.current = true
      const mappedId = options[0]?.id ?? 'opt_1'
      onChange({ ...value, options, correctAnswerId: correctAnswerId || mappedId })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs only when the listed inputs change
  }, [options.length, rawOptions])

  const addOption = () => {
    const nextId = `opt_${options.length + 1}`
    const next = [...options, { id: nextId, text: '' }]
    onChange({
      ...value,
      options: next,
      correctAnswerId: correctAnswerId || nextId,
    })
  }

  const removeOption = (index: number) => {
    const next = options.filter((_, i) => i !== index)
    const removedId = options[index]?.id
    onChange({
      ...value,
      options: next,
      correctAnswerId: removedId === correctAnswerId ? (next[0]?.id || '') : correctAnswerId,
    })
  }

  const updateOption = (index: number, text: string) => {
    const next = options.map((o, i) => (i === index ? { ...o, text } : o))
    onChange({ ...value, options: next })
  }

  const setCorrect = (id: string) => {
    onChange({ ...value, correctAnswerId: id })
  }

  return (
    <Stack spacing={2}>
      <LangPair label="Инструкция" value={value} onChange={onChange} keys={['instructionRu', 'instructionKz']} placeholders={['Заполни пропуск', 'Бос орынды толтырыңыз']} />
      <LangPair
        label="Предложение"
        value={value}
        onChange={onChange}
        keys={['sentenceTemplateRu', 'sentenceTemplateKz']}
        placeholders={['Это ________ пример', 'Бұл ________ мысал']}
        helperText="Место пропуска обозначьте подчёркиваниями: ________"
      />
      <SectionLabel hint="Отметьте вариант, который подставляется в пропуск.">Варианты ответа</SectionLabel>
      <Stack spacing={0.75} role="radiogroup" aria-label="Варианты ответа">
        {options.map((opt, i) => (
          <CorrectOptionRow
            key={opt.id}
            checked={correctAnswerId === opt.id}
            onCheck={() => setCorrect(opt.id)}
            label={`Вариант ${i + 1}`}
            onRemove={() => removeOption(i)}
            removeDisabled={options.length <= 1}
          >
            <TextField
              fullWidth
              size="small"
              value={opt.text}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Вариант ${i + 1}`}
              inputProps={{ ...(/[\u0600-\u06FF]/.test(opt.text) ? arabicInputProps : { dir: 'auto' }), 'aria-label': `Вариант ${i + 1}` }}
              error={!opt.text.trim()}
            />
          </CorrectOptionRow>
        ))}
      </Stack>
      <Box>
        <Button size="small" startIcon={<Add />} onClick={addOption} variant="outlined">
          Добавить вариант
        </Button>
      </Box>
      <LangPair label="Пояснение после ответа" value={value} onChange={onChange} keys={['explanationRu', 'explanationKz']} helperText="Необязательно" />
    </Stack>
  )
}

// ----------------------------------------------------------------------
// MatchPairsConfigEditor (supports distractors: more right items than left)
// ----------------------------------------------------------------------

type MatchItemType = 'text' | 'audio' | 'image'
type MatchItem = { id: string; text: string; imageUrl?: string; imageMediaId?: string; itemType?: MatchItemType; audioUrl?: string; audioMediaId?: string }

function normalizeMatchPairs(value: Record<string, any>): {
  leftItems: MatchItem[]
  rightItems: MatchItem[]
  correctPairs: Array<{ leftId: string; rightId: string }>
} {
  const left = (value?.leftItems ?? value?.leftColumn) as MatchItem[] | undefined
  const right = (value?.rightItems ?? value?.rightColumn) as MatchItem[] | undefined
  const pairs = (value?.correctPairs as Array<{ leftId: string; rightId: string }>) || []
  const mapItem = (o: any, i: number, prefix: string): MatchItem =>
    typeof o === 'string'
      ? { id: `${prefix}${i + 1}`, text: o, itemType: 'text' }
      : { id: o?.id ?? `${prefix}${i + 1}`, text: o?.text ?? o?.textRu ?? '', imageUrl: o?.imageUrl, imageMediaId: o?.imageMediaId, itemType: o?.itemType ?? 'text', audioUrl: o?.audioUrl, audioMediaId: o?.audioMediaId }
  const leftItems = Array.isArray(left) ? left.map((o, i) => mapItem(o, i, 'l')) : []
  const rightItems = Array.isArray(right) ? right.map((o, i) => mapItem(o, i, 'r')) : []
  return { leftItems, rightItems, correctPairs: pairs }
}

export function MatchPairsConfigEditor({ value, onChange, mediaFiles = [] }: EditorProps & { mediaFiles?: MediaFile[] }) {
  const { leftItems: li, rightItems: ri, correctPairs } = normalizeMatchPairs(value || {})
  const leftItems = li.length > 0 ? li : [{ id: 'l1', text: '', itemType: 'text' as const }]
  const rightItems = ri.length > 0 ? ri : [{ id: 'r1', text: '', itemType: 'text' as const }]
  const normalized = useRef(false)

  useEffect(() => {
    if (normalized.current) return
    if (li.length === 0 && ri.length === 0) {
      normalized.current = true
      onChange({
        ...value,
        leftItems: [{ id: 'l1', text: '', itemType: 'text' }],
        rightItems: [{ id: 'r1', text: '', itemType: 'text' }],
        correctPairs: [{ leftId: 'l1', rightId: 'r1' }],
      })
    } else if (value?.leftColumn || value?.rightColumn) {
      normalized.current = true
      onChange({ ...value, leftItems, rightItems, correctPairs })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs only when the listed inputs change
  }, [])

  const addPair = () => {
    const n = Math.max(leftItems.length, rightItems.length) + 1
    const leftId = `l${n}`
    const rightId = `r${n}`
    onChange({
      ...value,
      leftItems: [...leftItems, { id: leftId, text: '', itemType: 'text' }],
      rightItems: [...rightItems, { id: rightId, text: '', itemType: 'text' }],
      correctPairs: [...correctPairs, { leftId, rightId }],
    })
  }

  const addDistractor = () => {
    const n = rightItems.length + 1
    const rightId = `d${n}`
    onChange({ ...value, rightItems: [...rightItems, { id: rightId, text: '', itemType: 'text' }] })
  }

  const removeLeftItem = (index: number) => {
    const leftId = leftItems[index]?.id
    const nextLeft = leftItems.filter((_, i) => i !== index)
    const nextPairs = correctPairs.filter((p) => p.leftId !== leftId)
    onChange({ ...value, leftItems: nextLeft, correctPairs: nextPairs })
  }

  const removeRightItem = (rightId: string) => {
    const nextRight = rightItems.filter((r) => r.id !== rightId)
    const nextPairs = correctPairs.filter((p) => p.rightId !== rightId)
    onChange({ ...value, rightItems: nextRight, correctPairs: nextPairs })
  }

  const updateLeftText = (index: number, text: string) => {
    const next = leftItems.map((o, i) => (i === index ? { ...o, text } : o))
    onChange({ ...value, leftItems: next })
  }

  const updateRightText = (rightId: string, text: string) => {
    const next = rightItems.map((o) => (o.id === rightId ? { ...o, text } : o))
    onChange({ ...value, rightItems: next })
  }

  const updateLeftItemType = (index: number, itemType: string) => {
    const next = leftItems.map((o, i) => (i === index ? { ...o, itemType } : o))
    onChange({ ...value, leftItems: next })
  }

  const updateRightItemType = (rightId: string, itemType: string) => {
    const next = rightItems.map((o) => (o.id === rightId ? { ...o, itemType } : o))
    onChange({ ...value, rightItems: next })
  }

  const updateLeftAudio = (index: number, audioUrl: string, audioMediaId?: string) => {
    const next = leftItems.map((o, i) => (i === index ? { ...o, audioUrl, audioMediaId } : o))
    onChange({ ...value, leftItems: next })
  }

  const updateRightAudio = (rightId: string, audioUrl: string, audioMediaId?: string) => {
    const next = rightItems.map((o) => (o.id === rightId ? { ...o, audioUrl, audioMediaId } : o))
    onChange({ ...value, rightItems: next })
  }

  const updateLeftImage = (index: number, imageUrl: string, imageMediaId?: string) => {
    const next = leftItems.map((o, i) => (i === index ? { ...o, imageUrl, imageMediaId } : o))
    onChange({ ...value, leftItems: next })
  }

  const updateRightImage = (rightId: string, imageUrl: string, imageMediaId?: string) => {
    const next = rightItems.map((o) => (o.id === rightId ? { ...o, imageUrl, imageMediaId } : o))
    onChange({ ...value, rightItems: next })
  }

  const setPairRight = (leftId: string, rightId: string) => {
    const next = correctPairs.filter((p) => p.leftId !== leftId)
    if (rightId) next.push({ leftId, rightId })
    onChange({ ...value, correctPairs: next })
  }

  const getPairedRight = (leftId: string) => correctPairs.find((p) => p.leftId === leftId)?.rightId ?? ''
  const usedRightIds = new Set(correctPairs.map((p) => p.rightId))

  const describeRight = (r: MatchItem) => {
    if (r.itemType === 'audio') {
      const media = mediaFiles.find((m) => m.id === r.audioMediaId || m.url === r.audioUrl)
      return `Аудио: ${media?.description || media?.filename || (r.audioUrl ? r.audioUrl.split('/').pop() : 'не выбрано')}`
    }
    return r.text || `Без текста (${r.id})`
  }

  const renderItemFields = (
    item: MatchItem,
    fieldLabel: string,
    onType: (t: string) => void,
    onText: (t: string) => void,
    onAudio: (url: string, mediaId?: string) => void,
    onImage: (url: string, mediaId?: string) => void,
  ) => (
    <Stack spacing={1}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <Select
          size="small"
          value={item.itemType ?? 'text'}
          onChange={(e) => onType(e.target.value as string)}
          sx={{ minWidth: 104, bgcolor: 'background.paper' }}
          inputProps={{ 'aria-label': `${fieldLabel}: тип` }}
        >
          <MenuItem value="text">Текст</MenuItem>
          <MenuItem value="audio">Аудио</MenuItem>
        </Select>
        {(item.itemType ?? 'text') === 'text' ? (
          <TextField
            fullWidth
            size="small"
            label={fieldLabel}
            value={item.text}
            onChange={(e) => onText(e.target.value)}
            placeholder="Текст или арабское слово"
            inputProps={item.text && /[\u0600-\u06FF]/.test(item.text) ? arabicInputProps : { dir: 'auto' }}
            sx={{ bgcolor: 'background.paper' }}
          />
        ) : (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <AudioMediaPicker
              mediaFiles={mediaFiles}
              audioUrl={item.audioUrl}
              audioMediaId={(item as any).audioMediaId}
              onChange={onAudio}
              label=""
            />
          </Box>
        )}
      </Box>
      {(item.itemType ?? 'text') === 'text' && (
        <ImageMediaPicker
          mediaFiles={mediaFiles}
          imageUrl={item.imageUrl}
          imageMediaId={(item as any).imageMediaId}
          onChange={onImage}
          label="Изображение (необязательно)"
        />
      )}
    </Stack>
  )

  const distractors = rightItems.length - leftItems.length

  return (
    <Stack spacing={2}>
      <MediaHint>Аудио и изображения сначала загрузите в раздел медиа, затем выберите их ниже.</MediaHint>
      <LangPair label="Инструкция" value={value} onChange={onChange} keys={['instructionRu', 'instructionKz']} placeholders={['Сопоставь пары', 'Жұптарды сәйкестендіріңіз']} />

      <SectionLabel hint="Для каждого элемента слева выберите его правильную пару справа.">Левый столбец — вопросы</SectionLabel>
      <Stack spacing={1}>
        {leftItems.map((item, i) => {
          const paired = getPairedRight(item.id)
          return (
            <Box key={item.id} sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'surface.sunken' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Пара {i + 1}</Typography>
                <Tooltip title="Удалить пару">
                  <span>
                    <IconButton size="small" onClick={() => removeLeftItem(i)} disabled={leftItems.length <= 1} aria-label={`Удалить пару ${i + 1}`} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
              {renderItemFields(
                item,
                `Левая часть ${i + 1}`,
                (t) => updateLeftItemType(i, t),
                (t) => updateLeftText(i, t),
                (url, mediaId) => updateLeftAudio(i, url, mediaId),
                (url, mediaId) => updateLeftImage(i, url, mediaId),
              )}
              <TextField
                select
                size="small"
                fullWidth
                label="Правильная пара справа"
                value={paired}
                onChange={(e) => setPairRight(item.id, e.target.value as string)}
                error={!paired}
                helperText={!paired ? 'Пара не выбрана' : undefined}
                sx={{ mt: 1.25, bgcolor: 'background.paper' }}
                SelectProps={{ displayEmpty: true }}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value=""><em>Не выбрано</em></MenuItem>
                {rightItems.map((r) => {
                  const taken = usedRightIds.has(r.id) && paired !== r.id
                  return (
                    <MenuItem key={r.id} value={r.id} disabled={taken}>
                      {describeRight(r)}
                      {taken && ' (уже в паре)'}
                    </MenuItem>
                  )
                })}
              </TextField>
            </Box>
          )
        })}
      </Stack>

      <Divider />

      <Stack direction="row" alignItems="center" spacing={1}>
        <SectionLabel hint="Элементы без пары — лишние варианты (дистракторы).">Правый столбец — ответы</SectionLabel>
        {distractors > 0 && <Chip size="small" label={`Лишних: ${distractors}`} color="warning" variant="outlined" />}
      </Stack>
      <Stack spacing={1}>
        {rightItems.map((item) => {
          const isPaired = usedRightIds.has(item.id)
          return (
            <Box
              key={item.id}
              sx={{
                p: 1.25,
                border: '1px solid',
                borderColor: isPaired ? 'success.main' : 'warning.main',
                borderRadius: 1.5,
                bgcolor: isPaired ? color.success.soft : color.warning.soft,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: isPaired ? 'success.dark' : 'warning.dark' }}>
                  {isPaired ? `Правильный ответ для пары ${correctPairs.findIndex((p) => p.rightId === item.id) + 1}` : 'Лишний вариант'}
                </Typography>
                <Tooltip title="Удалить элемент">
                  <span>
                    <IconButton size="small" onClick={() => removeRightItem(item.id)} disabled={rightItems.length <= 1} aria-label="Удалить элемент справа" sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
              {renderItemFields(
                item,
                `Правая часть ${rightItems.indexOf(item) + 1}`,
                (t) => updateRightItemType(item.id, t),
                (t) => updateRightText(item.id, t),
                (url, mediaId) => updateRightAudio(item.id, url, mediaId),
                (url, mediaId) => updateRightImage(item.id, url, mediaId),
              )}
            </Box>
          )
        })}
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button size="small" startIcon={<Add />} onClick={addPair} variant="outlined">
          Добавить пару
        </Button>
        <Button size="small" startIcon={<LinkOff />} onClick={addDistractor} variant="text">
          Добавить лишний вариант
        </Button>
      </Stack>
    </Stack>
  )
}

// ----------------------------------------------------------------------
// ManualInputConfigEditor
// ----------------------------------------------------------------------

export function ManualInputConfigEditor({ value, onChange }: EditorProps) {
  return (
    <Stack spacing={2}>
      <LangPair label="Инструкция" value={value} onChange={onChange} keys={['instructionRu', 'instructionKz']} placeholders={['Введи ответ', 'Жауапты енгізіңіз']} />
      <TextField
        fullWidth
        size="small"
        label="Правильный ответ"
        value={(value?.correctAnswer as string) || ''}
        onChange={(e) => onChange({ ...value, correctAnswer: e.target.value })}
        placeholder="Точный текст, который должен ввести ученик"
        required
        error={!((value?.correctAnswer as string) || '').trim()}
        helperText={!((value?.correctAnswer as string) || '').trim() ? 'Обязательное поле' : 'Ответ ученика сравнивается с этим текстом'}
        inputProps={/[\u0600-\u06FF]/.test((value?.correctAnswer as string) || '') ? arabicInputProps : { dir: 'auto' }}
        sx={{ '& .MuiOutlinedInput-root': { bgcolor: color.success.soft } }}
      />
      <LangPair label="Подсказка" value={value} onChange={onChange} keys={['hintRu', 'hintKz']} helperText="Необязательно" />
    </Stack>
  )
}

// ----------------------------------------------------------------------
// MultipleChoiceConfigEditor (no config)
// ----------------------------------------------------------------------

export function MultipleChoiceConfigEditor() {
  return (
    <Typography variant="body2" color="text.secondary">
      Варианты ответов настраиваются ниже. Отметьте правильные — можно несколько.
    </Typography>
  )
}

// ----------------------------------------------------------------------
// AudioMultipleChoiceConfigEditor
// ----------------------------------------------------------------------

function normalizeAudioOptions(raw: any): Array<{ id: string; text: string; isCorrect: boolean }> {
  if (!Array.isArray(raw)) return []
  return raw.map((o, i) => ({
    id: o?.id ?? `opt_${i + 1}`,
    text: o?.text ?? '',
    isCorrect: !!o?.isCorrect,
  }))
}

export function AudioMultipleChoiceConfigEditor({ value, onChange, mediaFiles = [] }: EditorProps & { mediaFiles?: MediaFile[] }) {
  const options = normalizeAudioOptions(value?.options)
  const normalized = useRef(false)

  useEffect(() => {
    if (normalized.current) return
    if (options.length === 0) {
      normalized.current = true
      onChange({
        ...value,
        audioUrl: value?.audioUrl ?? '',
        options: [
          { id: 'opt_1', text: '', isCorrect: true },
          { id: 'opt_2', text: '', isCorrect: false },
          { id: 'opt_3', text: '', isCorrect: false },
          { id: 'opt_4', text: '', isCorrect: false },
        ],
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs only when the listed inputs change
  }, [])

  const updateOption = (id: string, field: 'text' | 'isCorrect', val: string | boolean) => {
    const next = options.map((o) => (o.id === id ? { ...o, [field]: val } : o))
    onChange({ ...value, options: next })
  }

  const addOption = () => {
    const nextId = `opt_${options.length + 1}`
    onChange({ ...value, options: [...options, { id: nextId, text: '', isCorrect: false }] })
  }

  const removeOption = (id: string) => {
    onChange({ ...value, options: options.filter((o) => o.id !== id) })
  }

  return (
    <Stack spacing={2}>
      <MediaHint>Сначала загрузите аудиофайл в раздел медиа, затем выберите его ниже.</MediaHint>
      <AudioMediaPicker
        mediaFiles={mediaFiles}
        audioUrl={value?.audioUrl as string}
        audioMediaId={value?.audioMediaId as string}
        onChange={(url, mediaId) => onChange({ ...value, audioUrl: url, audioMediaId: mediaId || undefined })}
        label="Аудиофайл"
      />
      <TextField
        fullWidth
        size="small"
        label="Инструкция (KZ)"
        helperText="Необязательно"
        value={(value?.instructionKz as string) || ''}
        onChange={(e) => onChange({ ...value, instructionKz: e.target.value })}
      />
      <SectionLabel hint="Отметьте один правильный вариант.">Варианты ответа</SectionLabel>
      <Stack spacing={0.75} role="radiogroup" aria-label="Варианты ответа">
        {options.map((opt, i) => (
          <CorrectOptionRow
            key={opt.id}
            checked={opt.isCorrect}
            onCheck={() => {
              const next = options.map((o) => ({ ...o, isCorrect: o.id === opt.id }))
              onChange({ ...value, options: next })
            }}
            label={`Вариант ${i + 1}`}
            onRemove={() => removeOption(opt.id)}
            removeDisabled={options.length <= 2}
          >
            <TextField
              fullWidth
              size="small"
              value={opt.text}
              onChange={(e) => updateOption(opt.id, 'text', e.target.value)}
              placeholder="Текст варианта"
              inputProps={{ ...(/[\u0600-\u06FF]/.test(opt.text) ? arabicInputProps : { dir: 'auto' }), 'aria-label': `Вариант ${i + 1}` }}
              error={!opt.text.trim()}
            />
          </CorrectOptionRow>
        ))}
      </Stack>
      <Box>
        <Button size="small" startIcon={<Add />} onClick={addOption} variant="outlined">
          Добавить вариант
        </Button>
      </Box>
      <LangPair label="Пояснение после ответа" value={value} onChange={onChange} keys={['explanationRu', 'explanationKz']} helperText="Необязательно" />
    </Stack>
  )
}

// ----------------------------------------------------------------------
// ImageWordMatchConfigEditor
// ----------------------------------------------------------------------

export function ImageWordMatchConfigEditor({ value, onChange, mediaFiles = [] }: EditorProps & { mediaFiles?: MediaFile[] }) {
  const pairs: Array<{ id: string; word: string; imageUrl: string }> = Array.isArray(value?.pairs)
    ? value.pairs.map((p: any) => ({ ...p, id: p.id ?? crypto.randomUUID(), word: p.word ?? '', imageUrl: p.imageUrl ?? '' }))
    : []

  const normalized = useRef(false)
  useEffect(() => {
    if (normalized.current) return
    if (pairs.length === 0) {
      normalized.current = true
      onChange({
        ...value,
        instruction: value?.instruction ?? 'Соедини картинку и слово',
        pairs: [
          { id: crypto.randomUUID(), word: '', imageUrl: '' },
          { id: crypto.randomUUID(), word: '', imageUrl: '' },
        ],
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs only when the listed inputs change
  }, [])

  const addPair = () => {
    onChange({ ...value, pairs: [...pairs, { id: crypto.randomUUID(), word: '', imageUrl: '' }] })
  }

  const removePair = (id: string) => {
    onChange({ ...value, pairs: pairs.filter((p) => p.id !== id) })
  }

  const updatePair = (id: string, field: 'word' | 'imageUrl', val: string) => {
    onChange({ ...value, pairs: pairs.map((p) => (p.id === id ? { ...p, [field]: val } : p)) })
  }

  return (
    <Stack spacing={2}>
      <LangPair label="Инструкция" value={value} onChange={onChange} keys={['instructionRu', 'instructionKz']} placeholders={['Соедини картинку и слово', 'Сурет пен сөзді қосыңыз']} />
      <MediaHint>Сначала загрузите изображения в раздел медиа, затем выберите их ниже.</MediaHint>
      <SectionLabel hint="Ученик соединяет каждое слово с его картинкой.">Пары</SectionLabel>
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {pairs.map((pair, idx) => (
          <Box key={pair.id} sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'surface.sunken' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ minWidth: 20, color: 'text.secondary', fontWeight: 600 }}>{idx + 1}</Typography>
              <TextField
                fullWidth
                size="small"
                label="Арабское слово"
                value={pair.word}
                onChange={(e) => updatePair(pair.id, 'word', e.target.value)}
                inputProps={arabicInputProps}
                placeholder="بَيْت"
                error={!pair.word.trim()}
                sx={{ bgcolor: 'background.paper' }}
              />
              <Tooltip title="Удалить пару">
                <span>
                  <IconButton size="small" onClick={() => removePair(pair.id)} disabled={pairs.length <= 1} aria-label={`Удалить пару ${idx + 1}`} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
            <ImageMediaPicker
              mediaFiles={mediaFiles}
              imageUrl={pair.imageUrl}
              imageMediaId={(pair as any).imageMediaId}
              onChange={(url, mediaId) => {
                // One update so the URL and the media id are saved together.
                onChange({
                  ...value,
                  pairs: pairs.map((p) =>
                    p.id === pair.id ? { ...p, imageUrl: url, ...(mediaId !== undefined ? { imageMediaId: mediaId } : {}) } : p,
                  ),
                })
              }}
              label={`Изображение пары ${idx + 1}`}
            />
          </Box>
        ))}
      </Box>
      <Box>
        <Button size="small" startIcon={<Add />} onClick={addPair} variant="outlined">
          Добавить пару
        </Button>
      </Box>
    </Stack>
  )
}

// ----------------------------------------------------------------------
// splitArabicWord — grapheme-aware split preserving harakat
// ----------------------------------------------------------------------

function splitArabicWord(word: string): string[] {
  if (!word) return []
  const clusters: string[] = []
  const harakatRange = /[\u064B-\u065F\u0670\u0640]/
  for (const ch of word) {
    if (clusters.length > 0 && harakatRange.test(ch)) {
      clusters[clusters.length - 1] += ch
    } else {
      clusters.push(ch)
    }
  }
  return clusters
}

// ----------------------------------------------------------------------
// AudioChoiceConfigEditor
// (hear audio → choose Arabic letter/syllable; single correct answer)
// ----------------------------------------------------------------------

function normalizeAudioChoiceOptions(raw: any): Array<{ id: string; text: string; isCorrect: boolean }> {
  if (!Array.isArray(raw)) return []
  return raw.map((o, i) => ({
    id: o?.id ?? `opt_${i + 1}`,
    text: o?.text ?? '',
    isCorrect: !!o?.isCorrect,
  }))
}

export function AudioChoiceConfigEditor({ value, onChange, mediaFiles = [] }: EditorProps & { mediaFiles?: MediaFile[] }) {
  const options = normalizeAudioChoiceOptions(value?.options)
  const normalized = useRef(false)

  useEffect(() => {
    if (normalized.current) return
    if (options.length === 0) {
      normalized.current = true
      onChange({
        ...value,
        audioUrl: value?.audioUrl ?? '',
        options: [
          { id: 'opt_1', text: '', isCorrect: true },
          { id: 'opt_2', text: '', isCorrect: false },
          { id: 'opt_3', text: '', isCorrect: false },
        ],
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs only when the listed inputs change
  }, [])

  const addOption = () => {
    const nextId = `opt_${options.length + 1}`
    onChange({ ...value, options: [...options, { id: nextId, text: '', isCorrect: false }] })
  }

  const removeOption = (id: string) => {
    onChange({ ...value, options: options.filter((o) => o.id !== id) })
  }

  const setCorrect = (id: string) => {
    const next = options.map((o) => ({ ...o, isCorrect: o.id === id }))
    onChange({ ...value, options: next })
  }

  const updateText = (id: string, text: string) => {
    const next = options.map((o) => (o.id === id ? { ...o, text } : o))
    onChange({ ...value, options: next })
  }

  return (
    <Stack spacing={2}>
      <MediaHint>Сначала загрузите аудиофайл в раздел медиа, затем выберите его ниже.</MediaHint>
      <LangPair label="Инструкция" value={value} onChange={onChange} keys={['instructionRu', 'instructionKz']} placeholders={['Какая это буква?', 'Бұл қандай әріп?']} />
      <AudioMediaPicker
        mediaFiles={mediaFiles}
        audioUrl={value?.audioUrl as string}
        audioMediaId={value?.audioMediaId as string}
        onChange={(url, mediaId) => onChange({ ...value, audioUrl: url, audioMediaId: mediaId || undefined })}
        label="Аудиофайл"
      />
      <SectionLabel hint="Буквы или слоги. Отметьте ту, что звучит в аудио.">Варианты ответа</SectionLabel>
      <Stack spacing={0.75} role="radiogroup" aria-label="Варианты ответа">
        {options.map((opt, i) => (
          <CorrectOptionRow
            key={opt.id}
            checked={opt.isCorrect}
            onCheck={() => setCorrect(opt.id)}
            label={`Вариант ${i + 1}`}
            onRemove={() => removeOption(opt.id)}
            removeDisabled={options.length <= 2}
          >
            <TextField
              size="small"
              value={opt.text}
              onChange={(e) => updateText(opt.id, e.target.value)}
              placeholder="ح"
              inputProps={arabicFieldProps({ style: { ...arabicInputProps.style, textAlign: 'center' }, 'aria-label': `Вариант ${i + 1}` })}
              error={!opt.text.trim()}
              sx={{ width: 96 }}
            />
          </CorrectOptionRow>
        ))}
      </Stack>
      <Box>
        <Button size="small" startIcon={<Add />} onClick={addOption} variant="outlined">
          Добавить вариант
        </Button>
      </Box>
      <LangPair label="Пояснение после ответа" value={value} onChange={onChange} keys={['explanationRu', 'explanationKz']} helperText="Необязательно" />
    </Stack>
  )
}

// ----------------------------------------------------------------------
// FindLetterInWordConfigEditor
// (show Arabic word → tap target letter)
// ----------------------------------------------------------------------

export function FindLetterInWordConfigEditor({ value, onChange }: EditorProps) {
  const word = (value?.word as string) || ''
  const targetLetter = (value?.targetLetter as string) || ''
  const letters = splitArabicWord(word)

  const stripDiacritics = (s: string) => s.replace(/[\u064B-\u065F\u0670\u0640]/g, '')

  const found = !!targetLetter && letters.some((l) => stripDiacritics(l) === stripDiacritics(targetLetter))

  return (
    <Stack spacing={2}>
      <LangPair label="Инструкция" value={value} onChange={onChange} keys={['instructionRu', 'instructionKz']} placeholders={['Найдите букву ح в слове', 'Сөздегі әріпті табыңыз']} />
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <TextField
          label="Арабское слово"
          size="small"
          value={word}
          onChange={(e) => onChange({ ...value, word: e.target.value })}
          inputProps={arabicInputProps}
          placeholder="حَرَكَة"
          error={!word.trim()}
          sx={{ flex: '2 1 220px' }}
        />
        <TextField
          label="Буква, которую нужно найти"
          size="small"
          value={targetLetter}
          onChange={(e) => onChange({ ...value, targetLetter: e.target.value })}
          inputProps={arabicFieldProps({ style: { ...arabicInputProps.style, textAlign: 'center' } })}
          placeholder="ح"
          error={!!targetLetter && !!word && !found}
          sx={{ flex: '1 1 140px', maxWidth: 220 }}
        />
      </Box>

      {word && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
            Слово по буквам, искомая буква выделена
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, direction: 'rtl', p: 1, border: '1px dashed', borderColor: 'surface.borderStrong', borderRadius: 1.5, bgcolor: 'background.paper' }}>
            {letters.map((letter, i) => {
              const isTarget = targetLetter ? stripDiacritics(letter) === stripDiacritics(targetLetter) : false
              return (
                <Box
                  key={i}
                  sx={{
                    minWidth: 40,
                    height: 44,
                    px: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: isTarget ? 'success.main' : 'divider',
                    bgcolor: isTarget ? color.success.soft : 'surface.sunken',
                  }}
                >
                  <ArabicText size="md" component="span">{letter}</ArabicText>
                </Box>
              )
            })}
          </Box>
          {targetLetter && found ? (
            <Typography variant="caption" sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.dark' }}>
              <CheckCircle sx={{ fontSize: 14 }} /> Буква найдена в слове
            </Typography>
          ) : targetLetter ? (
            <Typography variant="caption" sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 0.5, color: 'error.main' }} role="alert">
              <CancelOutlined sx={{ fontSize: 14 }} /> Буквы нет в слове — проверьте написание
            </Typography>
          ) : null}
        </Box>
      )}
    </Stack>
  )
}

// ----------------------------------------------------------------------
// ListenAndChooseWordConfigEditor
// (hear audio → choose Arabic word with diacritics; single correct answer)
// ----------------------------------------------------------------------

function normalizeWordOptions(raw: any): Array<{ id: string; text: string; isCorrect: boolean }> {
  if (!Array.isArray(raw)) return []
  return raw.map((o, i) => ({
    id: o?.id ?? `opt_${i + 1}`,
    text: o?.text ?? '',
    isCorrect: !!o?.isCorrect,
  }))
}

export function ListenAndChooseWordConfigEditor({ value, onChange, mediaFiles = [] }: EditorProps & { mediaFiles?: MediaFile[] }) {
  const options = normalizeWordOptions(value?.options)
  const normalized = useRef(false)

  useEffect(() => {
    if (normalized.current) return
    if (options.length === 0) {
      normalized.current = true
      onChange({
        ...value,
        audioUrl: value?.audioUrl ?? '',
        options: [
          { id: 'opt_1', text: '', isCorrect: true },
          { id: 'opt_2', text: '', isCorrect: false },
          { id: 'opt_3', text: '', isCorrect: false },
        ],
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs only when the listed inputs change
  }, [])

  const addOption = () => {
    const nextId = `opt_${options.length + 1}`
    onChange({ ...value, options: [...options, { id: nextId, text: '', isCorrect: false }] })
  }

  const removeOption = (id: string) => {
    onChange({ ...value, options: options.filter((o) => o.id !== id) })
  }

  const setCorrect = (id: string) => {
    const next = options.map((o) => ({ ...o, isCorrect: o.id === id }))
    onChange({ ...value, options: next })
  }

  const updateText = (id: string, text: string) => {
    const next = options.map((o) => (o.id === id ? { ...o, text } : o))
    onChange({ ...value, options: next })
  }

  return (
    <Stack spacing={2}>
      <MediaHint>Сначала загрузите аудиофайл в раздел медиа, затем выберите его ниже.</MediaHint>
      <LangPair label="Инструкция" value={value} onChange={onChange} keys={['instructionRu', 'instructionKz']} placeholders={['Послушайте и выберите слово', 'Тыңдап, сөзді таңдаңыз']} />
      <AudioMediaPicker
        mediaFiles={mediaFiles}
        audioUrl={value?.audioUrl as string}
        audioMediaId={value?.audioMediaId as string}
        onChange={(url, mediaId) => onChange({ ...value, audioUrl: url, audioMediaId: mediaId || undefined })}
        label="Аудиофайл"
      />
      <SectionLabel hint="Слова с огласовками. Отметьте то, что звучит в аудио.">Варианты ответа</SectionLabel>
      <Stack spacing={0.75} role="radiogroup" aria-label="Варианты ответа">
        {options.map((opt, i) => (
          <CorrectOptionRow
            key={opt.id}
            checked={opt.isCorrect}
            onCheck={() => setCorrect(opt.id)}
            label={`Вариант ${i + 1}`}
            onRemove={() => removeOption(opt.id)}
            removeDisabled={options.length <= 2}
          >
            <TextField
              fullWidth
              size="small"
              value={opt.text}
              onChange={(e) => updateText(opt.id, e.target.value)}
              placeholder="قَمَر"
              inputProps={arabicFieldProps({ 'aria-label': `Вариант ${i + 1}` })}
              error={!opt.text.trim()}
            />
          </CorrectOptionRow>
        ))}
      </Stack>
      <Box>
        <Button size="small" startIcon={<Add />} onClick={addOption} variant="outlined">
          Добавить вариант
        </Button>
      </Box>
      <LangPair label="Пояснение после ответа" value={value} onChange={onChange} keys={['explanationRu', 'explanationKz']} helperText="Необязательно" />
    </Stack>
  )
}

// ----------------------------------------------------------------------
// getConfigTemplate
// ----------------------------------------------------------------------

export function getConfigTemplate(type: ConfigEditorType): Record<string, any> {
  if (type === 'fill_blank') {
    return {
      instructionRu: 'Заполни пропуск',
      instructionKz: 'Бос орынды толтырыңыз',
      sentenceTemplateRu: 'Это ________ пример',
      sentenceTemplateKz: 'Бұл ________ мысал',
      options: [{ id: 'opt_1', text: 'правильный' }, { id: 'opt_2', text: 'неверный' }],
      correctAnswerId: 'opt_1',
      explanationRu: '',
      explanationKz: '',
    }
  }
  if (type === 'match_pairs') {
    return {
      instructionRu: 'Сопоставь пары',
      instructionKz: 'Жұптарды сәйкестендіріңіз',
      leftItems: [{ id: 'l1', text: 'Слово 1' }, { id: 'l2', text: 'Слово 2' }],
      rightItems: [{ id: 'r1', text: 'Перевод 1' }, { id: 'r2', text: 'Перевод 2' }],
      correctPairs: [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r2' }],
    }
  }
  if (type === 'manual_input') {
    return {
      instructionRu: 'Введи ответ',
      instructionKz: 'Жауап енгізіңіз',
      correctAnswer: '',
      hintRu: '',
      hintKz: '',
    }
  }
  if (type === 'audio_multiple_choice') {
    return {
      audioUrl: '',
      options: [
        { id: 'opt_1', text: 'Вариант 1', isCorrect: true },
        { id: 'opt_2', text: 'Вариант 2', isCorrect: false },
        { id: 'opt_3', text: 'Вариант 3', isCorrect: false },
        { id: 'opt_4', text: 'Вариант 4', isCorrect: false },
      ],
      explanationRu: '',
      explanationKz: '',
    }
  }
  if (type === 'image_word_match') {
    return {
      instructionRu: 'Соедини картинку и слово',
      instructionKz: 'Суретті сөзбен сәйкестендір',
      pairs: [
        { id: crypto.randomUUID(), word: '', imageUrl: '' },
        { id: crypto.randomUUID(), word: '', imageUrl: '' },
      ],
    }
  }
  if (type === 'audio_choice') {
    return {
      instructionRu: 'Какая это буква?',
      instructionKz: 'Бұл қандай әріп?',
      audioUrl: '',
      options: [
        { id: 'opt_1', text: '', isCorrect: true },
        { id: 'opt_2', text: '', isCorrect: false },
        { id: 'opt_3', text: '', isCorrect: false },
      ],
      explanationRu: '',
      explanationKz: '',
    }
  }
  if (type === 'find_letter_in_word') {
    return {
      instructionRu: 'Найдите букву в слове',
      instructionKz: 'Сөздегі әріпті табыңыз',
      word: '',
      targetLetter: '',
    }
  }
  if (type === 'listen_and_choose_word') {
    return {
      instructionRu: 'Послушайте и выберите слово',
      instructionKz: 'Тыңдап, сөзді таңдаңыз',
      audioUrl: '',
      options: [
        { id: 'opt_1', text: '', isCorrect: true },
        { id: 'opt_2', text: '', isCorrect: false },
        { id: 'opt_3', text: '', isCorrect: false },
      ],
      explanationRu: '',
      explanationKz: '',
    }
  }
  return { instructionRu: 'Выберите правильный вариант', instructionKz: 'Дұрыс нұсқаны таңдаңыз', explanationRu: '', explanationKz: '' }
}
