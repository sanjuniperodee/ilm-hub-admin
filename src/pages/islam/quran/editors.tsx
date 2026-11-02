import { useState } from 'react'
import { Box, Button, CircularProgress, MenuItem, TextField } from '@mui/material'
import { ArabicText, FormSection, arabicInputProps } from '../../../components/ui'
import { Completeness, EditorDrawer, FieldPair } from '../../words/shared'
import { REVELATION_LABEL, type AyahForm, type SurahForm, type SurahItem } from './model'

interface BaseProps<F> {
  open: boolean
  isEdit: boolean
  form: F
  saving: boolean
  onChange: (form: F) => void
  onClose: () => void
  onSave: () => void
}

export function SurahDrawer({ open, isEdit, form, saving, onChange, onClose, onSave }: BaseProps<SurahForm>) {
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof SurahForm>(k: K, v: SurahForm[K]) => onChange({ ...form, [k]: v })
  const err = (v: string) => touched && !v.trim()
  const missing = !form.nameAr.trim() || !form.nameRu.trim() || !form.transliteration.trim()

  return (
    <EditorDrawer
      open={open}
      onClose={() => {
        setTouched(false)
        onClose()
      }}
      title={isEdit ? `Сура ${form.number}. ${form.nameRu}` : 'Новая сура'}
      subtitle="Название и сведения о суре"
      preview={
        form.nameAr.trim() ? (
          <ArabicText size="xl" weight={500} sx={{ display: 'block' }}>
            {form.nameAr}
          </ArabicText>
        ) : undefined
      }
      meta={
        <Completeness
          items={[
            { label: 'RU', done: !!form.nameRu.trim() },
            { label: 'KZ', done: !!form.nameKz.trim() },
          ]}
        />
      }
      footer={
        <>
          <Button variant="outlined" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={() => {
              setTouched(true)
              if (!missing) onSave()
            }}
          >
            {isEdit ? 'Сохранить суру' : 'Создать суру'}
          </Button>
        </>
      }
    >
      <FormSection layout="stacked" title="Название" divider={false}>
        <FieldPair sx={{ gridTemplateColumns: { xs: '1fr', sm: '120px minmax(0, 1fr)' } }}>
          <TextField label="Номер" type="number" value={form.number} onChange={(e) => set('number', +e.target.value)} />
          <TextField
            label="Название на арабском"
            required
            value={form.nameAr}
            onChange={(e) => set('nameAr', e.target.value)}
            inputProps={arabicInputProps}
            error={err(form.nameAr)}
            helperText={err(form.nameAr) ? 'Введите название' : undefined}
          />
        </FieldPair>
        <TextField
          label="Транслитерация"
          required
          value={form.transliteration}
          onChange={(e) => set('transliteration', e.target.value)}
          error={err(form.transliteration)}
          helperText={err(form.transliteration) ? 'Введите транслитерацию' : 'Например Аль-Фатиха'}
        />
        <FieldPair>
          <TextField
            label="Название (RU)"
            required
            value={form.nameRu}
            onChange={(e) => set('nameRu', e.target.value)}
            error={err(form.nameRu)}
            helperText={err(form.nameRu) ? 'Введите название' : undefined}
          />
          <TextField label="Название (KZ)" value={form.nameKz} onChange={(e) => set('nameKz', e.target.value)} />
        </FieldPair>
      </FormSection>

      <FormSection layout="stacked" title="Сведения">
        <TextField
          select
          label="Место ниспослания"
          value={form.revelationType}
          onChange={(e) => set('revelationType', e.target.value as SurahForm['revelationType'])}
        >
          <MenuItem value="meccan">{REVELATION_LABEL.meccan}</MenuItem>
          <MenuItem value="medinan">{REVELATION_LABEL.medinan}</MenuItem>
        </TextField>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' } }}>
          <TextField label="Количество аятов" type="number" value={form.ayahCount} onChange={(e) => set('ayahCount', +e.target.value)} />
          <TextField label="Джуз" type="number" value={form.juzNumber} onChange={(e) => set('juzNumber', +e.target.value)} />
          <TextField label="Страница" type="number" value={form.pageNumber} onChange={(e) => set('pageNumber', +e.target.value)} />
        </Box>
      </FormSection>
    </EditorDrawer>
  )
}

export function AyahDrawer({
  open,
  isEdit,
  form,
  saving,
  onChange,
  onClose,
  onSave,
  surah,
}: BaseProps<AyahForm> & { surah: SurahItem | null }) {
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof AyahForm>(k: K, v: AyahForm[K]) => onChange({ ...form, [k]: v })
  const missingText = !form.textAr.trim()

  return (
    <EditorDrawer
      open={open}
      width={720}
      onClose={() => {
        setTouched(false)
        onClose()
      }}
      title={isEdit ? `Аят ${form.number}` : 'Новый аят'}
      subtitle={surah ? `Сура ${surah.number}. ${surah.nameRu}` : undefined}
      meta={
        <Completeness
          items={[
            { label: 'Текст', done: !missingText },
            { label: 'RU', done: !!form.translationRu.trim() },
            { label: 'KZ', done: !!form.translationKz.trim() },
          ]}
        />
      }
      footer={
        <>
          <Button variant="outlined" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={() => {
              setTouched(true)
              if (!missingText) onSave()
            }}
          >
            {isEdit ? 'Сохранить аят' : 'Создать аят'}
          </Button>
        </>
      }
    >
      <FormSection layout="stacked" title="Текст аята" divider={false}>
        <TextField
          label="Номер аята"
          type="number"
          value={form.number}
          onChange={(e) => set('number', +e.target.value)}
          sx={{ maxWidth: 200 }}
        />
        <TextField
          label="Текст на арабском"
          required
          multiline
          minRows={4}
          value={form.textAr}
          onChange={(e) => set('textAr', e.target.value)}
          inputProps={{ ...arabicInputProps, style: { ...arabicInputProps.style, fontSize: '1.75rem', lineHeight: 2 } }}
          error={touched && missingText}
          helperText={touched && missingText ? 'Введите текст аята' : 'Вставьте текст с харакатами без изменений'}
        />
      </FormSection>
      <FormSection layout="stacked" title="Перевод">
        <TextField
          label="Перевод (RU)"
          multiline
          minRows={3}
          value={form.translationRu}
          onChange={(e) => set('translationRu', e.target.value)}
        />
        <TextField
          label="Перевод (KZ)"
          multiline
          minRows={3}
          value={form.translationKz}
          onChange={(e) => set('translationKz', e.target.value)}
        />
      </FormSection>
    </EditorDrawer>
  )
}
