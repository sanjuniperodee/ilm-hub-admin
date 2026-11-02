import { useState, type ReactNode } from 'react'
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { ArabicText, FormSection, arabicInputProps } from '../../../components/ui'
import { dialogActionsSafeAreaSx, useNarrowDialogProps } from '../../../hooks/useNarrowDialogProps'
import { AudioField, Completeness, EditorDrawer, FieldPair } from '../../words/shared'
import { instructionKzGaps, parseLines, type ChecklistForm, type HajjPhrase, type InstructionForm, type PhraseForm, type SectionForm } from './model'

interface BaseProps<F> {
  open: boolean
  isEdit: boolean
  form: F
  saving: boolean
  onChange: (form: F) => void
  onClose: () => void
  onSave: () => void
}

function SaveFooter({ saving, label, onClose, onSave }: { saving: boolean; label: string; onClose: () => void; onSave: () => void }) {
  return (
    <>
      <Button variant="outlined" onClick={onClose}>
        Отмена
      </Button>
      <Button
        variant="contained"
        onClick={onSave}
        disabled={saving}
        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
      >
        {label}
      </Button>
    </>
  )
}

const CHECK_HINT = 'По пункту на строку. «[x]» в начале строки — пункт отмечен по умолчанию.'

/** Line count hint under a KZ textarea so translators keep lines aligned with RU. */
function linesHint(ru: string, kz: string): ReactNode {
  const r = parseLines(ru).length
  const k = parseLines(kz).length
  if (!r) return 'По пункту на строку, в том же порядке, что RU'
  if (k === r) return `Строк: ${k} из ${r}`
  return (
    <Typography component="span" variant="caption" sx={{ color: 'warning.dark' }}>
      Строк: {k} из {r} — переведите каждую строку RU
    </Typography>
  )
}

/* ---------------- section ---------------- */

export function SectionDialog({ open, isEdit, form, saving, onChange, onClose, onSave }: BaseProps<SectionForm>) {
  const narrow = useNarrowDialogProps('sm')
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof SectionForm>(k: K, v: SectionForm[K]) => onChange({ ...form, [k]: v })
  const missing = !form.code.trim() || !form.titleRu.trim()
  return (
    <Dialog open={open} onClose={onClose} {...narrow} TransitionProps={{ onEnter: () => setTouched(false) }} aria-labelledby="hajj-section-title">
      <DialogTitle id="hajj-section-title">{isEdit ? 'Изменить раздел' : 'Новый раздел'}</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ pt: 1 }}>
          <FieldPair>
            <TextField
              label="Код"
              required
              value={form.code}
              onChange={(e) => set('code', e.target.value)}
              error={touched && !form.code.trim()}
              helperText={touched && !form.code.trim() ? 'Укажите код' : 'Латиницей: on_road, in_mecca'}
            />
            <TextField label="Эмодзи" value={form.emoji} onChange={(e) => set('emoji', e.target.value)} />
          </FieldPair>
          <FieldPair>
            <TextField
              label="Название (RU)"
              required
              value={form.titleRu}
              onChange={(e) => set('titleRu', e.target.value)}
              error={touched && !form.titleRu.trim()}
              helperText={touched && !form.titleRu.trim() ? 'Введите название' : undefined}
            />
            <TextField label="Название (KZ)" value={form.titleKz} onChange={(e) => set('titleKz', e.target.value)} />
          </FieldPair>
          <TextField label="Порядок" type="number" value={form.orderIndex} onChange={(e) => set('orderIndex', +e.target.value)} sx={{ maxWidth: 200 }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={dialogActionsSafeAreaSx}>
        <SaveFooter
          saving={saving}
          label={isEdit ? 'Сохранить раздел' : 'Создать раздел'}
          onClose={onClose}
          onSave={() => {
            setTouched(true)
            if (!missing) onSave()
          }}
        />
      </DialogActions>
    </Dialog>
  )
}

/* ---------------- instruction ---------------- */

