import { Box, Breadcrumbs, IconButton, Link, Stack, Tooltip, Typography, type SxProps, type Theme } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { mergeSx } from './sx'

export interface BreadcrumbItem {
  label: string
  /** Router path. Omit for the current page or a non-navigable group. */
  to?: string
}

export interface PageHeaderProps {
  /** Page title — one `<h1>` per page. Keep it short: the noun the page manages («Словарь», «Урок 3. Харакаты»). */
  title: ReactNode
  /** One line explaining what the page is for or the current object's context. */
  subtitle?: ReactNode
  /** In-page trail for deep hierarchies (курс → модуль → урок). The last item is the current page. */
  breadcrumbs?: BreadcrumbItem[]
  /** Router path for a back button left of the title (editor pages). */
  backTo?: string
  /** Accessible label for the back button. */
  backLabel?: string
  /** Inline element after the title, e.g. `<StatusChip status="draft" />`. */
  status?: ReactNode
  /** Primary actions, right-aligned. Put the primary (contained) button last. */
  actions?: ReactNode
  /** Content under the title row: tabs, a `<Toolbar>`, meta info. */
  children?: ReactNode
  /** Remove the bottom margin (when followed by full-bleed tabs). */
  disableGutterBottom?: boolean
  sx?: SxProps<Theme>
}

/**
 * Standard page header: breadcrumbs, title (h1), subtitle, status and actions.
 * Every routed page starts with it so headings, spacing and action placement are identical.
 *
 * @example
 * <PageHeader
 *   title="Словарь"
 *   subtitle="Слова, которые встречаются в уроках и карточках"
 *   actions={<Button variant="contained" startIcon={<Add />}>Добавить слово</Button>}
 * />
 *
 * <PageHeader
 *   backTo="/content/courses/1"
 *   breadcrumbs={[{ label: 'Курсы', to: '/content' }, { label: 'Арабский A1', to: '/content/courses/1' }, { label: 'Урок 3' }]}
 *   title="Урок 3. Харакаты"
 *   status={<StatusChip status="draft" />}
 *   actions={<><Button variant="outlined">Предпросмотр</Button><Button variant="contained">Сохранить</Button></>}
 * />
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  backTo,
  backLabel = 'Назад',
  status,
  actions,
  children,
  disableGutterBottom,
  sx,
}: PageHeaderProps) {
  return (
    <Box component="header" sx={mergeSx({ mb: disableGutterBottom ? 0 : 3 }, sx)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs aria-label="Навигационная цепочка" sx={{ mb: 1 }} maxItems={5} itemsBeforeCollapse={1}>
          {breadcrumbs.map((b, i) =>
            b.to && i < breadcrumbs.length - 1 ? (
              <Link key={`${b.label}-${i}`} component={RouterLink} to={b.to} color="text.secondary" sx={{ fontWeight: 500 }}>
                {b.label}
              </Link>
            ) : (
              <Typography
                key={`${b.label}-${i}`}
                variant="body2"
                color={i === breadcrumbs.length - 1 ? 'text.primary' : 'text.secondary'}
                aria-current={i === breadcrumbs.length - 1 ? 'page' : undefined}
                sx={{ fontWeight: 500, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {b.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        justifyContent="space-between"
        gap={{ xs: 1.5, sm: 2 }}
      >
        <Stack direction="row" alignItems="flex-start" gap={1} sx={{ minWidth: 0, flex: 1 }}>
          {backTo && (
            <Tooltip title={backLabel}>
              <IconButton component={RouterLink} to={backTo} aria-label={backLabel} size="small" sx={{ mt: '2px', ml: -0.5 }}>
                <ArrowBack fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap">
              <Typography
                variant="h4"
                component="h1"
                sx={{ fontSize: { xs: '1.25rem', md: '1.375rem' }, overflowWrap: 'anywhere' }}
              >
                {title}
              </Typography>
              {status}
            </Stack>
            {subtitle && (
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, maxWidth: '72ch' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>

        {actions && (
          <Stack
            direction="row"
            gap={1}
            flexWrap="wrap"
            justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
            sx={{ flexShrink: 0 }}
          >
            {actions}
          </Stack>
        )}
      </Stack>

      {children && <Box sx={{ mt: 2 }}>{children}</Box>}
    </Box>
  )
}
