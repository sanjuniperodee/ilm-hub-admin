import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { color, fontFamily } from '../../theme/tokens'
import { BrandMark } from './BrandMark'

/** Eight-pointed-star lattice used as a quiet texture on dark brand panels. */
export const GIRIH_PATTERN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'><g fill='none' stroke='#EBCA70' stroke-width='0.8'><rect x='16' y='16' width='24' height='24'/><rect x='16' y='16' width='24' height='24' transform='rotate(45 28 28)'/><path d='M0 0 L8 8 M56 0 L48 8 M0 56 L8 48 M56 56 L48 48'/></g></svg>`,
)}")`

export interface AuthLayoutProps {
  /** Form heading, e.g. «Вход в админ-панель». */
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  /** Small print under the card. */
  footer?: ReactNode
}

/**
 * Unauthenticated screens (login, accept invitation): dark brand panel with the
 * Arabic word «علم» on the left (≥ md), form on the right.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(360px, 5fr) 7fr' },
        bgcolor: 'background.default',
      }}
    >
      <Box
        aria-hidden
        sx={{
          display: { xs: 'none', md: 'flex' },
          position: 'relative',
          overflow: 'hidden',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 5,
          bgcolor: color.ink[900],
          color: '#FFF8EE',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage: GIRIH_PATTERN,
            backgroundSize: '56px 56px',
            opacity: 0.07,
          },
        }}
      >
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ position: 'relative' }}>
          <BrandMark size={36} />
          <Typography sx={{ fontWeight: 700, fontSize: '1.0625rem', letterSpacing: '0.02em' }}>ILM HUB</Typography>
        </Stack>

        <Box sx={{ position: 'relative' }}>
          <Typography
            lang="ar"
            dir="rtl"
            sx={{
              fontFamily: fontFamily.arabic,
              fontWeight: 600,
              fontSize: 'clamp(5.5rem, 10vw, 8.5rem)',
              lineHeight: 1.5,
              color: color.gold[400],
              textAlign: 'left',
            }}
          >
            عِلْم
          </Typography>
          <Typography sx={{ mt: 1, maxWidth: 360, color: 'rgba(255,248,238,0.72)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Знание. Здесь редакторы собирают курсы арабского, словарь и исламские материалы для приложения ILM HUB.
          </Typography>
        </Box>

        <Typography sx={{ position: 'relative', color: 'rgba(255,248,238,0.5)', fontSize: '0.75rem' }}>
          © {new Date().getFullYear()} ILM HUB
        </Typography>
      </Box>

      <Box
        component="main"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 'max(20px, env(safe-area-inset-left, 0px))', sm: 4 },
          py: { xs: 'max(32px, env(safe-area-inset-top, 0px))', sm: 6 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Stack direction="row" alignItems="center" gap={1.25} sx={{ mb: 4, display: { xs: 'flex', md: 'none' } }}>
            <BrandMark size={32} />
            <Typography sx={{ fontWeight: 700, letterSpacing: '0.02em' }}>ILM HUB</Typography>
          </Stack>
          <Typography variant="h3" component="h1">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
          <Box sx={{ mt: 4 }}>{children}</Box>
          {footer && (
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 4 }}>
              {footer}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}
