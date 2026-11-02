import { Box, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material'
import { CheckCircleOutline, ErrorOutline } from '@mui/icons-material'
import { color } from '../../../theme'
import type { Lang } from '../types'

/**
 * RU / KZ switch for the open block. The KZ tab shows what is still untranslated, so a
 * missing translation is visible before the lesson reaches Kazakh-speaking learners.
 */
export function LocaleTabs({ value, onChange, kzGaps }: { value: Lang; onChange: (l: Lang) => void; kzGaps: string[] }) {
  const missing = kzGaps.length
  return (
    <Tabs
      value={value}
      onChange={(_, v) => onChange(v as Lang)}
      aria-label="Язык содержимого"
      sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0.5, px: 1.5, textTransform: 'none', fontWeight: 600 } }}
    >
      <Tab value="ru" label="Русский" id="lang-tab-ru" aria-controls="block-editor-body" />
      <Tab
        value="kz"
        id="lang-tab-kz"
        aria-controls="block-editor-body"
        label={
          <Tooltip title={missing ? `Не переведено: ${kzGaps.join(', ')}` : 'Перевод заполнен'}>
            <Stack direction="row" gap={0.75} alignItems="center" component="span">
              <span>Казахский</span>
              {missing ? (
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, px: 0.75, borderRadius: '10px', bgcolor: color.warning.soft, color: color.warning.dark }}
                >
                  <ErrorOutline sx={{ fontSize: 13 }} />
                  <Typography component="span" variant="caption" sx={{ fontWeight: 600, lineHeight: '18px' }}>
                    {missing === 1 ? 'не заполнено 1 поле' : `не заполнено ${missing}`}
                  </Typography>
                </Box>
              ) : (
                <CheckCircleOutline sx={{ fontSize: 15, color: color.success.main }} aria-label="перевод заполнен" />
              )}
            </Stack>
          </Tooltip>
        }
      />
    </Tabs>
  )
}
