import { Box, Divider, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import type { ReactNode } from 'react'
import { mergeSx } from './sx'

export interface FormSectionProps {
  /** Group name: «Основное», «Медиа», «Доступ». */
  title: ReactNode
  /** What these fields affect, in the user's terms. */
  description?: ReactNode
  /**
   * `aside` — title/description in a left column, fields on the right once the section itself
   * is ≥ 720px wide (container query, so it also works inside narrow cards and dialogs).
   * Best for long settings-style forms. `stacked` — title always above fields.
   */
  layout?: 'aside' | 'stacked'
  /** Draw a divider above the section (for consecutive sections). */
  divider?: boolean
  /** Fields. They are stacked with a 16px gap; use a Grid inside for side-by-side fields. */
  children: ReactNode
  sx?: SxProps<Theme>
}

/**
 * Groups related form fields under a heading. Use several in a SectionCard or a page
 * instead of one long undifferentiated form.
 *
 * @example
 * <FormSection title="Основное" description="Как урок выглядит в списке приложения." divider={false}>
 *   <TextField label="Название" required fullWidth />
 *   <TextField label="Описание" multiline minRows={3} fullWidth />
 * </FormSection>
 * <FormSection title="Доступ" description="Premium-уроки доступны только подписчикам.">
 *   <FormControlLabel control={<Switch />} label="Premium" />
 * </FormSection>
 */
export function FormSection({ title, description, layout = 'aside', divider = true, children, sx }: FormSectionProps) {
  const aside = layout === 'aside'
  return (
    <Box component="fieldset" sx={mergeSx({ border: 0, m: 0, p: 0, minWidth: 0, containerType: 'inline-size' }, sx)}>
      {divider && <Divider sx={{ mb: 3 }} />}
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: '1fr',
          mb: 3,
          ...(aside && {
            '@container (min-width: 720px)': {
              gridTemplateColumns: 'minmax(180px, 260px) minmax(0, 1fr)',
              columnGap: 4,
            },
          }),
        }}
      >
        <Box>
          <Typography component="legend" variant="subtitle1" sx={{ p: 0 }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: '60ch' }}>
              {description}
            </Typography>
          )}
        </Box>
        <Stack gap={2} sx={{ minWidth: 0 }}>
          {children}
        </Stack>
      </Box>
    </Box>
  )
}
