import { Box, Chip, type SxProps, type Theme } from '@mui/material'
import type { ReactElement } from 'react'
import { color } from '../../theme/tokens'
import { mergeSx } from './sx'

export type StatusTone = 'neutral' | 'brand' | 'gold' | 'success' | 'warning' | 'error' | 'info'

/** Preset statuses used across the admin. Add new ones here, not ad-hoc in pages. */
const PRESETS = {
  published: { label: 'Опубликован', tone: 'success' },
  draft: { label: 'Черновик', tone: 'neutral' },
  archived: { label: 'В архиве', tone: 'neutral' },
  active: { label: 'Активен', tone: 'success' },
  inactive: { label: 'Неактивен', tone: 'neutral' },
  blocked: { label: 'Заблокирован', tone: 'error' },
  pending: { label: 'Ожидает', tone: 'warning' },
  invited: { label: 'Приглашён', tone: 'info' },
  premium: { label: 'Premium', tone: 'gold' },
  free: { label: 'Бесплатно', tone: 'neutral' },
  locked: { label: 'Закрыт', tone: 'neutral' },
  sent: { label: 'Отправлено', tone: 'success' },
  scheduled: { label: 'Запланировано', tone: 'info' },
  failed: { label: 'Ошибка', tone: 'error' },
  passed: { label: 'Сдан', tone: 'success' },
  notPassed: { label: 'Не сдан', tone: 'warning' },
} as const satisfies Record<string, { label: string; tone: StatusTone }>

export type StatusPreset = keyof typeof PRESETS

const TONES: Record<StatusTone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: color.neutral[100], fg: color.neutral[700], dot: color.neutral[500] },
  brand: { bg: color.bronze[100], fg: color.bronze[800], dot: color.bronze[500] },
  gold: { bg: color.gold[100], fg: color.gold[800], dot: color.gold[600] },
  success: { bg: color.success.soft, fg: color.success.dark, dot: color.success.main },
  warning: { bg: color.warning.soft, fg: color.warning.dark, dot: color.warning.main },
  error: { bg: color.error.soft, fg: color.error.dark, dot: color.error.main },
  info: { bg: color.info.soft, fg: color.info.dark, dot: color.info.main },
}

export interface StatusChipProps {
  /** Preset status (label + tone). */
  status?: StatusPreset
  /** Custom label (overrides preset label). */
  label?: string
  /** Custom tone (overrides preset tone). */
  tone?: StatusTone
  /** Optional leading icon instead of the dot. */
  icon?: ReactElement
  /** Hide the leading dot. */
  hideDot?: boolean
  size?: 'small' | 'medium'
  sx?: SxProps<Theme>
}

/**
 * Status label for rows, headers and cards. The dot + text pair means status is never
 * conveyed by colour alone.
 *
 * @example
 * <StatusChip status="published" />
 * <StatusChip status={lesson.isPremium ? 'premium' : 'free'} />
 * <StatusChip label="A1" tone="brand" hideDot />
 */
export function StatusChip({ status, label, tone, icon, hideDot, size = 'small', sx }: StatusChipProps) {
  const preset = status ? PRESETS[status] : undefined
  const t = TONES[tone ?? preset?.tone ?? 'neutral']
  const text = label ?? preset?.label ?? ''
  return (
    <Chip
      size={size}
      label={text}
      icon={
        icon ??
        (hideDot ? undefined : (
          <Box component="span" aria-hidden sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: t.dot, flexShrink: 0 }} />
        ))
      }
      sx={mergeSx(
        {
          bgcolor: t.bg,
          color: t.fg,
          fontWeight: 600,
          '& .MuiChip-icon': { ml: '8px', mr: '-2px', color: t.fg, fontSize: 14 },
        },
        sx,
      )}
    />
  )
}