export function InstructionDrawer({ open, isEdit, form, saving, onChange, onClose, onSave }: BaseProps<InstructionForm>) {
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof InstructionForm>(k: K, v: InstructionForm[K]) => onChange({ ...form, [k]: v })
  const gaps = instructionKzGaps(form)
  const missingTitle = !form.titleRu.trim()

  return (
    <EditorDrawer
      open={open}
      width={760}
      onClose={() => {
        setTouched(false)
        onClose()
      }}
      title={isEdit ? `Инструкция «${form.titleRu || 'без названия'}»` : 'Новая инструкция'}
      subtitle={form.isHighlight ? 'Выделенная заметка' : form.stepNumber ? `Шаг ${form.stepNumber}` : 'Заметка без номера шага'}
      meta={
        <Completeness
          items={[
            { label: 'RU', done: !missingTitle },
            { label: gaps.total ? `KZ ${gaps.done} из ${gaps.total}` : 'KZ', done: gaps.total > 0 && gaps.done === gaps.total },
          ]}
        />
      }
      footer={
        <SaveFooter
          saving={saving}
          label={isEdit ? 'Сохранить инструкцию' : 'Создать инструкцию'}
          onClose={onClose}
          onSave={() => {
            setTouched(true)
            if (!missingTitle) onSave()
          }}
        />
      }
    >
      <FormSection layout="stacked" title="Шаг" divider={false}>
        <FieldPair>
          <TextField
            label="Номер шага"
            type="number"
            value={form.stepNumber}
            onChange={(e) => set('stepNumber', +e.target.value)}
            helperText="0 — заметка без номера"
          />
          <TextField
            label="Порядок"
            type="number"
            value={form.orderIndex}
            onChange={(e) => set('orderIndex', +e.target.value)}
            helperText="Проще менять перетаскиванием в списке"
          />
        </FieldPair>
        <FormControlLabel
          control={<Switch checked={form.isHighlight} onChange={(e) => set('isHighlight', e.target.checked)} />}
          label="Выделенная заметка"
        />
      </FormSection>

      <FormSection layout="stacked" title="Заголовок и описание">
        <FieldPair>
          <TextField
            label="Заголовок (RU)"
            required
            value={form.titleRu}
            onChange={(e) => set('titleRu', e.target.value)}
            error={touched && missingTitle}
            helperText={touched && missingTitle ? 'Введите заголовок' : undefined}
          />
          <TextField label="Заголовок (KZ)" value={form.titleKz} onChange={(e) => set('titleKz', e.target.value)} />
          <TextField label="Описание (RU)" multiline minRows={3} value={form.descriptionRu} onChange={(e) => set('descriptionRu', e.target.value)} />
          <TextField label="Описание (KZ)" multiline minRows={3} value={form.descriptionKz} onChange={(e) => set('descriptionKz', e.target.value)} />
          <TextField label="Бейдж (RU)" value={form.badgeRu} onChange={(e) => set('badgeRu', e.target.value)} helperText="Например «Новое»" />
          <TextField label="Бейдж (KZ)" value={form.badgeKz} onChange={(e) => set('badgeKz', e.target.value)} />
        </FieldPair>
      </FormSection>

      <FormSection layout="stacked" title="Пункты инструкции" description={CHECK_HINT}>
        <FieldPair>
          <TextField label="Пункты (RU)" multiline minRows={4} value={form.itemsRu} onChange={(e) => set('itemsRu', e.target.value)} />
          <TextField
            label="Пункты (KZ)"
            multiline
            minRows={4}
            value={form.itemsKz}
            onChange={(e) => set('itemsKz', e.target.value)}
            helperText={linesHint(form.itemsRu, form.itemsKz)}
          />
        </FieldPair>
      </FormSection>

      <FormSection layout="stacked" title="Предупреждение" description="Блок «нельзя» — показывается отдельной плашкой.">
        <FieldPair>
          <TextField label="Заголовок (RU)" value={form.warningTitleRu} onChange={(e) => set('warningTitleRu', e.target.value)} />
          <TextField label="Заголовок (KZ)" value={form.warningTitleKz} onChange={(e) => set('warningTitleKz', e.target.value)} />
          <TextField
            label="Пункты (RU)"
            multiline
            minRows={3}
            value={form.warningItemsRu}
            onChange={(e) => set('warningItemsRu', e.target.value)}
            helperText="По пункту на строку"
          />
          <TextField
            label="Пункты (KZ)"
            multiline
            minRows={3}
            value={form.warningItemsKz}
            onChange={(e) => set('warningItemsKz', e.target.value)}
            helperText={linesHint(form.warningItemsRu, form.warningItemsKz)}
          />
        </FieldPair>
      </FormSection>

      <FormSection layout="stacked" title="Разрешено" description="Блок «можно» — показывается отдельной плашкой.">
        <FieldPair>
          <TextField label="Заголовок (RU)" value={form.successTitleRu} onChange={(e) => set('successTitleRu', e.target.value)} />
          <TextField label="Заголовок (KZ)" value={form.successTitleKz} onChange={(e) => set('successTitleKz', e.target.value)} />
          <TextField
            label="Пункты (RU)"
            multiline
            minRows={3}
            value={form.successItemsRu}
            onChange={(e) => set('successItemsRu', e.target.value)}
            helperText="По пункту на строку"
          />
          <TextField
            label="Пункты (KZ)"
            multiline
            minRows={3}
            value={form.successItemsKz}
            onChange={(e) => set('successItemsKz', e.target.value)}
            helperText={linesHint(form.successItemsRu, form.successItemsKz)}
          />
        </FieldPair>
      </FormSection>
    </EditorDrawer>
  )
}

