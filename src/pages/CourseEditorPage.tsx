import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import { SaveOutlined } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { getCourseById, updateCourse } from '../api/adminApi'
import {
  ErrorState,
  FormSection,
  KeyboardHint,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusChip,
  TopBarActions,
  getErrorMessage,
  useShellBreadcrumbs,
} from '../components/ui'
import { layout } from '../theme'
import { getCourseAccessRule } from './content-hub/accessRules'
import { ImageUrlField, LangColumnTitle, LanguageCompleteness, useSaveShortcut } from './content-hub/EditorParts'
import { useUnsavedChangesGuard } from './content-hub/useUnsavedChangesGuard'

interface CourseForm {
  code: string
  titleRu: string
  titleKz: string
  descriptionRu: string
  descriptionKz: string
  level: string
  orderIndex: number
  isPremium: boolean
  iconUrl: string
  coverImageUrl: string
}

const EMPTY_FORM: CourseForm = {
  code: '',
  titleRu: '',
  titleKz: '',
  descriptionRu: '',
  descriptionKz: '',
  level: '',
  orderIndex: 0,
  isPremium: false,
  iconUrl: '',
  coverImageUrl: '',
}

export default function CourseEditorPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [initial, setInitial] = useState<CourseForm>(EMPTY_FORM)
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM)

  const fetchCourse = useCallback(async () => {
    if (!courseId) return
    setLoading(true)
    setLoadError(null)
    try {
      const { data } = await getCourseById(courseId)
      const next: CourseForm = {
        code: data.code || '',
        titleRu: data.titleRu || '',
        titleKz: data.titleKz || '',
        descriptionRu: data.descriptionRu || '',
        descriptionKz: data.descriptionKz || '',
        level: data.level || '',
        orderIndex: data.orderIndex ?? 0,
        isPremium: !!data.isPremium,
        iconUrl: data.iconUrl || '',
        coverImageUrl: data.coverImageUrl || '',
      }
      setInitial(next)
      setForm(next)
    } catch (error) {
      setLoadError(error)
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    if (courseId) fetchCourse()
  }, [courseId, fetchCourse])

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial])
  const { allowNextNavigation } = useUnsavedChangesGuard(dirty && !saving)
  const set = <K extends keyof CourseForm>(key: K, value: CourseForm[K]) => setForm((p) => ({ ...p, [key]: value }))

  const errors = {
    code: !form.code.trim() ? 'Введите код курса' : null,
    titleRu: !form.titleRu.trim() ? 'Введите название на русском' : null,
  }
  const hasErrors = Object.values(errors).some(Boolean)

  const backPath = `/content/courses/${courseId}`

  const save = async () => {
    if (!courseId || saving) return
    setSubmitted(true)
    if (hasErrors) {
      setSaveError('Заполните обязательные поля.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await updateCourse(courseId, form)
      toast.success('Курс сохранён')
      setInitial(form)
      allowNextNavigation()
      navigate(backPath)
    } catch (error) {
      const msg = getErrorMessage(error, 'Не удалось сохранить курс')
      setSaveError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  useSaveShortcut(() => void save(), !loading && !loadError && dirty)

  useShellBreadcrumbs(
    !loading && !loadError && [
      { label: 'Курсы и уроки', to: '/content' },
      { label: initial.titleRu || 'Курс', to: backPath },
      { label: 'Настройки' },
    ],
  )

  if (loading) {
    return (
      <Box sx={{ maxWidth: layout.formMaxWidth + 120 }}>
        <PageHeader title="Настройки курса" backTo="/content" backLabel="К курсам" />
        <LoadingState variant="form" rows={6} />
      </Box>
    )
  }

  if (loadError) {
    return (
      <Box sx={{ maxWidth: layout.formMaxWidth + 120 }}>
        <PageHeader title="Настройки курса" backTo="/content" backLabel="К курсам" />
        <ErrorState title="Не удалось загрузить курс" error={loadError} onRetry={fetchCourse} />
      </Box>
    )
  }

  const rule = getCourseAccessRule(form.code)
  const ruFilled = [form.titleRu, form.descriptionRu].filter((v) => v.trim()).length
  const kzFilled = [form.titleKz, form.descriptionKz].filter((v) => v.trim()).length

  const saveButton = (size: 'small' | 'medium') => (
    <Button
      variant="contained"
      size={size}
      onClick={() => void save()}
      disabled={!dirty || saving}
      startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlined fontSize="small" />}
    >
      Сохранить курс
    </Button>
  )

  return (
    <Box sx={{ maxWidth: layout.formMaxWidth + 120 }}>
      <TopBarActions>
        {dirty && (
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' }, mr: 1 }}>
            Есть несохранённые изменения
          </Typography>
        )}
        {saveButton('small')}
      </TopBarActions>

      <PageHeader
        backTo={backPath}
        backLabel="К курсу"
        title={initial.titleRu || 'Настройки курса'}
        subtitle="Как курс называется и выглядит в приложении, его код и доступ."
        status={
          <Stack direction="row" spacing={0.75} alignItems="center">
            <StatusChip size="small" status={form.isPremium ? 'premium' : 'free'} />
            {dirty && <StatusChip size="small" tone="warning" label="Не сохранено" />}
          </Stack>
        }
        actions={
          <>
            <Button variant="outlined" onClick={() => navigate(backPath)} disabled={saving}>
              Отмена
            </Button>
            {saveButton('medium')}
          </>
        }
      />

      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}

      <Box component="form" noValidate onSubmit={(e: React.FormEvent) => { e.preventDefault(); void save() }}>
        <SectionCard
          footer={
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'flex' } }}>
                <KeyboardHint keys={['Mod', 'S']} />
                <Typography variant="caption">сохранить</Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={() => navigate(backPath)} disabled={saving}>
                  Отмена
                </Button>
                <Button type="submit" variant="contained" disabled={!dirty || saving}>
                  Сохранить курс
                </Button>
              </Stack>
            </Stack>
          }
        >
          <FormSection
            title="Основное"
            description="Код связывает курс с правилами бесплатных уроков, тестом уровня и входным тестом."
            divider={false}
          >
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' } }}>
              <TextField
                fullWidth
                required
                label="Код"
                value={form.code}
                onChange={(e) => set('code', e.target.value)}
                error={submitted && !!errors.code}
                helperText={(submitted && errors.code) || 'Например a1, a2, mahraj, tajweed'}
                inputProps={{ spellCheck: false, autoCapitalize: 'none' }}
              />
              <TextField
                fullWidth
                label="Уровень"
                value={form.level}
                onChange={(e) => set('level', e.target.value)}
                helperText="Например A1"
              />
              <TextField
                fullWidth
                label="Порядок"
                type="number"
                value={form.orderIndex}
                onChange={(e) => set('orderIndex', Number(e.target.value) || 0)}
                helperText="Позиция в списке"
              />
            </Box>
          </FormSection>

          <FormSection
            title="Названия и описания"
            description={
              <Stack spacing={1} component="span">
                <span>Русская версия обязательна. Без казахской приложение покажет русский текст.</span>
                <LanguageCompleteness
                  langs={[
                    { code: 'RU', fields: [form.titleRu, form.descriptionRu] },
                    { code: 'KZ', fields: [form.titleKz, form.descriptionKz] },
                  ]}
                />
              </Stack>
            }
          >
            <Box sx={{ display: 'grid', gap: { xs: 3, md: 2.5 }, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <Box>
                <LangColumnTitle code="RU" name="Русский" filled={ruFilled} total={2} />
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    required
                    label="Название (RU)"
                    value={form.titleRu}
                    onChange={(e) => set('titleRu', e.target.value)}
                    error={submitted && !!errors.titleRu}
                    helperText={submitted && errors.titleRu}
                  />
                  <TextField fullWidth multiline minRows={4} label="Описание (RU)" value={form.descriptionRu} onChange={(e) => set('descriptionRu', e.target.value)} />
                </Stack>
              </Box>
              <Box>
                <LangColumnTitle code="KZ" name="Казахский" filled={kzFilled} total={2} />
                <Stack spacing={2}>
                  <TextField fullWidth label="Название (KZ)" value={form.titleKz} onChange={(e) => set('titleKz', e.target.value)} placeholder={form.titleRu || undefined} />
                  <TextField fullWidth multiline minRows={4} label="Описание (KZ)" value={form.descriptionKz} onChange={(e) => set('descriptionKz', e.target.value)} />
                </Stack>
              </Box>
            </Box>
          </FormSection>

          <FormSection
            title="Оформление"
            description="Ссылки на изображения в хранилище. Предпросмотр обновляется сразу."
          >
            <Stack spacing={2}>
              <ImageUrlField
                label="Иконка (URL)"
                value={form.iconUrl}
                onChange={(v) => set('iconUrl', v)}
                helperText="Квадратное изображение, PNG или SVG"
              />
              <ImageUrlField
                label="Обложка (URL)"
                value={form.coverImageUrl}
                onChange={(v) => set('coverImageUrl', v)}
                helperText="Горизонтальное изображение 16:9"
                aspect="16 / 9"
                previewWidth={128}
              />
            </Stack>
          </FormSection>

          <FormSection title="Доступ" description="Бесплатные и платные уроки определяются правилом для кода курса и флагами уроков.">
            <Stack spacing={1.5}>
              <FormControlLabel
                control={<Switch checked={form.isPremium} onChange={(e) => set('isPremium', e.target.checked)} />}
                label="Premium-курс"
              />
              <Alert severity="info" variant="outlined" icon={false} sx={{ bgcolor: 'background.paper' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{rule.summary}</Typography>
                <Typography variant="body2" color="text.secondary">{rule.details}</Typography>
              </Alert>
            </Stack>
          </FormSection>
        </SectionCard>
      </Box>
    </Box>
  )
}
