import { useEffect, useRef } from 'react'
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
  Typography,
} from '@mui/material'
import { Add, Delete, LinkOff } from '@mui/icons-material'

export type ConfigEditorType = 'multiple_choice' | 'single_choice' | 'fill_blank' | 'match_pairs' | 'manual_input' | 'audio_multiple_choice' | 'image_word_match' | 'audio_choice' | 'find_letter_in_word' | 'listen_and_choose_word'

interface EditorProps {
  value: Record<string, any>
  onChange: (value: Record<string, any>) => void
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
      <TextField
        fullWidth
        size="small"
        label="instructionRu"
        value={(value?.instructionRu as string) || ''}
        onChange={(e) => onChange({ ...value, instructionRu: e.target.value })}
        placeholder="Заполни пропуск"
      />
      <TextField
        fullWidth
        size="small"
        label="sentenceTemplateRu"
        value={(value?.sentenceTemplateRu as string) || ''}
        onChange={(e) => onChange({ ...value, sentenceTemplateRu: e.target.value })}
        placeholder="Используйте ________ для пропуска"
        helperText="Используйте ________ для обозначения пропуска"
      />
      <Typography variant="subtitle2">Варианты ответов (выберите правильный)</Typography>
      {options.map((opt, i) => (
        <Box key={opt.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Radio
            checked={correctAnswerId === opt.id}
            onChange={() => setCorrect(opt.id)}
            size="small"
          />
          <TextField
            fullWidth
            size="small"
            value={opt.text}
            onChange={(e) => updateOption(i, e.target.value)}
            placeholder={`Вариант ${i + 1}`}
          />
          <IconButton size="small" color="error" onClick={() => removeOption(i)} disabled={options.length <= 1}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<Add />} onClick={addOption} variant="outlined">
        Добавить вариант
      </Button>
      <TextField
        fullWidth
        size="small"
        label="explanationRu (опционально)"
        value={(value?.explanationRu as string) || ''}
        onChange={(e) => onChange({ ...value, explanationRu: e.target.value })}
      />
    </Stack>
  )
}

// ----------------------------------------------------------------------
// MatchPairsConfigEditor (supports distractors: more right items than left)
// ----------------------------------------------------------------------

type MatchItemType = 'text' | 'audio' | 'image'
type MatchItem = { id: string; text: string; imageUrl?: string; itemType?: MatchItemType; audioUrl?: string }

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
      : { id: o?.id ?? `${prefix}${i + 1}`, text: o?.text ?? o?.textRu ?? '', imageUrl: o?.imageUrl, itemType: o?.itemType ?? 'text', audioUrl: o?.audioUrl }
  const leftItems = Array.isArray(left) ? left.map((o, i) => mapItem(o, i, 'l')) : []
  const rightItems = Array.isArray(right) ? right.map((o, i) => mapItem(o, i, 'r')) : []
  return { leftItems, rightItems, correctPairs: pairs }
}

export function MatchPairsConfigEditor({ value, onChange }: EditorProps) {
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

  const updateLeft = (index: number, field: string, val: string) => {
    const next = leftItems.map((o, i) => (i === index ? { ...o, [field]: val } : o))
    onChange({ ...value, leftItems: next })
  }

  const updateRight = (rightId: string, field: string, val: string) => {
    const next = rightItems.map((o) => (o.id === rightId ? { ...o, [field]: val } : o))
    onChange({ ...value, rightItems: next })
  }

  const setPairRight = (leftId: string, rightId: string) => {
    const next = correctPairs.filter((p) => p.leftId !== leftId)
    if (rightId) next.push({ leftId, rightId })
    onChange({ ...value, correctPairs: next })
  }

  const getPairedRight = (leftId: string) => correctPairs.find((p) => p.leftId === leftId)?.rightId ?? ''
  const usedRightIds = new Set(correctPairs.map((p) => p.rightId))

  const renderItemFields = (
    item: MatchItem,
    updateFn: (field: string, val: string) => void,
    side: 'left' | 'right',
    index: number,
  ) => (
    <>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
        <Select
          size="small"
          value={item.itemType ?? 'text'}
          onChange={(e) => updateFn('itemType', e.target.value as string)}
          sx={{ minWidth: 90 }}
        >
          <MenuItem value="text">Текст</MenuItem>
          <MenuItem value="audio">Аудио</MenuItem>
        </Select>
        {(item.itemType ?? 'text') === 'text' ? (
          <TextField
            fullWidth
            size="small"
            label={`${side === 'left' ? 'Левая' : 'Правая'} часть ${index + 1}`}
            value={item.text}
            onChange={(e) => updateFn('text', e.target.value)}
            placeholder="Текст части"
          />
        ) : (
          <TextField
            fullWidth
            size="small"
            label="URL аудио"
            value={item.audioUrl || ''}
            onChange={(e) => updateFn('audioUrl', e.target.value)}
            placeholder="https://storage.example.com/audio.mp3"
          />
        )}
      </Box>
      {(item.itemType ?? 'text') === 'text' && (
        <TextField
          size="small"
          fullWidth
          label="URL изображения (опционально)"
          value={item.imageUrl || ''}
          onChange={(e) => updateFn('imageUrl', e.target.value)}
          placeholder="https://..."
        />
      )}
    </>
  )

  return (
    <Stack spacing={2}>
      <TextField
        fullWidth
        size="small"
        label="instructionRu"
        value={(value?.instructionRu as string) || ''}
        onChange={(e) => onChange({ ...value, instructionRu: e.target.value })}
        placeholder="Сопоставь пары"
      />

      {/* Left column */}
      <Typography variant="subtitle2">Левые элементы (вопросы)</Typography>
      {leftItems.map((item, i) => (
        <Box key={item.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          {renderItemFields(item, (field, val) => updateLeft(i, field, val), 'left', i)}
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Правильный правый элемент
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Select
                size="small"
                fullWidth
                value={getPairedRight(item.id)}
                onChange={(e) => setPairRight(item.id, e.target.value as string)}
                displayEmpty
              >
                <MenuItem value=""><em>— не выбрано —</em></MenuItem>
                {rightItems.map((r) => (
                  <MenuItem key={r.id} value={r.id} disabled={usedRightIds.has(r.id) && getPairedRight(item.id) !== r.id}>
                    {r.itemType === 'audio' ? `🔊 ${r.audioUrl || '[аудио]'}` : (r.text || `[${r.id}]`)}
                    {usedRightIds.has(r.id) && getPairedRight(item.id) !== r.id && ' (занято)'}
                  </MenuItem>
                ))}
              </Select>
              <IconButton size="small" color="error" onClick={() => removeLeftItem(i)} disabled={leftItems.length <= 1}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      ))}

      <Divider />

      {/* Right column (all items including distractors) */}
      <Typography variant="subtitle2">
        Правые элементы (варианты ответов)
        {rightItems.length > leftItems.length && (
          <Chip size="small" label={`${rightItems.length - leftItems.length} дистракторов`} color="warning" sx={{ ml: 1 }} />
        )}
      </Typography>
      {rightItems.map((item) => {
        const isPaired = usedRightIds.has(item.id)
        return (
          <Box key={item.id} sx={{ p: 1.5, border: '1px solid', borderColor: isPaired ? 'success.light' : 'warning.light', borderRadius: 1, bgcolor: isPaired ? 'success.50' : 'warning.50' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <Chip size="small" label={isPaired ? 'правильный' : 'дистрактор'} color={isPaired ? 'success' : 'warning'} variant="outlined" />
              <IconButton size="small" color="error" onClick={() => removeRightItem(item.id)} disabled={rightItems.length <= 1}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
            {renderItemFields(item, (field, val) => updateRight(item.id, field, val), 'right', rightItems.indexOf(item))}
          </Box>
        )
      })}

      <Stack direction="row" spacing={1}>
        <Button size="small" startIcon={<Add />} onClick={addPair} variant="outlined">
          Добавить пару
        </Button>
        <Button size="small" startIcon={<LinkOff />} onClick={addDistractor} variant="outlined" color="warning">
          Добавить дистрактор
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
      <TextField
        fullWidth
        size="small"
        label="instructionRu"
        value={(value?.instructionRu as string) || ''}
        onChange={(e) => onChange({ ...value, instructionRu: e.target.value })}
        placeholder="Введи ответ"
      />
      <TextField
        fullWidth
        size="small"
        label="correctAnswer (обязательно)"
        value={(value?.correctAnswer as string) || ''}
        onChange={(e) => onChange({ ...value, correctAnswer: e.target.value })}
        placeholder="Правильный ответ"
        required
      />
      <TextField
        fullWidth
        size="small"
        label="hintRu (опционально)"
        value={(value?.hintRu as string) || ''}
        onChange={(e) => onChange({ ...value, hintRu: e.target.value })}
      />
    </Stack>
  )
}

// ----------------------------------------------------------------------
// MultipleChoiceConfigEditor (no config)
// ----------------------------------------------------------------------

export function MultipleChoiceConfigEditor() {
  return (
    <Typography variant="body2" color="text.secondary">
      Варианты ответов ниже. Отметьте правильные переключателем Correct (можно несколько).
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

export function AudioMultipleChoiceConfigEditor({ value, onChange }: EditorProps) {
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
      <Alert severity="info" sx={{ fontSize: 13 }}>
        Введите URL аудиофайла. Пользователь прослушает его, а затем выберет правильный вариант.
      </Alert>
      <TextField
        fullWidth
        size="small"
        label="URL аудио"
        value={(value?.audioUrl as string) || ''}
        onChange={(e) => onChange({ ...value, audioUrl: e.target.value })}
        placeholder="https://storage.example.com/audio.mp3"
      />
      <Typography variant="subtitle2">Варианты ответов (отметьте правильный)</Typography>
      {options.map((opt) => (
        <Box key={opt.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Radio
            checked={opt.isCorrect}
            onChange={() => {
              const next = options.map((o) => ({ ...o, isCorrect: o.id === opt.id }))
              onChange({ ...value, options: next })
            }}
            size="small"
          />
          <TextField
            fullWidth
            size="small"
            value={opt.text}
            onChange={(e) => updateOption(opt.id, 'text', e.target.value)}
            placeholder="Текст варианта"
          />
          <IconButton size="small" color="error" onClick={() => removeOption(opt.id)} disabled={options.length <= 2}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<Add />} onClick={addOption} variant="outlined">
        Добавить вариант
      </Button>
      <TextField
        fullWidth
        size="small"
        label="explanationRu (опционально)"
        value={(value?.explanationRu as string) || ''}
        onChange={(e) => onChange({ ...value, explanationRu: e.target.value })}
      />
    </Stack>
  )
}

// ----------------------------------------------------------------------
// ImageWordMatchConfigEditor
// ----------------------------------------------------------------------

export function ImageWordMatchConfigEditor({ value, onChange }: EditorProps) {
  const pairs: Array<{ id: string; word: string; imageUrl: string }> = Array.isArray(value?.pairs)
    ? value.pairs.map((p: any) => ({ id: p.id ?? crypto.randomUUID(), word: p.word ?? '', imageUrl: p.imageUrl ?? '' }))
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
      <TextField
        fullWidth
        size="small"
        label="Инструкция"
        value={(value?.instruction as string) || ''}
        onChange={(e) => onChange({ ...value, instruction: e.target.value })}
        placeholder="Соедини картинку и слово"
      />
      <Alert severity="info" sx={{ fontSize: 13 }}>
        Введите прямой URL изображения (HTTPS). Арабское слово отображается справа.
      </Alert>
      {pairs.map((pair, idx) => (
        <Box key={pair.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" sx={{ minWidth: 20, color: 'text.secondary' }}>{idx + 1}.</Typography>
            <TextField
              fullWidth
              size="small"
              label="Арабское слово"
              value={pair.word}
              onChange={(e) => updatePair(pair.id, 'word', e.target.value)}
              inputProps={{ dir: 'rtl', style: { fontSize: 18, fontFamily: 'serif' } }}
              placeholder="بَيْت"
            />
            <IconButton size="small" color="error" onClick={() => removePair(pair.id)} disabled={pairs.length <= 1}>
              <Delete fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              label="URL изображения"
              value={pair.imageUrl}
              onChange={(e) => updatePair(pair.id, 'imageUrl', e.target.value)}
              placeholder="https://..."
            />
            {pair.imageUrl && (
              <Box
                component="img"
                src={pair.imageUrl}
                sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider', flexShrink: 0 }}
                onError={(e: any) => { e.target.style.display = 'none' }}
              />
            )}
          </Box>
        </Box>
      ))}
      <Button size="small" startIcon={<Add />} onClick={addPair} variant="outlined">
        Добавить пару
      </Button>
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

export function AudioChoiceConfigEditor({ value, onChange }: EditorProps) {
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
      <Alert severity="info" sx={{ fontSize: 13 }}>
        Загрузите аудиофайл через «Медиа файлы» после сохранения блока, затем вставьте URL ниже.
      </Alert>
      <TextField
        fullWidth
        size="small"
        label="Инструкция (RU)"
        value={(value?.instructionRu as string) || ''}
        onChange={(e) => onChange({ ...value, instructionRu: e.target.value })}
        placeholder="Какая это буква?"
      />
      <TextField
        fullWidth
        size="small"
        label="URL аудио"
        value={(value?.audioUrl as string) || ''}
        onChange={(e) => onChange({ ...value, audioUrl: e.target.value })}
        placeholder="https://storage.example.com/letter.mp3"
      />
      <Typography variant="subtitle2">Варианты — буквы или слоги (отметьте правильный)</Typography>
      {options.map((opt) => (
        <Box key={opt.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Radio checked={opt.isCorrect} onChange={() => setCorrect(opt.id)} size="small" />
          <TextField
            size="small"
            value={opt.text}
            onChange={(e) => updateText(opt.id, e.target.value)}
            placeholder="ح"
            inputProps={{ dir: 'rtl', style: { fontSize: 22, fontFamily: 'serif', textAlign: 'center' } }}
            sx={{ width: 80 }}
          />
          <IconButton size="small" color="error" onClick={() => removeOption(opt.id)} disabled={options.length <= 2}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<Add />} onClick={addOption} variant="outlined">
        Добавить вариант
      </Button>
      <TextField
        fullWidth
        size="small"
        label="explanationRu (опционально)"
        value={(value?.explanationRu as string) || ''}
        onChange={(e) => onChange({ ...value, explanationRu: e.target.value })}
      />
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

  return (
    <Stack spacing={2}>
      <TextField
        fullWidth
        size="small"
        label="Инструкция (RU)"
        value={(value?.instructionRu as string) || ''}
        onChange={(e) => onChange({ ...value, instructionRu: e.target.value })}
        placeholder="Найдите букву ح в слове"
      />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="Арабское слово"
          size="small"
          value={word}
          onChange={(e) => onChange({ ...value, word: e.target.value })}
          inputProps={{ dir: 'rtl', style: { fontSize: 24, fontFamily: 'serif' } }}
          placeholder="حَرَكَة"
          sx={{ flex: 2 }}
        />
        <TextField
          label="Целевая буква"
          size="small"
          value={targetLetter}
          onChange={(e) => onChange({ ...value, targetLetter: e.target.value })}
          inputProps={{ dir: 'rtl', style: { fontSize: 24, fontFamily: 'serif', textAlign: 'center' } }}
          placeholder="ح"
          sx={{ flex: 1, maxWidth: 120 }}
        />
      </Box>

      {/* Live preview */}
      {word && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Предпросмотр (слово разбито на буквы, целевая подсвечена):
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, direction: 'rtl', p: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
            {letters.map((letter, i) => {
              const isTarget = targetLetter ? stripDiacritics(letter) === stripDiacritics(targetLetter) : false
              return (
                <Chip
                  key={i}
                  label={letter}
                  size="small"
                  color={isTarget ? 'primary' : 'default'}
                  sx={{ fontSize: 20, fontFamily: 'serif', height: 36, '& .MuiChip-label': { px: 1 } }}
                />
              )
            })}
          </Box>
          {targetLetter && letters.some((l) => stripDiacritics(l) === stripDiacritics(targetLetter)) ? (
            <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
              ✓ Буква «{targetLetter}» найдена в слове
            </Typography>
          ) : targetLetter ? (
            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
              ✗ Буква «{targetLetter}» не найдена в слове — проверьте правильность
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

export function ListenAndChooseWordConfigEditor({ value, onChange }: EditorProps) {
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
      <Alert severity="info" sx={{ fontSize: 13 }}>
        Загрузите аудиофайл через «Медиа файлы» после сохранения блока, затем вставьте URL ниже.
      </Alert>
      <TextField
        fullWidth
        size="small"
        label="Инструкция (RU)"
        value={(value?.instructionRu as string) || ''}
        onChange={(e) => onChange({ ...value, instructionRu: e.target.value })}
        placeholder="Послушайте и выберите слово"
      />
      <TextField
        fullWidth
        size="small"
        label="URL аудио"
        value={(value?.audioUrl as string) || ''}
        onChange={(e) => onChange({ ...value, audioUrl: e.target.value })}
        placeholder="https://storage.example.com/word.mp3"
      />
      <Typography variant="subtitle2">Варианты — слова с огласовками (отметьте правильный)</Typography>
      {options.map((opt) => (
        <Box key={opt.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Radio checked={opt.isCorrect} onChange={() => setCorrect(opt.id)} size="small" />
          <TextField
            fullWidth
            size="small"
            value={opt.text}
            onChange={(e) => updateText(opt.id, e.target.value)}
            placeholder="قَمَر"
            inputProps={{ dir: 'rtl', style: { fontSize: 20, fontFamily: 'serif' } }}
          />
          <IconButton size="small" color="error" onClick={() => removeOption(opt.id)} disabled={options.length <= 2}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<Add />} onClick={addOption} variant="outlined">
        Добавить вариант
      </Button>
      <TextField
        fullWidth
        size="small"
        label="explanationRu (опционально)"
        value={(value?.explanationRu as string) || ''}
        onChange={(e) => onChange({ ...value, explanationRu: e.target.value })}
      />
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
      sentenceTemplateRu: 'Это ________ пример',
      options: [{ id: 'opt_1', text: 'правильный' }, { id: 'opt_2', text: 'неверный' }],
      correctAnswerId: 'opt_1',
      explanationRu: '',
    }
  }
  if (type === 'match_pairs') {
    return {
      instructionRu: 'Сопоставь пары',
      leftItems: [{ id: 'l1', text: 'Слово 1' }, { id: 'l2', text: 'Слово 2' }],
      rightItems: [{ id: 'r1', text: 'Перевод 1' }, { id: 'r2', text: 'Перевод 2' }],
      correctPairs: [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r2' }],
    }
  }
  if (type === 'manual_input') {
    return {
      instructionRu: 'Введи ответ',
      correctAnswer: '',
      hintRu: '',
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
    }
  }
  if (type === 'image_word_match') {
    return {
      instruction: 'Соедини картинку и слово',
      pairs: [
        { id: crypto.randomUUID(), word: '', imageUrl: '' },
        { id: crypto.randomUUID(), word: '', imageUrl: '' },
      ],
    }
  }
  if (type === 'audio_choice') {
    return {
      instructionRu: 'Какая это буква?',
      audioUrl: '',
      options: [
        { id: 'opt_1', text: '', isCorrect: true },
        { id: 'opt_2', text: '', isCorrect: false },
        { id: 'opt_3', text: '', isCorrect: false },
      ],
      explanationRu: '',
    }
  }
  if (type === 'find_letter_in_word') {
    return {
      instructionRu: 'Найдите букву в слове',
      word: '',
      targetLetter: '',
    }
  }
  if (type === 'listen_and_choose_word') {
    return {
      instructionRu: 'Послушайте и выберите слово',
      audioUrl: '',
      options: [
        { id: 'opt_1', text: '', isCorrect: true },
        { id: 'opt_2', text: '', isCorrect: false },
        { id: 'opt_3', text: '', isCorrect: false },
      ],
      explanationRu: '',
    }
  }
  return { instructionRu: 'Выберите правильный вариант', explanationRu: '' }
}
