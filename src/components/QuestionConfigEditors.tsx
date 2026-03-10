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

export type ConfigEditorType = 'multiple_choice' | 'single_choice' | 'fill_blank' | 'match_pairs' | 'manual_input' | 'audio_multiple_choice' | 'image_word_match'

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

function normalizeMatchPairs(value: Record<string, any>): {
  leftItems: Array<{ id: string; text: string; imageUrl?: string }>
  rightItems: Array<{ id: string; text: string; imageUrl?: string }>
  correctPairs: Array<{ leftId: string; rightId: string }>
} {
  const left = (value?.leftItems ?? value?.leftColumn) as Array<{ id: string; text: string; imageUrl?: string }> | undefined
  const right = (value?.rightItems ?? value?.rightColumn) as Array<{ id: string; text: string; imageUrl?: string }> | undefined
  const pairs = (value?.correctPairs as Array<{ leftId: string; rightId: string }>) || []
  const leftItems = Array.isArray(left) ? left.map((o, i) => (typeof o === 'string' ? { id: `l${i + 1}`, text: o } : { id: (o as any)?.id ?? `l${i + 1}`, text: (o as any)?.text ?? (o as any)?.textRu ?? '', imageUrl: (o as any)?.imageUrl })) : []
  const rightItems = Array.isArray(right) ? right.map((o, i) => (typeof o === 'string' ? { id: `r${i + 1}`, text: o } : { id: (o as any)?.id ?? `r${i + 1}`, text: (o as any)?.text ?? (o as any)?.textRu ?? '', imageUrl: (o as any)?.imageUrl })) : []
  return { leftItems, rightItems, correctPairs: pairs }
}

export function MatchPairsConfigEditor({ value, onChange }: EditorProps) {
  const { leftItems: li, rightItems: ri, correctPairs } = normalizeMatchPairs(value || {})
  const leftItems = li.length > 0 ? li : [{ id: 'l1', text: '' }]
  const rightItems = ri.length > 0 ? ri : [{ id: 'r1', text: '' }]
  const normalized = useRef(false)

  useEffect(() => {
    if (normalized.current) return
    if (li.length === 0 && ri.length === 0) {
      normalized.current = true
      onChange({
        ...value,
        leftItems: [{ id: 'l1', text: '' }],
        rightItems: [{ id: 'r1', text: '' }],
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
      leftItems: [...leftItems, { id: leftId, text: '' }],
      rightItems: [...rightItems, { id: rightId, text: '' }],
      correctPairs: [...correctPairs, { leftId, rightId }],
    })
  }

  const addDistractor = () => {
    const n = rightItems.length + 1
    const rightId = `d${n}`
    onChange({
      ...value,
      rightItems: [...rightItems, { id: rightId, text: '' }],
    })
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

  const updateLeft = (index: number, text: string) => {
    const next = leftItems.map((o, i) => (i === index ? { ...o, text } : o))
    onChange({ ...value, leftItems: next })
  }

  const updateRight = (rightId: string, text: string) => {
    const next = rightItems.map((o) => (o.id === rightId ? { ...o, text } : o))
    onChange({ ...value, rightItems: next })
  }

  const updateLeftImageUrl = (index: number, imageUrl: string) => {
    const next = leftItems.map((o, i) => (i === index ? { ...o, imageUrl } : o))
    onChange({ ...value, leftItems: next })
  }

  const updateRightImageUrl = (rightId: string, imageUrl: string) => {
    const next = rightItems.map((o) => (o.id === rightId ? { ...o, imageUrl } : o))
    onChange({ ...value, rightItems: next })
  }

  const setPairRight = (leftId: string, rightId: string) => {
    const next = correctPairs.filter((p) => p.leftId !== leftId)
    if (rightId) next.push({ leftId, rightId })
    onChange({ ...value, correctPairs: next })
  }

  const getPairedRight = (leftId: string) => correctPairs.find((p) => p.leftId === leftId)?.rightId ?? ''
  const usedRightIds = new Set(correctPairs.map((p) => p.rightId))

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
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
            <TextField
              fullWidth
              size="small"
              label={`Левая часть ${i + 1}`}
              value={item.text}
              onChange={(e) => updateLeft(i, e.target.value)}
              placeholder="Текст левой части"
            />
            <IconButton size="small" color="error" onClick={() => removeLeftItem(i)} disabled={leftItems.length <= 1}>
              <Delete fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              label="URL изображения (левая)"
              value={item.imageUrl || ''}
              onChange={(e) => updateLeftImageUrl(i, e.target.value)}
              placeholder="https://..."
              sx={{ flex: 1 }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Правильный правый элемент
              </Typography>
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
                    {r.text || `[${r.id}]`}
                    {usedRightIds.has(r.id) && getPairedRight(item.id) !== r.id && ' (занято)'}
                  </MenuItem>
                ))}
              </Select>
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
              <TextField
                fullWidth
                size="small"
                value={item.text}
                onChange={(e) => updateRight(item.id, e.target.value)}
                placeholder="Текст правой части"
              />
              <IconButton size="small" color="error" onClick={() => removeRightItem(item.id)} disabled={rightItems.length <= 1}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
            <TextField
              size="small"
              fullWidth
              label="URL изображения (правая)"
              value={item.imageUrl || ''}
              onChange={(e) => updateRightImageUrl(item.id, e.target.value)}
              placeholder="https://..."
            />
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
  return { instructionRu: 'Выберите правильный вариант', explanationRu: '' }
}
