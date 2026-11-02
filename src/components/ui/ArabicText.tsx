import { Box, type SxProps, type Theme } from '@mui/material'
import type { ElementType, ReactNode } from 'react'
import { arabicSize, fontFamily } from '../../theme/tokens'
import { mergeSx } from './sx'

export interface ArabicTextProps {
  children: ReactNode
  /**
   * Visual size. Arabic needs ~1.3x the Cyrillic size to read equally:
   * `sm` 17px (tables) · `md` 22px (lists, forms) · `lg` 28px (cards) · `xl` 36px · `display` 48px.
   */
  size?: keyof typeof arabicSize
  /** Rendered element. Defaults to `span` (inline); use `div`/`p` for blocks. */
  component?: ElementType
  /** Text weight; Noto Sans Arabic ships 400/500/600. */
  weight?: 400 | 500 | 600
  /** Muted colour for secondary Arabic (e.g. transliteration context). */
  muted?: boolean
  /** Center the text (letters, names). Defaults to start (= right in RTL). */
  align?: 'start' | 'center' | 'end'
  /** Visible label for screen readers if the Arabic needs context, e.g. «Слово на арабском». */
  'aria-label'?: string
  title?: string
  sx?: SxProps<Theme>
}

/**
 * Arabic text with correct direction, language, font and size.
 * Always use this (or `inputProps={{ dir: 'rtl', lang: 'ar' }}` on inputs) instead of
 * `fontFamily: 'serif'` — it fixes bidi punctuation, harakat clipping and screen-reader language.
 *
 * @example
 * <ArabicText size="lg">بِسْمِ ٱللَّٰهِ</ArabicText>
 * <TableCell><ArabicText size="sm">كِتَاب</ArabicText></TableCell>
 */
export function ArabicText({
  children,
  size = 'md',
  component = 'span',
  weight = 400,
  muted,
  align = 'start',
  sx,
  ...rest
}: ArabicTextProps) {
  return (
    <Box
      component={component}
      dir="rtl"
      lang="ar"
      {...rest}
      sx={mergeSx(
        {
          fontFamily: fontFamily.arabic,
          fontSize: arabicSize[size],
          fontWeight: weight,
          // Generous line-height so harakat (diacritics) above/below are never clipped.
          lineHeight: size === 'display' || size === 'xl' ? 1.6 : 1.85,
          color: muted ? 'text.secondary' : 'text.primary',
          textAlign: align,
          unicodeBidi: 'isolate',
          overflowWrap: 'anywhere',
        },
        sx,
      )}
    >
      {children}
    </Box>
  )
}

/** Props for MUI inputs that hold Arabic: `<TextField inputProps={arabicInputProps} />`. */
export const arabicInputProps = {
  dir: 'rtl',
  lang: 'ar',
  style: { fontFamily: fontFamily.arabic, fontSize: arabicSize.md, lineHeight: 1.7 },
} as const
