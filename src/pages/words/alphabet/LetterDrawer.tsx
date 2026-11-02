import { useEffect, useRef, useState } from 'react'
import { Box, Button, CircularProgress, TextField } from '@mui/material'
import { ArabicText, FormSection, arabicInputProps } from '../../../components/ui'
import { AudioField, Completeness, EditorDrawer, FieldPair, GlyphTile, MetaLine } from '../shared'
import {
  FORM_LABELS,
  draftFromLetter,
  emptyDraft,
  letterCompleteness,
  type LetterDraft,
  type WordLetter,
} from './model'

export interface LetterDrawerProps {
  open: boolean
  /** `null` → create mode. */
  letter: WordLetter | null
  /** Default order for a new letter. */
  nextOrder: number
  saving: boolean
  onClose: () => void
  onCreate: (draft: LetterDraft) => void
  onSave: (letter: WordLetter, draft: LetterDraft) => void
  onUploadAudio: (code: string, file: File) => Promise<unknown>
  onDeleteAudio: (code: string) => void
}

export function LetterDrawer({
  open,
  letter,
  nextOrder,
  saving,
  onClose,
  onCreate,
  onSave,
  onUploadAudio,
  onDeleteAudio,
}: LetterDrawerProps) {
  const isEdit = !!letter
  const [draft, setDraft] = useState<LetterDraft>(() => (letter ? draftFromLetter(letter) : emptyDraft(nextOrder)))
  const [touched, setTouched] = useState(false)
  // KK fields are also read from the DOM on save: some Kazakh IMEs finish composition
  // after the last onChange, and without this the final characters were lost.
  const nameKkRef = useRef<HTMLInputElement | null>(null)
  const importantKkRef = useRef<HTMLTextAreaElement | null>(null)

  // Reset the form whenever the drawer opens for another letter (or for create).
  const letterId = letter?.id ?? null
  useEffect(() => {
    if (!open) return
    setDraft(letter ? draftFromLetter(letter) : emptyDraft(nextOrder))
    setTouched(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, letterId])

  const set = <K extends keyof LetterDraft>(key: K, value: LetterDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const setForm = (key: keyof LetterDraft['forms'], value: string) =>
    setDraft((d) => ({ ...d, forms: { ...d.forms, [key]: value } }))

  const missingRequired = !draft.nameRu.trim() || (!isEdit && (!draft.code.trim() || !draft.arabic.trim()))

  const submit = () => {
    setTouched(true)
    if (missingRequired) return
    if (letter) {
      onSave(letter, {
        ...draft,
        nameKk: nameKkRef.current?.value ?? draft.nameKk,
        importantKk: importantKkRef.current?.value ?? draft.importantKk,
      })
    } else {
      onCreate(draft)
    }
  }

  const err = (cond: boolean) => touched && cond

  return (
    <EditorDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? `Буква ${letter?.nameRu || letter?.code}` : 'Новая буква'}
      subtitle={isEdit ? 'Название, произношение, формы и аудио для приложения' : 'Аудио можно добавить после создания буквы'}
      preview={
        draft.arabic ? (
          <GlyphTile size={72}>
            <ArabicText size="xl" align="center" aria-label="Буква">
              {draft.arabic}
            </ArabicText>
          </GlyphTile>
        ) : undefined
      }
      meta={
        isEdit && letter ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <MetaLine items={[{ label: 'Код', value: letter.code }, { label: 'Порядок', value: letter.orderIndex }]} />
            <Completeness
              variant="summary"
              items={letterCompleteness({
                ...draft,
                audioUrl: letter.audioUrl,
              })}
            />
          </Box>
        ) : undefined
      }
      footer={
        <>
          <Button variant="outlined" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isEdit ? 'Сохранить букву' : 'Создать букву'}
          </Button>
        </>
      }
    >
      {!isEdit && (
        <FormSection layout="stacked" title="Буква" description="Код — латиницей, уникальный: по нему буква связана с аудио." divider={false}>
          <FieldPair>
            <TextField
              label="Код"
              required
              value={draft.code}
              onChange={(e) => set('code', e.target.value)}
              error={err(!draft.code.trim())}
              helperText={err(!draft.code.trim()) ? 'Укажите код, например alif' : 'Например alif, ba, ta'}
            />
            <TextField
              label="Порядок"
              type="number"
              value={draft.orderIndex}
              onChange={(e) => set('orderIndex', Number(e.target.value) || 0)}
            />
          </FieldPair>
          <TextField
            label="Буква на арабском"
            required
            value={draft.arabic}
            onChange={(e) => set('arabic', e.target.value)}
            inputProps={arabicInputProps}
            error={err(!draft.arabic.trim())}
            helperText={err(!draft.arabic.trim()) ? 'Введите букву' : undefined}
          />
        </FormSection>
      )}

      <FormSection layout="stacked" title="Название" divider={!isEdit}>
        <FieldPair>
          <TextField
            label="Название (RU)"
            required
            value={draft.nameRu}
            onChange={(e) => set('nameRu', e.target.value)}
            error={err(!draft.nameRu.trim())}
            helperText={err(!draft.nameRu.trim()) ? 'Название обязательно' : undefined}
          />
          <TextField
            label="Название (KZ)"
            inputRef={nameKkRef}
            value={draft.nameKk}
            onChange={(e) => set('nameKk', e.target.value)}
            onCompositionEnd={(e) => set('nameKk', (e.target as HTMLInputElement).value)}
          />
        </FieldPair>
      </FormSection>

      <FormSection layout="stacked" title="Произношение" description="Как буква звучит — транслитерация или подсказка.">
        <FieldPair>
          <TextField label="Произношение (RU)" value={draft.translit} onChange={(e) => set('translit', e.target.value)} />
          <TextField label="Произношение (KZ)" value={draft.translitKk} onChange={(e) => set('translitKk', e.target.value)} />
        </FieldPair>
      </FormSection>

      <FormSection layout="stacked" title="Интересно знать" description="Короткая заметка под буквой в приложении.">
        <FieldPair>
          <TextField
            label="Заметка (RU)"
            value={draft.important}
            onChange={(e) => set('important', e.target.value)}
            multiline
            minRows={3}
          />
          <TextField
            label="Заметка (KZ)"
            inputRef={importantKkRef}
            value={draft.importantKk}
            onChange={(e) => set('importantKk', e.target.value)}
            onCompositionEnd={(e) => set('importantKk', (e.target as HTMLTextAreaElement).value)}
            multiline
            minRows={3}
          />
        </FieldPair>
      </FormSection>

      <FormSection
        layout="stacked"
        title="Формы в слове"
        description="Начертание буквы в зависимости от позиции. Пустое поле — используется сама буква."
      >
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' } }}>
          {FORM_LABELS.map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              value={draft.forms[f.key]}
              placeholder={draft.arabic || (f.key === 'middle' || f.key === 'final' ? 'ـا' : 'ا')}
              onChange={(e) => setForm(f.key, e.target.value)}
              inputProps={{ ...arabicInputProps, style: { ...arabicInputProps.style, textAlign: 'center' } }}
            />
          ))}
        </Box>
      </FormSection>

      <FormSection layout="stacked" title="Аудио произношения">
        <AudioField
          url={letter?.audioUrl}
          label={`буква ${letter?.nameRu ?? ''}`}
          disabledReason={isEdit ? undefined : 'Сначала создайте букву — затем загрузите аудио.'}
          onUpload={(file) => (letter ? onUploadAudio(letter.code, file) : Promise.resolve())}
          onDelete={letter?.audioUrl ? () => onDeleteAudio(letter.code) : undefined}
        />
      </FormSection>
    </EditorDrawer>
  )
}
