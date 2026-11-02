import type { ReactNode } from 'react'
import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import { mergeSx } from '../../../components/ui'

/** Two fields side by side on wide screens (RU | KZ, Arabic | transliteration). */
export function FieldPair({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box
      sx={mergeSx(
        { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, alignItems: 'start' },
        sx,
      )}
    >
      {children}
    </Box>
  )
}

/** Small «label: value» line used in editor headers and meta rows. */
export function MetaLine({ items }: { items: Array<{ label: string; value: ReactNode } | false | null | undefined> }) {
  const list = items.filter(Boolean) as Array<{ label: string; value: ReactNode }>
  return (
    <Stack direction="row" gap={2} flexWrap="wrap" component="dl" sx={{ m: 0 }}>
      {list.map((i) => (
        <Stack key={i.label} direction="row" gap={0.5} alignItems="baseline">
          <Typography component="dt" variant="body2" color="text.secondary">
            {i.label}
          </Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {i.value}
          </Typography>
        </Stack>
      ))}
    </Stack>
  )
}

/** Square tile with a centred Arabic glyph (letters, letter forms). */
export function GlyphTile({
  children,
  size = 56,
  caption,
  muted,
}: {
  children: ReactNode
  size?: number
  caption?: string
  muted?: boolean
}) {
  return (
    <Stack alignItems="center" gap={0.25} sx={{ flexShrink: 0 }}>
      <Box
        sx={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 2,
          border: 1,
          borderColor: muted ? 'divider' : 'brand.sand',
          bgcolor: muted ? 'background.paper' : 'brand.sand',
        }}
      >
        {children}
      </Box>
      {caption && (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
          {caption}
        </Typography>
      )}
    </Stack>
  )
}
