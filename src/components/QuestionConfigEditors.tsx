import { useEffect, useRef } from 'react'
import {
  Box,
  Button,
  IconButton,
  Radio,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Add, Delete } from '@mui/icons-material'

export type ConfigEditorType = 'multiple_choice' | 'single_choice' | 'fill_blank' | 'match_pairs' | 'manual_input' | 'drag_drop'

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
// MatchPairsConfigEditor
// ----------------------------------------------------------------------

function normalizeMatchPairs(value: Record<string, any>): {
  leftItems: Array<{ id: string; text: string }>
  rightItems: Array<{ id: string; text: string }>
  correctPairs: Array<{ leftId: string; rightId: string }>
} {
  const left = (value?.leftItems ?? value?.leftColumn) as Array<{ id: string; text: string }> | undefined
  const right = (value?.rightItems ?? value?.rightColumn) as Array<{ id: string; text: string }> | undefined
  const pairs = (value?.correctPairs as Array<{ leftId: string; rightId: string }>) || []
  const leftItems = Array.isArray(left) ? left.map((o, i) => (typeof o === 'string' ? { id: `l${i + 1}`, text: o } : { id: (o as any)?.id ?? `l${i + 1}`, text: (o as any)?.text ?? (o as any)?.textRu ?? '' })) : []
  const rightItems = Array.isArray(right) ? right.map((o, i) => (typeof o === 'string' ? { id: `r${i + 1}`, text: o } : { id: (o as any)?.id ?? `r${i + 1}`, text: (o as any)?.text ?? (o as any)?.textRu ?? '' })) : []
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

  const removePair = (index: number) => {
    const leftId = leftItems[index]?.id
    const rightId = rightItems[index]?.id
    const nextLeft = leftItems.filter((_, i) => i !== index)
    const nextRight = rightItems.filter((_, i) => i !== index)
    const nextPairs = correctPairs.filter((p) => p.leftId !== leftId && p.rightId !== rightId)
    onChange({
      ...value,
      leftItems: nextLeft,
      rightItems: nextRight,
      correctPairs: nextPairs,
    })
  }

  const updateLeft = (index: number, text: string) => {
    const next = leftItems.map((o, i) => (i === index ? { ...o, text } : o))
    onChange({ ...value, leftItems: next })
  }

  const updateRight = (index: number, text: string) => {
    const next = rightItems.map((o, i) => (i === index ? { ...o, text } : o))
    onChange({ ...value, rightItems: next })
  }

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
      <Typography variant="subtitle2">Пары (слева — слева, справа — справа)</Typography>
      {leftItems.map((_, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={leftItems[i]?.text || ''}
            onChange={(e) => updateLeft(i, e.target.value)}
            placeholder="Левая часть"
          />
          <Typography variant="body2" color="text.secondary">=</Typography>
          <TextField
            fullWidth
            size="small"
            value={rightItems[i]?.text || ''}
            onChange={(e) => updateRight(i, e.target.value)}
            placeholder="Правая часть"
          />
          <IconButton size="small" color="error" onClick={() => removePair(i)} disabled={leftItems.length <= 1}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<Add />} onClick={addPair} variant="outlined">
        Добавить пару
      </Button>
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
// DragDropConfigEditor  (same UI as fill_blank: sentence + word chips)
// ----------------------------------------------------------------------

export function DragDropConfigEditor({ value, onChange }: EditorProps) {
  return <FillBlankConfigEditor value={value} onChange={onChange} />
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
  if (type === 'drag_drop') {
    return {
      instructionRu: 'Заполни пропуск',
      sentenceTemplateRu: 'Это ________ пример',
      options: [{ id: 'opt_1', text: 'правильный' }, { id: 'opt_2', text: 'неверный' }],
      correctAnswerId: 'opt_1',
      explanationRu: '',
    }
  }
  return { instructionRu: 'Выберите правильный вариант', explanationRu: '' }
}
