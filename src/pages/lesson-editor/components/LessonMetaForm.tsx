import { Box, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material'
import { FormSection, SectionCard } from '../../../components/ui'
import { layout } from '../../../theme'

export interface LessonMetaFormProps {
  draft: Record<string, any>
  onChange: (patch: Record<string, any>) => void
  courses: any[]
  modules: any[]
  dirty: boolean
}

/** Lesson settings: placement, names, description, access. Saved with the top-bar «Сохранить». */
export function LessonMetaForm({ draft, onChange, courses, modules, dirty }: LessonMetaFormProps) {
  return (
    <Box sx={{ maxWidth: layout.formMaxWidth + 160 }}>
      <SectionCard
        title="Параметры урока"
        description={dirty ? 'Есть несохранённые изменения — сохраните кнопкой «Сохранить» вверху или Ctrl/⌘+S.' : 'Как урок выглядит в списке и кому он доступен.'}
      >
        <FormSection title="Название" description="Видно в списке уроков модуля." divider={false}>
          <TextField fullWidth required label="Название (RU)" value={draft.titleRu || ''} onChange={(e) => onChange({ titleRu: e.target.value })} error={!String(draft.titleRu || '').trim()} helperText={!String(draft.titleRu || '').trim() ? 'Введите название урока' : undefined} />
          <TextField fullWidth label="Название (KZ)" value={draft.titleKz || ''} onChange={(e) => onChange({ titleKz: e.target.value })} placeholder={draft.titleRu ? `RU: ${draft.titleRu}` : undefined} InputLabelProps={draft.titleRu ? { shrink: true } : undefined} />
        </FormSection>
        <FormSection title="Описание" description="Короткий анонс под названием.">
          <TextField fullWidth multiline minRows={3} label="Описание (RU)" value={draft.descriptionRu || ''} onChange={(e) => onChange({ descriptionRu: e.target.value })} />
          <TextField fullWidth multiline minRows={3} label="Описание (KZ)" value={draft.descriptionKz || ''} onChange={(e) => onChange({ descriptionKz: e.target.value })} />
        </FormSection>
        <FormSection title="Размещение" description="Курс, модуль и место урока в списке.">
          <TextField select fullWidth label="Курс" value={draft.courseId || ''} onChange={(e) => onChange({ courseId: e.target.value })}>
            {courses.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.titleRu} ({c.code})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label="Модуль"
            value={draft.moduleId || ''}
            onChange={(e) => onChange({ moduleId: e.target.value || undefined })}
            SelectProps={{ displayEmpty: true }}
            InputLabelProps={{ shrink: true }}
            helperText="Список модулей текущего курса урока"
          >
            <MenuItem value="">Без модуля</MenuItem>
            {modules.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.titleRu}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
            <TextField
              type="number"
              label="Порядок в списке"
              value={draft.orderIndex ?? 0}
              onChange={(e) => onChange({ orderIndex: Number(e.target.value) || 0 })}
              sx={{ flex: 1 }}
            />
            <TextField
              type="number"
              label="Длительность, мин"
              value={draft.estimatedMinutes ?? 10}
              onChange={(e) => onChange({ estimatedMinutes: Number(e.target.value) || 10 })}
              helperText="Примерное время прохождения"
              inputProps={{ min: 1 }}
              sx={{ flex: 1 }}
            />
          </Stack>
        </FormSection>
        <FormSection title="Доступ">
          <FormControlLabel
            sx={{ alignItems: 'flex-start', m: 0, gap: 1 }}
            control={<Switch checked={!!draft.isPremium} onChange={(e) => onChange({ isPremium: e.target.checked })} sx={{ mt: -0.75 }} />}
            label={
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Premium-урок
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Доступен только по подписке. Правила курса (например, бесплатные первые уроки) могут открыть его и без подписки.
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            sx={{ alignItems: 'flex-start', m: 0, gap: 1 }}
            control={<Switch checked={!!draft.isTest} onChange={(e) => onChange({ isTest: e.target.checked })} sx={{ mt: -0.75 }} />}
            label={
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Тестовый урок
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Урок-проверка знаний
                </Typography>
              </Box>
            }
          />
        </FormSection>
      </SectionCard>
    </Box>
  )
}
