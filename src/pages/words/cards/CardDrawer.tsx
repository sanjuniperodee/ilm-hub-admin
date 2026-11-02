import { useState } from 'react'
import { Button, CircularProgress, TextField } from '@mui/material'
import { ArabicText, FormSection, arabicInputProps } from '../../../components/ui'
import { AudioField, Completeness, EditorDrawer, FieldPair } from '../shared'
import { ImageField } from './media'
import { cardCompleteness, type CardForm, type WordCard } from './model'

export interface CardDrawerProps {
  open: boolean
  /** Saved card (for media); `null` in create mode. */
  card: WordCard | null
  themeTitle: string
  form: CardForm
  saving: boolean
  onChange: (form: CardForm) => void
  onClose: () => void
  onSave: () => void
  onUploadAudio: (card: WordCard, file: File) => Promise<unknown>
  onUploadImage: (card: WordCard, file: File) => Promise<unknown>
}

export function CardDrawer({
  open,
  card,
  themeTitle,
  form,
  saving,
  onChange,
  onClose,
  onSave,
  onUploadAudio,
  onUploadImage,
}: CardDrawerProps) {
  const [touched, setTouched] = useState(false)
  const isEdit = !!card
  const missingArabic = !form.arabic.trim()
  const missingRu = !form.translationRu.trim()

  const submit = () => {
    setTouched(true)
    if (missingArabic || missingRu) return
    onSave()
  }

  return (
    <EditorDrawer
      open={open}
      onClose={() => {
        setTouched(false)
        onClose()
      }}
      title={isEdit ? `Карточка «${card?.translationRu}»` : 'Новая карточка'}
      subtitle={`Тема «${themeTitle}»`}
      preview={
        form.arabic.trim() ? (
          <ArabicText size="xl" weight={500} sx={{ display: 'block' }}>
            {form.arabic}
          </ArabicText>
        ) : undefined
      }
      meta={
        <Completeness
          variant="summary"
          items={cardCompleteness({
            translationRu: form.translationRu,
            translationKz: form.translationKz,
            translit: form.translit,
            imageUrl: card?.imageUrl,
            audioUrl: card?.audioUrl,
          })}
        />
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
            {isEdit ? 'Сохранить карточку' : 'Создать карточку'}
          </Button>
        </>
      }
    >
      <FormSection layout="stacked" title="Слово" divider={false}>
        <TextField
          label="Слово на арабском"
          required
          value={form.arabic}
          onChange={(e) => onChange({ ...form, arabic: e.target.value })}
          inputProps={arabicInputProps}
          error={touched && missingArabic}
          helperText={touched && missingArabic ? 'Введите слово' : undefined}
        />
        <TextField
          label="Транслитерация"
          value={form.translit}
          onChange={(e) => onChange({ ...form, translit: e.target.value })}
        />
      </FormSection>

      <FormSection layout="stacked" title="Перевод">
        <FieldPair>
          <TextField
            label="Перевод (RU)"
            required
            value={form.translationRu}
            onChange={(e) => onChange({ ...form, translationRu: e.target.value })}
            error={touched && missingRu}
            helperText={touched && missingRu ? 'Введите перевод' : undefined}
          />
          <TextField
            label="Перевод (KZ)"
            value={form.translationKz}
            onChange={(e) => onChange({ ...form, translationKz: e.target.value })}
            helperText={form.translationKz.trim() ? undefined : 'Без перевода KZ карточка показывается на русском'}
          />
        </FieldPair>
        <TextField
          label="Порядок в теме"
          type="number"
          value={form.orderIndex}
          onChange={(e) => onChange({ ...form, orderIndex: Number(e.target.value) })}
          sx={{ maxWidth: 200 }}
        />
      </FormSection>

      <FormSection layout="stacked" title="Изображение" description="Картинка на лицевой стороне карточки.">
        <ImageField
          url={card?.imageUrl}
          alt={card?.translationRu ?? ''}
          disabledReason={card ? undefined : 'Сначала создайте карточку — затем загрузите изображение.'}
          onUpload={(file) => (card ? onUploadImage(card, file) : Promise.resolve())}
        />
      </FormSection>

      <FormSection layout="stacked" title="Аудио произношения">
        <AudioField
          url={card?.audioUrl}
          label={card?.translationRu}
          disabledReason={card ? undefined : 'Сначала создайте карточку — затем загрузите аудио.'}
          onUpload={(file) => (card ? onUploadAudio(card, file) : Promise.resolve())}
        />
      </FormSection>
    </EditorDrawer>
  )
}