/* ---------------- phrase ---------------- */

export function PhraseDrawer({
  open,
  isEdit,
  form,
  saving,
  onChange,
  onClose,
  onSave,
  phrase,
  onUploadAudio,
}: BaseProps<PhraseForm> & { phrase: HajjPhrase | null; onUploadAudio: (p: HajjPhrase, file: File) => Promise<unknown> }) {
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof PhraseForm>(k: K, v: PhraseForm[K]) => onChange({ ...form, [k]: v })
  const missing = !form.textAr.trim() || !form.translationRu.trim()

  return (
    <EditorDrawer
      open={open}
      width={680}
      onClose={() => {
        setTouched(false)
        onClose()
      }}
      title={isEdit ? `Фраза «${form.titleRu || form.translationRu || 'без названия'}»` : 'Новая фраза'}
      subtitle={isEdit ? 'Арабский текст, перевод и аудио' : 'Аудио можно добавить после создания'}
      preview={
        form.textAr.trim() ? (
          <ArabicText size="lg" weight={500} sx={{ display: 'block' }}>
            {form.textAr}
          </ArabicText>
        ) : undefined
      }
      meta={
        <Completeness
          items={[
            { label: 'RU', done: !!form.translationRu.trim() },
            { label: 'KZ', done: !!form.translationKz.trim() },
            { label: 'Аудио', done: !!phrase?.audioUrl },
          ]}
        />
      }
      footer={
        <SaveFooter
          saving={saving}
          label={isEdit ? 'Сохранить фразу' : 'Создать фразу'}
          onClose={onClose}
          onSave={() => {
            setTouched(true)
            if (!missing) onSave()
          }}
        />
      }
    >
      <FormSection layout="stacked" title="Фраза" divider={false}>
        <TextField
          label="Текст на арабском"
          required
          multiline
          minRows={2}
          value={form.textAr}
          onChange={(e) => set('textAr', e.target.value)}
          inputProps={arabicInputProps}
          error={touched && !form.textAr.trim()}
          helperText={touched && !form.textAr.trim() ? 'Введите текст фразы' : undefined}
        />
        <TextField label="Транслитерация" value={form.transliteration} onChange={(e) => set('transliteration', e.target.value)} />
      </FormSection>
      <FormSection layout="stacked" title="Перевод и название">
        <FieldPair>
          <TextField
            label="Перевод (RU)"
            required
            multiline
            value={form.translationRu}
            onChange={(e) => set('translationRu', e.target.value)}
            error={touched && !form.translationRu.trim()}
            helperText={touched && !form.translationRu.trim() ? 'Введите перевод' : undefined}
          />
          <TextField label="Перевод (KZ)" multiline value={form.translationKz} onChange={(e) => set('translationKz', e.target.value)} />
          <TextField label="Название (RU)" value={form.titleRu} onChange={(e) => set('titleRu', e.target.value)} helperText="Например «Тальбия»" />
          <TextField label="Название (KZ)" value={form.titleKz} onChange={(e) => set('titleKz', e.target.value)} />
        </FieldPair>
        <TextField label="Порядок" type="number" value={form.orderIndex} onChange={(e) => set('orderIndex', +e.target.value)} sx={{ maxWidth: 200 }} />
      </FormSection>
      <FormSection layout="stacked" title="Аудио">
        <AudioField
          url={phrase?.audioUrl}
          label={form.titleRu || form.translationRu}
          disabledReason={phrase ? undefined : 'Сначала создайте фразу — затем загрузите аудио.'}
          onUpload={(file) => (phrase ? onUploadAudio(phrase, file) : Promise.resolve())}
        />
      </FormSection>
    </EditorDrawer>
  )
}

