import { Box, Typography, type SxProps, type Theme } from '@mui/material'
import type { ReactNode } from 'react'

export interface InfoItem {
  label: string
  value: ReactNode
  /** Span both columns (long text). */
  wide?: boolean
}

/**
 * Label / value pairs as a semantic <dl>. Two columns from `sm` up; labels sit above values
 * so long Russian labels never get truncated.
 */
export function InfoList({ items, columns = 2, sx }: { items: InfoItem[]; columns?: 1 | 2 | 3; sx?: SxProps<Theme> }) {
  return (
    <Box
      component="dl"
      sx={[
        {
          m: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: `repeat(${Math.min(columns, 2)}, minmax(0, 1fr))`, lg: `repeat(${columns}, minmax(0, 1fr))` },
          columnGap: 3,
          rowGap: 2,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {items.map((item) => (
        <Box key={item.label} sx={{ minWidth: 0, gridColumn: item.wide ? '1 / -1' : undefined }}>
          <Typography component="dt" variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
            {item.label}
          </Typography>
          <Typography component="dd" variant="body1" sx={{ m: 0, overflowWrap: 'anywhere' }}>
            {item.value === null || item.value === undefined || item.value === '' ? '—' : item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
