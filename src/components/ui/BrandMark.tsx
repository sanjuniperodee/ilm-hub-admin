import { Box, type SxProps, type Theme } from '@mui/material'
import { color, fontFamily } from '../../theme/tokens'
import { mergeSx } from './sx'

export interface BrandMarkProps {
  /** Square size in px. */
  size?: number
  /** `onDark` for the navigation rail / dark panels. */
  tone?: 'onDark' | 'onLight'
  sx?: SxProps<Theme>
}

/**
 * ILM HUB mark: an eight-pointed star (khatam) carrying the letter «ع» — the first
 * letter of «علم», knowledge. Decorative: always pair with a visible text name.
 */
export function BrandMark({ size = 32, tone = 'onDark', sx }: BrandMarkProps) {
  return (
    <Box
      aria-hidden
      sx={mergeSx(
        {
          width: size,
          height: size,
          position: 'relative',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        sx,
      )}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ position: 'absolute', inset: 0 }}>
        <g fill={color.bronze[500]}>
          <rect x="8" y="8" width="24" height="24" rx="2.5" />
          <rect x="8" y="8" width="24" height="24" rx="2.5" transform="rotate(45 20 20)" />
        </g>
        <g fill="none" stroke={tone === 'onDark' ? 'rgba(235,202,112,0.55)' : 'rgba(255,255,255,0.45)'} strokeWidth="0.75">
          <rect x="11" y="11" width="18" height="18" rx="1.5" />
          <rect x="11" y="11" width="18" height="18" rx="1.5" transform="rotate(45 20 20)" />
        </g>
      </svg>
      <Box
        component="span"
        sx={{
          position: 'relative',
          fontFamily: fontFamily.arabic,
          fontWeight: 600,
          fontSize: size * 0.42,
          lineHeight: 1,
          color: '#FFFFFF',
          transform: 'translateY(-4%)',
        }}
      >
        ع
      </Box>
    </Box>
  )
}
