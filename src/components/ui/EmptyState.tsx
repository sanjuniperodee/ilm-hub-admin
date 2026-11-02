import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import { Inbox } from '@mui/icons-material'
import type { ReactNode } from 'react'
import { color } from '../../theme/tokens'
import { mergeSx } from './sx'

export interface EmptyStateProps {
  /** What is missing, stated plainly: «Слов пока нет», «Ничего не найдено». */
  title: ReactNode
  /** What to do next. One sentence. */
  description?: ReactNode
  /** MUI icon element. Defaults to an inbox. */
  icon?: ReactNode
  /** Primary next step, usually a button («Добавить слово», «Сбросить фильтры»). */
  action?: ReactNode
  /** Secondary action (link-style button). */
  secondaryAction?: ReactNode
  /** `sm` for inside tables/cards, `md` for a whole page section. */
  size?: 'sm' | 'md'
  sx?: SxProps<Theme>
}

/**
 * Empty screen / section: explains what is missing and offers the next action.
 * Distinguish «нет данных вообще» (offer create) from «нет результатов по фильтру» (offer reset).
 *
 * @example
 * <EmptyState
 *   icon={<MenuBookOutlined />}
 *   title="В словаре пока нет слов"
 *   description="Добавьте первое слово или импортируйте CSV."
 *   action={<Button variant="contained" startIcon={<Add />}>Добавить слово</Button>}
 * />
 */
export function EmptyState({ title, description, icon, action, secondaryAction, size = 'md', sx }: EmptyStateProps) {
  const sm = size === 'sm'
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      role="status"
      sx={mergeSx({ py: sm ? 4 : 7, px: 3, gap: 1 }, sx)}
    >
      <Box
        aria-hidden
        sx={{
          width: sm ? 40 : 52,
          height: sm ? 40 : 52,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: color.bronze[50],
          color: color.bronze[600],
          border: `1px solid ${color.bronze[100]}`,
          mb: 0.5,
          '& .MuiSvgIcon-root': { fontSize: sm ? 20 : 26 },
        }}
      >
        {icon ?? <Inbox />}
      </Box>
      <Typography variant={sm ? 'subtitle2' : 'subtitle1'} component="p" sx={{ fontSize: sm ? '0.875rem' : '1rem' }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {description}
        </Typography>
      )}
      {(action || secondaryAction) && (
        <Stack direction="row" gap={1} sx={{ mt: 1.5 }} flexWrap="wrap" justifyContent="center">
          {action}
          {secondaryAction}
        </Stack>
      )}
    </Stack>
  )
}
