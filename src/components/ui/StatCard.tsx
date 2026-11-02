import { Box, ButtonBase, Paper, Skeleton, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { color, radius } from '../../theme/tokens'
import { mergeSx } from './sx'

export interface StatCardProps {
  /** What is counted, sentence case: «Новых за неделю». */
  label: string
  /** The number. Pre-format it (`toLocaleString('ru-RU')`, «64%»). */
  value: ReactNode
  /** Optional MUI icon (rendered small and muted — the number is the hero). */
  icon?: ReactNode
  /** Context under the value: «из 1 240», «за 30 дней». */
  hint?: ReactNode
  /** Router path; makes the whole card a link. */
  to?: string
  loading?: boolean
  /** `card` — standalone bordered tile (default). `plain` — borderless cell inside a `<StatGroup>`. */
  variant?: 'card' | 'plain'
  sx?: SxProps<Theme>
}

/**
 * KPI tile. Numbers use tabular figures so columns of stats align.
 *
 * @example
 * <StatCard label="Всего пользователей" value={stats.totalUsers.toLocaleString('ru-RU')} hint="+12 сегодня" to="/users" />
 */
export function StatCard({ label, value, icon, hint, to, loading, variant = 'card', sx }: StatCardProps) {
  const body = (
    <Stack gap={0.75} sx={{ p: 2, width: '100%', textAlign: 'left' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        {icon && (
          <Box aria-hidden sx={{ color: color.bronze[500], display: 'flex', '& .MuiSvgIcon-root': { fontSize: 18 } }}>
            {icon}
          </Box>
        )}
      </Stack>
      {loading ? (
        <Skeleton width="45%" height={34} />
      ) : (
        <Typography
          component="p"
          sx={{
            fontSize: '1.625rem',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            fontVariantNumeric: 'tabular-nums',
            color: 'text.primary',
          }}
        >
          {value}
        </Typography>
      )}
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Stack>
  )

  const inner = to ? (
    <ButtonBase
      component={RouterLink}
      to={to}
      sx={{
        width: '100%',
        alignItems: 'stretch',
        borderRadius: variant === 'card' ? `${radius.lg}px` : 0,
        '&:hover': { bgcolor: color.bronze[50] },
      }}
    >
      {body}
    </ButtonBase>
  ) : (
    body
  )

  if (variant === 'plain') {
    return <Box sx={mergeSx({ display: 'flex', height: '100%', bgcolor: 'background.paper' }, sx)}>{inner}</Box>
  }

  return (
    <Paper sx={mergeSx({ display: 'flex', height: '100%', overflow: 'hidden' }, sx)}>
      {inner}
    </Paper>
  )
}

export interface StatGroupProps {
  /** Group heading, e.g. «Аудитория». */
  title?: ReactNode
  /** Right-aligned header content (period selector, link). */
  actions?: ReactNode
  /** Columns per breakpoint. Default `{ xs: 1, sm: 2, lg: <number of children> }`. */
  columns?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number }
  /** `<StatCard variant="plain" />` elements. */
  children: ReactNode
  sx?: SxProps<Theme>
}

/**
 * Related KPIs in one bordered strip separated by hairlines — denser and calmer than a
 * grid of separate cards. Children should be `<StatCard variant="plain" />`.
 *
 * @example
 * <StatGroup title="Аудитория">
 *   <StatCard variant="plain" label="Всего пользователей" value="12 480" />
 *   <StatCard variant="plain" label="Новых за неделю" value="286" hint="Сегодня: 37" />
 * </StatGroup>
 */
export function StatGroup({ title, actions, columns, children, sx }: StatGroupProps) {
  const count = Array.isArray(children) ? children.filter(Boolean).length : 1
  const cols: Record<string, number | undefined> = { xs: 1, sm: 2, lg: count, ...columns }
  // Keep breakpoint keys in ascending order so later media queries win correctly.
  const template = Object.fromEntries(
    ['xs', 'sm', 'md', 'lg', 'xl']
      .filter((bp) => cols[bp] != null)
      .map((bp) => [bp, `repeat(${cols[bp]}, minmax(0, 1fr))`]),
  )
  return (
    <Paper component="section" sx={mergeSx({ overflow: 'hidden' }, sx)}>
      {(title || actions) && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          {title && (
            <Typography variant="subtitle2" component="h2" color="text.secondary">
              {title}
            </Typography>
          )}
          {actions}
        </Stack>
      )}
      {/* Each cell draws its right/bottom hairline; the grid overhangs by 1px so the outer
          edge lines are clipped by the Paper — incomplete rows stay clean. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: template,
          mr: '-1px',
          mb: '-1px',
          '& > *': { boxShadow: `inset -1px 0 0 ${color.neutral[200]}, inset 0 -1px 0 ${color.neutral[200]}` },
        }}
      >
        {children}
      </Box>
    </Paper>
  )
}

