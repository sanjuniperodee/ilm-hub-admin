import { useState } from 'react'
import { Button, CircularProgress, TextField } from '@mui/material'
import { ArabicText, FormSection, arabicInputProps } from '../../../components/ui'
import { AudioField, Completeness, EditorDrawer, FieldPair } from '../../words/shared'

export interface AllahName {
  id: string
  number: number
  nameAr: string
  nameRu: string
  nameKz?: string | null
  transliteration: string
  meaningRu: string
  meaningKz?: string | null
  descriptionRu?: string | null
  descriptionKz?: string | null
  audioUrl?: string | null
  isActive: boolean
}

export interface AllahNameForm {
  number: number
  nameAr: string
  nameRu: string
  nameKz: string
  transliteration: string
  meaningRu: string
  meaningKz: string
  descriptionRu: string
  descriptionKz: string
}

const has = (v?: string | null) => !!v && v.trim().length > 0

export function nameCompleteness(n: Pick<AllahName, 'nameRu' | 'meaningRu' | 'nameKz' | 'meaningKz' | 'descriptionRu' | 'descriptionKz' | 'audioUrl'>) {
  return [
    { label: 'RU', done: has(n.nameRu) && has(n.meaningRu) && has(n.descriptionRu) },
    { label: 'KZ', done: has(n.nameKz) && has(n.meaningKz) && has(n.descriptionKz) },
    { label: 'Аудио', done: has(n.audioUrl) },
  ]
}

export interface NameDrawerProps {
  open: boolean
  editing: AllahName | null
  form: AllahNameForm
  saving: boolean
  onChange: (form: AllahNameForm) => void
  onClose: () => void
  onSave: () => void
  onUploadAudio: (id: string, file: File) => Promise<unknown>
}

export function NameDrawer({ open, editing, form, saving, onChange, onClose, onSave, onUploadAudio }: NameDrawerProps) {
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof AllahNameForm>(k: K, v: AllahNameForm[K]) => onChange({ ...form, [k]: v })
  const missing = !form.nameAr.trim() || !form.nameRu.trim() || !form.transliteration.trim() || !form.meaningRu.trim()
  const err = (v: string) => touched && !v.trim()

  const submit = () => {
    setTouched(true)
    if (missing) return
    onSave()
  }

  return (
    <EditorDrawer
      open={open}
      onClose={() => {
        setTouched(false)
        onClose()
      }}
      title={editing ? `Имя №${editing.number}` : 'Новое имя'}
      subtitle={editing ? editing.nameRu : 'Аудио можно добавить после создания'}
      preview={
        form.nameAr.trim() ? (
          <ArabicText size="xl" weight={500} sx={{ display: 'block' }}>
            {form.nameAr}
          </ArabicText>
        ) : undefined
      }
      meta={
        editing ? (
          <Completeness variant="summary" items={nameCompleteness({ ...form, audioUrl: editing.audioUrl })} />
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
            {editing ? 'Сохранить имя' : 'Создать имя'}
          </Button>
        </>
      }
    >
      <FormSection layout="stacked" title="Имя" divider={false}>
        <FieldPair sx={{ gridTemplateColumns: { xs: '1fr', sm: '120px minmax(0, 1fr)' } }}>
          <TextField label="Номер" type="number" value={form.number} onChange={(e) => set('number', +e.target.value)} />
          <TextField
            label="Имя на арабском"
            required
            value={form.nameAr}
            onChange={(e) => set('nameAr', e.target.value)}
            inputProps={arabicInputProps}
            error={err(form.nameAr)}
            helperText={err(form.nameAr) ? 'Введите имя на арабском' : undefined}
          />
        </FieldPair>
        <TextField
          label="Транслитерация"
          required
          value={form.transliteration}
          onChange={(e) => set('transliteration', e.target.value)}
          error={err(form.transliteration)}
          helperText={err(form.transliteration) ? 'Введите транслитерацию' : 'Например ар-Рахман'}
        />
        <FieldPair>
          <TextField
            label="Имя (RU)"
            required
            value={form.nameRu}
            onChange={(e) => set('nameRu', e.target.value)}
            error={err(form.nameRu)}
            helperText={err(form.nameRu) ? 'Введите имя на русском' : undefined}
          />
          <TextField label="Имя (KZ)" value={form.nameKz} onChange={(e) => set('nameKz', e.target.value)} />
        </FieldPair>
      </FormSection>

      <FormSection layout="stacked" title="Значение" description="Короткий перевод — показывается под именем.">
        <FieldPair>
          <TextField
            label="Значение (RU)"
            required
            value={form.meaningRu}
            onChange={(e) => set('meaningRu', e.target.value)}
            multiline
            error={err(form.meaningRu)}
            helperText={err(form.meaningRu) ? 'Введите значение' : undefined}
          />
          <TextField label="Значение (KZ)" value={form.meaningKz} onChange={(e) => set('meaningKz', e.target.value)} multiline />
        </FieldPair>
      </FormSection>

      <FormSection layout="stacked" title="Описание" description="Подробное объяснение на экране имени.">
        <FieldPair>
          <TextField
            label="Описание (RU)"
            multiline
            minRows={4}
            value={form.descriptionRu}
            onChange={(e) => set('descriptionRu', e.target.value)}
          />
          <TextField
            label="Описание (KZ)"
            multiline
            minRows={4}
            value={form.descriptionKz}
            onChange={(e) => set('descriptionKz', e.target.value)}
          />
        </FieldPair>
      </FormSection>

      <FormSection layout="stacked" title="Аудио произношения">
        <AudioField
          url={editing?.audioUrl}
          label={editing?.nameRu}
          disabledReason={editing ? undefined : 'Сначала создайте имя — затем загрузите аудио.'}
          onUpload={(file) => (editing ? onUploadAudio(editing.id, file) : Promise.resolve())}
        />
      </FormSection>
    </EditorDrawer>
  )
}
