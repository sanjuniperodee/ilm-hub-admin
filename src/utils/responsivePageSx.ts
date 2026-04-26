import type { SxProps, Theme } from '@mui/material/styles'

/** Единообразные крупные заголовки экранов (h3 / `variant="h3"`). */
export const pageTitleH3Sx: SxProps<Theme> = {
  fontWeight: 800,
  letterSpacing: '-0.02em',
  fontSize: { xs: '1.4rem', sm: '1.65rem', md: '1.875rem' },
}

/** Заголовки уровня h4 (разделы, формы). */
export const pageTitleH4Sx: SxProps<Theme> = {
  fontWeight: 700,
  letterSpacing: -0.4,
  fontSize: { xs: '1.2rem', sm: '1.35rem', md: '1.5rem' },
}

/** Ограничение ширины форм-редакторов: на телефоне на всю ширину. */
export const editorMaxWidthSx: SxProps<Theme> = {
  maxWidth: { xs: '100%', sm: 1200 },
  mx: 'auto',
}

export const testEditorMaxWidthSx: SxProps<Theme> = {
  maxWidth: { xs: '100%', sm: 900 },
  mx: 'auto',
}
