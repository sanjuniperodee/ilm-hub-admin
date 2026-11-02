import { Box, Divider, Paper, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import type { ReactNode } from 'react'
import { mergeSx } from './sx'

export interface SectionCardProps {
  /** Section heading (rendered as h2 by default). */
  title?: ReactNode
  /** Short helper line under the title. */
  description?: ReactNode
  /** Right-aligned actions in the header (small buttons, menus). */
  actions?: ReactNode
  /** Footer area separated by a divider — e.g. save/cancel for a form section. */
  footer?: ReactNode
  /**
   * Inner padding: `normal` 20px (default), `dense` 12px, `none` for full-bleed tables/lists.
   */
  padding?: 'normal' | 'dense' | 'none'
  /** `muted` renders on the sunken surface — for secondary info, previews, side panels. */
  variant?: 'default' | 'muted'
  /** Heading level for document outline. */
  headingLevel?: 'h2' | 'h3'
  children?: ReactNode
  id?: string
  sx?: SxProps<Theme>
}

const PAD = { normal: 2.5, dense: 1.5, none: 0 } as const

/**
 * A bordered surface with an optional header and footer. The basic container for
 * grouping content on a page — use one per logical block, don't nest SectionCards.
 *
 * @example
 * <SectionCard title="Последняя активность" actions={<Button size="small">Все</Button>} padding="none">
 *   <List>…</List>
 * </SectionCard>
 */
export function SectionCard({
  title,
  description,
  actions,
  footer,
  padding = 'normal',
  variant = 'default',
  headingLevel = 'h2',
  children,
  id,
  sx,
}: SectionCardProps) {
  const hasHeader = Boolean(title || description || actions)
  const p = PAD[padding]
  return (
    <Paper
      component="section"
      id={id}
      aria-labelledby={id && title ? `${id}-title` : undefined}
      sx={mergeSx(
        {
          bgcolor: variant === 'muted' ? 'surface.sunken' : 'background.paper',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
        sx,
      )}
    >
      {hasHeader && (
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          gap={2}
          sx={{ px: padding === 'dense' ? 1.5 : 2.5, pt: padding === 'dense' ? 1.5 : 2, pb: padding === 'none' ? 2 : 0 }}
        >
          <Box sx={{ minWidth: 0 }}>
            {title && (
              <Typography id={id ? `${id}-title` : undefined} variant="h6" component={headingLevel}>
                {title}
              </Typography>
            )}
            {description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {description}
              </Typography>
            )}
          </Box>
          {actions && (
            <Stack direction="row" gap={1} alignItems="center" sx={{ flexShrink: 0, mt: -0.25 }}>
              {actions}
            </Stack>
          )}
        </Stack>
      )}
      {children != null && (
        <Box sx={{ p, pt: hasHeader && padding !== 'none' ? 1.5 : p, flex: 1, minWidth: 0 }}>{children}</Box>
      )}
      {footer && (
        <>
          <Divider />
          <Stack
            direction="row"
            gap={1}
            justifyContent="flex-end"
            alignItems="center"
            flexWrap="wrap"
            sx={{ px: 2.5, py: 1.5, bgcolor: 'surface.sunken' }}
          >
            {footer}
          </Stack>
        </>
      )}
    </Paper>
  )
}
