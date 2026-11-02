import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import { Alert, Box, TextField, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { QuizOutlined, SaveOutlined } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getCourses, getModuleById, updateModule } from '../api/adminApi'
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
import { LangColumnTitle, LanguageCompleteness, useSaveShortcut } from './content-hub/EditorParts'
import { useUnsavedChangesGuard } from './content-hub/useUnsavedChangesGuard'

interface ModuleForm {
  titleRu: string
  titleKz: string
  descriptionRu: string
  descriptionKz: string
  orderIndex: number
}

const EMPTY_FORM: ModuleForm = {
  titleRu: '',
  titleKz: '',
  descriptionRu: '',
  descriptionKz: '',
  orderIndex: 0,
}

export default function ModuleEditorPage() {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [initial, setInitial] = useState<ModuleForm>(EMPTY_FORM)
  const [form, setForm] = useState<ModuleForm>(EMPTY_FORM)

  // Shares the content hub cache — used only for the course name in breadcrumbs.
  const { data: coursesRes } = useQuery({ queryKey: ['hub', 'courses'], queryFn: getCourses })
  const courseTitle: string | undefined = (Array.isArray(coursesRes?.data) ? coursesRes.data : []).find(
    (c: any) => c.id === courseId,
  )?.titleRu

  const fetchModule = useCallback(async () => {
    if (!moduleId) return
    setLoading(true)
    setLoadError(null)
    try {
      const { data } = await getModuleById(moduleId)
      const next: ModuleForm = {
        titleRu: data.titleRu || '',
        titleKz: data.titleKz || '',
        descriptionRu: data.descriptionRu || '',
        descriptionKz: data.descriptionKz || '',
        orderIndex: data.orderIndex ?? 0,
      }
      setInitial(next)
      setForm(next)
    } catch (error) {
      setLoadError(error)
    } finally {
      setLoading(false)
    }
  }, [moduleId])

  useEffect(() => {
    if (moduleId) fetchModule()
  }, [moduleId, fetchModule])

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial])
  const { allowNextNavigation } = useUnsavedChangesGuard(dirty && !saving)
  const set = <K extends keyof ModuleForm>(key: K, value: ModuleForm[K]) => setForm((p) => ({ ...p, [key]: value }))

  const titleError = !form.titleRu.trim() ? 'Введите название на русском' : null
  const backPath = `/content/courses/${courseId}/modules/${moduleId}`

  const save = async () => {
    if (!moduleId || !courseId || saving) return
    setSubmitted(true)
    if (titleError) {
      setSaveError('Заполните обязательные поля.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await updateModule(moduleId, form)
      toast.success('Модуль сохранён')
      setInitial(form)
      allowNextNavigation()
      navigate(backPath)
    } catch (error) {
      const msg = getErrorMessage(error, 'Не удалось сохранить модуль')
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
      { label: courseTitle || 'Курс', to: `/content/courses/${courseId}` },
      { label: initial.titleRu || 'Модуль', to: backPath },
      { label: 'Настройки' },
    ],
  )

  if (loading) {
    return (
      <Box sx={{ maxWidth: layout.formMaxWidth + 120 }}>
        <PageHeader title="Настройки модуля" backTo={`/content/courses/${courseId}`} backLabel="К курсу" />
        <LoadingState variant="form" rows={4} />
      </Box>
    )
  }

  if (loadError) {
    return (
      <Box sx={{ maxWidth: layout.formMaxWidth + 120 }}>
        <PageHeader title="Настройки модуля" backTo={`/content/courses/${courseId}`} backLabel="К курсу" />
        <ErrorState title="Не удалось загрузить модуль" error={loadError} onRetry={fetchModule} />
      </Box>
    )
  }

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
      Сохранить модуль
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
        backLabel="К модулю"
        title={initial.titleRu || 'Настройки модуля'}
        subtitle={courseTitle ? `Модуль курса «${courseTitle}»` : 'Название, описание и позиция модуля в курсе.'}
        status={dirty ? <StatusChip size="small" tone="warning" label="Не сохранено" /> : undefined}
        actions={
          <>
            <Button
              variant="outlined"
              component={RouterLink}
              to={`/content/courses/${courseId}/modules/${moduleId}/test`}
              startIcon={<QuizOutlined fontSize="small" />}
            >
              Тест модуля
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
                  Сохранить модуль
                </Button>
              </Stack>
            </Stack>
          }
        >
          <FormSection
            title="Названия и описания"
            divider={false}
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
                    error={submitted && !!titleError}
                    helperText={submitted && titleError}
                  />
                  <TextField fullWidth multiline minRows={4} label="Описание (RU)" value={form.descriptionRu} onChange={(e) => set('descriptionRu', e.target.value)} />
                </Stack>
              </Box>
              <Box>
                <LangColumnTitle code="KZ" name="Казахский" filled={kzFilled} total={2} />
                <Stack spacing={2}>
                  <TextField fullWidth label="Название (KZ)" value={form.titleKz} onChange={(e) => set('titleKz', e.target.value)} />
                  <TextField fullWidth multiline minRows={4} label="Описание (KZ)" value={form.descriptionKz} onChange={(e) => set('descriptionKz', e.target.value)} />
                </Stack>
              </Box>
            </Box>
          </FormSection>

          <FormSection title="Позиция" description="Обычно порядок меняют перетаскиванием модулей в списке курса.">
            <TextField
              label="Порядок"
              type="number"
              value={form.orderIndex}
              onChange={(e) => set('orderIndex', Number(e.target.value) || 0)}
              sx={{ maxWidth: 200 }}
            />
          </FormSection>
        </SectionCard>
      </Box>
    </Box>
  )
}