/* ---------------- checklist ---------------- */

export function ChecklistDrawer({ open, isEdit, form, saving, onChange, onClose, onSave }: BaseProps<ChecklistForm>) {
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof ChecklistForm>(k: K, v: ChecklistForm[K]) => onChange({ ...form, [k]: v })
  const ru = parseLines(form.itemsRu).length
  const kz = parseLines(form.itemsKz).length
  const missing = !form.titleRu.trim()

  return (
    <EditorDrawer
      open={open}
      width={720}
      onClose={() => {
        setTouched(false)
        onClose()
      }}
      title={isEdit ? `Чек-лист «${form.titleRu || 'без названия'}»` : 'Новый чек-лист'}
      subtitle={`${ru} пунктов`}
      meta={
        <Completeness
          items={[
            { label: 'RU', done: !missing && ru > 0 },
            { label: 'KZ', done: !!form.titleKz.trim() && ru > 0 && kz >= ru },
          ]}
        />
      }
      footer={
        <SaveFooter
          saving={saving}
          label={isEdit ? 'Сохранить чек-лист' : 'Создать чек-лист'}
          onClose={onClose}
          onSave={() => {
            setTouched(true)
            if (!missing) onSave()
          }}
        />
      }
    >
      <FormSection layout="stacked" title="Чек-лист" divider={false}>
        <FieldPair>
          <TextField
            label="Название (RU)"
            required
            value={form.titleRu}
            onChange={(e) => set('titleRu', e.target.value)}
            error={touched && missing}
            helperText={touched && missing ? 'Введите название' : undefined}
          />
          <TextField label="Название (KZ)" value={form.titleKz} onChange={(e) => set('titleKz', e.target.value)} />
          <TextField label="Эмодзи" value={form.emoji} onChange={(e) => set('emoji', e.target.value)} />
          <TextField label="Порядок" type="number" value={form.orderIndex} onChange={(e) => set('orderIndex', +e.target.value)} />
        </FieldPair>
        <FormControlLabel control={<Switch checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />} label="Показывать в приложении" />
      </FormSection>
      <FormSection layout="stacked" title="Пункты" description={CHECK_HINT}>
        <FieldPair>
          <TextField label="Пункты (RU)" multiline minRows={8} value={form.itemsRu} onChange={(e) => set('itemsRu', e.target.value)} />
          <TextField
            label="Пункты (KZ)"
            multiline
            minRows={8}
            value={form.itemsKz}
            onChange={(e) => set('itemsKz', e.target.value)}
            helperText={linesHint(form.itemsRu, form.itemsKz)}
          />
        </FieldPair>
      </FormSection>
    </EditorDrawer>
  )
}
