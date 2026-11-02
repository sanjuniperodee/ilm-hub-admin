import { Box, Stack, Tooltip, Typography } from '@mui/material'
import { CheckCircleRounded, RadioButtonUncheckedRounded } from '@mui/icons-material'

export interface CompletenessItem {
  /** Short label: «RU», «KZ», «Аудио», «Описание». */
  label: string
  done: boolean
}

/** True when a string-ish value has visible content. */
export const filled = (v: unknown) => typeof v === 'string' ? v.trim().length > 0 : v != null && v !== false

export function completenessText(items: CompletenessItem[]) {
  const done = items.filter((i) => i.done).map((i) => i.label)
  const missing = items.filter((i) => !i.done).map((i) => i.label)
  return [done.length ? `Заполнено: ${done.join(', ')}` : '', missing.length ? `Не заполнено: ${missing.join(', ')}` : '']
    .filter(Boolean)
    .join('. ')
}

export interface CompletenessProps {
  items: CompletenessItem[]
  /** `inline` — label + icon pills for tables; `summary` — adds «3 из 4 заполнено». */
  variant?: 'inline' | 'summary'
}

/**
 * Shows which translations / media an item has. Each entry is an icon **and** a text
 * label, so status never depends on colour alone.
 */
export function Completeness({ items, variant = 'inline' }: CompletenessProps) {
  const doneCount = items.filter((i) => i.done).length
  const all = doneCount === items.length
  const text = completenessText(items)
  return (
    <Tooltip title={text}>
      <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap" aria-label={text} role="group">
        {variant === 'summary' && (
          <Typography variant="body2" sx={{ fontWeight: 600, color: all ? 'success.dark' : 'text.primary', mr: 0.5 }}>
            {all ? 'Всё заполнено' : `Заполнено ${doneCount} из ${items.length}`}
          </Typography>
        )}
        {items.map((i) => (
          <Box
            key={i.label}
            aria-hidden
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.375,
              pl: 0.5,
              pr: 0.75,
              py: 0.125,
              borderRadius: 1.5,
              border: 1,
              borderColor: i.done ? 'transparent' : 'divider',
              bgcolor: i.done ? 'success.soft' : 'background.paper',
              color: i.done ? 'success.dark' : 'text.secondary',
              fontSize: '0.75rem',
              fontWeight: 600,
              lineHeight: 1.6,
              whiteSpace: 'nowrap',
              '& .MuiSvgIcon-root': { fontSize: 14 },
            }}
          >
            {i.done ? <CheckCircleRounded /> : <RadioButtonUncheckedRounded />}
            {i.label}
          </Box>
        ))}
      </Stack>
    </Tooltip>
  )
}
