import { Box, Stack, Typography, alpha } from '@mui/material'
import { BrandMark } from '../../components/ui'
import { color, fontFamily } from '../../theme/tokens'

export interface PushPhonePreviewProps {
  title: string
  body: string
  route?: string
}

/**
 * Lock-screen mock of the push as the learner will see it. Purely illustrative:
 * real rendering depends on the OS (iOS trims long bodies to ~4 lines).
 */
export function PushPhonePreview({ title, body, route }: PushPhonePreviewProps) {
  const now = new Date()
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(now)
  const date = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
  const hasContent = Boolean(title.trim() || body.trim())

  return (
    <Stack alignItems="center" gap={1.5}>
      <Box
        role="img"
        aria-label={hasContent ? `Предпросмотр уведомления: ${title}. ${body}` : 'Предпросмотр уведомления: текст ещё не введён'}
        sx={{
          width: 300,
          maxWidth: '100%',
          aspectRatio: '300 / 600',
          maxHeight: 560,
          p: '10px',
          borderRadius: '46px',
          bgcolor: color.ink[900],
          boxShadow: `inset 0 0 0 2px ${color.ink[700]}`,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            height: '100%',
            borderRadius: '37px',
            overflow: 'hidden',
            bgcolor: color.ink[700],
            px: 1.5,
            color: color.sand[50],
            fontFamily: fontFamily.sans,
          }}
        >
          {/* Dynamic island */}
          <Box sx={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 92, height: 26, borderRadius: 13, bgcolor: color.ink[900] }} />

          <Stack alignItems="center" sx={{ pt: 6.5, pb: 3 }}>
            <Typography sx={{ color: alpha(color.sand[50], 0.8), fontSize: '0.8125rem', fontWeight: 500, textTransform: 'none' }}>
              {date}
            </Typography>
            <Typography sx={{ color: color.sand[50], fontSize: '3.5rem', fontWeight: 600, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
              {time}
            </Typography>
          </Stack>

          <Box
            sx={{
              borderRadius: '20px',
              bgcolor: alpha(color.sand[50], 0.88),
              color: color.ink[600],
              p: 1.25,
              opacity: hasContent ? 1 : 0.55,
              transition: 'opacity 120ms',
            }}
          >
            <Stack direction="row" gap={1.25} alignItems="flex-start">
              <BrandMark size={34} sx={{ borderRadius: '8px', flexShrink: 0 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title.trim() || 'Заголовок'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: color.neutral[600], flexShrink: 0 }}>сейчас</Typography>
                </Stack>
                <Typography
                  sx={{
                    fontSize: '0.8125rem',
                    lineHeight: 1.35,
                    color: 'inherit',
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {body.trim() || 'Здесь появится текст уведомления'}
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Home indicator */}
          <Box sx={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 108, height: 4, borderRadius: 2, bgcolor: alpha(color.sand[50], 0.7) }} />
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 300 }}>
        При нажатии откроется {route?.trim() || '/home'}. На iOS длинный текст обрезается до четырёх строк.
      </Typography>
    </Stack>
  )
}
