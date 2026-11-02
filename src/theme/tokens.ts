/**
 * ILM HUB admin — design tokens.
 *
 * Single source of truth for raw values. Components should NOT import these
 * directly when a theme path exists (`theme.palette.*`, `theme.shape.*`,
 * `theme.spacing()`); use tokens only for things MUI has no slot for
 * (sidebar ink colours, layout sizes, Arabic type scale).
 *
 * Brand source: docs/DESIGN_SYSTEM.md (mobile app). The mobile brand bronze
 * #B68A60 only reaches 3.1:1 against white, so text/buttons use the darker
 * `bronze[600]` (5.2:1) and the brand value is kept for focus rings,
 * indicators, charts and decoration.
 */

export const color = {
  /** Warm ink — text and the dark navigation rail. */
  ink: {
    900: '#1C1612', // sidebar background
    800: '#2A221C', // sidebar hover
    700: '#3A2F27', // sidebar active surface
    600: '#221C17', // primary text on light surfaces
  },
  bronze: {
    50: '#FAF3EA',
    100: '#F3E6D6',
    200: '#E6CFB4',
    300: '#D2B08B',
    500: '#B68A60', // brand primary (mobile). Decorative / focus / charts.
    600: '#8F6337', // primary.main — 5.2:1 on white, safe for text & filled buttons
    700: '#6F4B28', // hover / pressed
    800: '#53371C',
  },
  gold: {
    100: '#FBF1D6',
    300: '#F2DB9A',
    400: '#EBCA70', // brand accent
    600: '#B8902C',
    800: '#6B5112',
  },
  sand: {
    50: '#FFF9F0', // brand background secondary
    100: '#FAF6F0', // app canvas
    200: '#F6E5CE', // brand card sand — selected rows, highlights
  },
  neutral: {
    0: '#FFFFFF',
    50: '#FCFAF7', // table header, sunken areas
    100: '#F4EFE8',
    200: '#E9E0D4', // dividers / card borders
    300: '#D9CCBB', // strong borders
    400: '#A39382', // input outline (3:1 on white — WCAG 1.4.11)
    500: '#857769',
    600: '#6B6159', // secondary text (6:1)
    700: '#4A423B',
  },
  success: { main: '#3F7A35', dark: '#2E5A27', light: '#8ABE61', soft: '#EAF3E1' },
  warning: { main: '#9A6212', dark: '#734809', light: '#EBCA70', soft: '#FBF0D9' },
  error: { main: '#B53A32', dark: '#8E2A24', light: '#D9534F', soft: '#FBE9E7' },
  info: { main: '#2D6A82', dark: '#1F4F62', light: '#7FB3C6', soft: '#E3F0F4' },
} as const

export const fontFamily = {
  /** UI text — brand typeface of the mobile app. */
  sans: "'Montserrat', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  /** Arabic script. Always pair with dir="rtl" lang="ar" (see <ArabicText>). */
  arabic: "'Noto Sans Arabic', 'Geeza Pro', 'Segoe UI', Tahoma, sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
} as const

/**
 * Arabic sizes. Arabic glyphs read ~1.25–1.4x smaller than Cyrillic at the
 * same font-size, so these are deliberately larger than the UI scale.
 */
export const arabicSize = {
  sm: '1.0625rem', // 17px — inline in tables
  md: '1.375rem', // 22px — form previews, list rows
  lg: '1.75rem', // 28px — cards
  xl: '2.25rem', // 36px — letter / word showcase
  display: '3rem', // 48px — single letters, 99 names hero
} as const

/** Radius hierarchy: small controls are tighter than containers. */
export const radius = {
  xs: 4, // kbd, tiny tags
  sm: 6, // chips, menu items, nav items
  md: 8, // buttons, inputs (theme.shape.borderRadius)
  lg: 12, // cards, tables
  xl: 16, // dialogs, auth card
} as const

export const layout = {
  sidebarWidth: 248,
  sidebarCollapsedWidth: 68,
  topBarHeight: 56,
  /** Max width for reading/form pages; tables & editors may go full-width. */
  contentMaxWidth: 1440,
  formMaxWidth: 880,
} as const

/** Warm-tinted shadows. Surfaces are separated by borders; shadows are for overlays. */
export const shadow = {
  xs: '0 1px 2px rgba(41, 28, 16, 0.06)',
  sm: '0 1px 3px rgba(41, 28, 16, 0.08), 0 1px 2px rgba(41, 28, 16, 0.04)',
  md: '0 4px 12px rgba(41, 28, 16, 0.10), 0 1px 3px rgba(41, 28, 16, 0.06)',
  lg: '0 12px 32px rgba(41, 28, 16, 0.14), 0 2px 6px rgba(41, 28, 16, 0.06)',
  focus: `0 0 0 3px rgba(182, 138, 96, 0.35)`,
  focusError: `0 0 0 3px rgba(181, 58, 50, 0.25)`,
} as const

export const motion = {
  fast: '120ms',
  base: '180ms',
  slow: '240ms',
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
} as const
