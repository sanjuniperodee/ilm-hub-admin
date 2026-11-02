/**
 * MUI module augmentation for ILM HUB custom theme keys.
 *
 * - `theme.palette.brand` — raw brand colours (bronze/gold/sand/ink) for
 *   decoration that has no semantic MUI slot.
 * - `theme.palette.surface` — canvas / raised / sunken backgrounds.
 * - `<Typography variant="arabic">` — Noto Sans Arabic, large, RTL-friendly line-height.
 *   Prefer the `<ArabicText>` component, which also sets dir/lang.
 */
import type { CSSProperties } from 'react'

declare module '@mui/material/styles' {
  interface Palette {
    brand: {
      bronze: string
      bronzeSoft: string
      gold: string
      goldSoft: string
      sand: string
      ink: string
    }
    surface: {
      canvas: string
      raised: string
      sunken: string
      border: string
      borderStrong: string
    }
  }
  interface PaletteOptions {
    brand?: Partial<Palette['brand']>
    surface?: Partial<Palette['surface']>
  }
  interface TypographyVariants {
    arabic: CSSProperties
  }
  interface TypographyVariantsOptions {
    arabic?: CSSProperties
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    arabic: true
  }
}

export {}
