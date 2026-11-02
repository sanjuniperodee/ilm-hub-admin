import './augment'
import { alpha, createTheme, type Shadows } from '@mui/material/styles'
import { ruRU } from '@mui/material/locale'
import { arabicSize, color, fontFamily, motion, radius, shadow } from './tokens'

/** Warm shadows mapped onto MUI's 25 elevation levels. */
const shadows = [
  'none',
  shadow.xs,
  shadow.sm,
  shadow.sm,
  shadow.md,
  shadow.md,
  shadow.md,
  shadow.md,
  shadow.lg,
  ...Array(16).fill(shadow.lg),
] as Shadows

const focusRing = {
  outline: `2px solid ${color.bronze[500]}`,
  outlineOffset: 2,
}

const base = createTheme(
  {
    palette: {
      mode: 'light',
      primary: {
        main: color.bronze[600],
        light: color.bronze[500],
        dark: color.bronze[700],
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: color.gold[400],
        light: color.gold[300],
        dark: color.gold[600],
        contrastText: color.ink[600],
      },
      success: { ...color.success, contrastText: '#FFFFFF' },
      warning: { ...color.warning, contrastText: '#FFFFFF' },
      error: { ...color.error, contrastText: '#FFFFFF' },
      info: { ...color.info, contrastText: '#FFFFFF' },
      text: {
        primary: color.ink[600],
        secondary: color.neutral[600],
        disabled: color.neutral[400],
      },
      background: {
        default: color.sand[100],
        paper: color.neutral[0],
      },
      divider: color.neutral[200],
      action: {
        hover: alpha(color.bronze[500], 0.08),
        selected: alpha(color.bronze[500], 0.14),
        focus: alpha(color.bronze[500], 0.16),
        disabledBackground: color.neutral[100],
        disabled: color.neutral[400],
      },
      brand: {
        bronze: color.bronze[500],
        bronzeSoft: color.bronze[50],
        gold: color.gold[400],
        goldSoft: color.gold[100],
        sand: color.sand[200],
        ink: color.ink[900],
      },
      surface: {
        canvas: color.sand[100],
        raised: color.neutral[0],
        sunken: color.neutral[50],
        border: color.neutral[200],
        borderStrong: color.neutral[300],
      },
    },
    shape: { borderRadius: radius.md },
    shadows,
    typography: {
      fontFamily: fontFamily.sans,
      htmlFontSize: 16,
      fontSize: 14,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700,
      // Page title (PageHeader) uses h4; h1–h3 exist for legacy pages and auth screens.
      h1: { fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
      h2: { fontSize: '1.625rem', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.015em' },
      h3: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em' },
      h4: { fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' },
      h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.35 },
      h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
      subtitle1: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.45 },
      subtitle2: { fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.45 },
      body1: { fontSize: '0.875rem', lineHeight: 1.55 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
      caption: { fontSize: '0.75rem', lineHeight: 1.45, letterSpacing: 0 },
      overline: {
        // Kept for MUI internals; the design system does not use all-caps labels.
        fontSize: '0.75rem',
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: '0.02em',
        textTransform: 'none',
      },
      button: { fontSize: '0.875rem', fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
      arabic: {
        fontFamily: fontFamily.arabic,
        fontSize: arabicSize.md,
        fontWeight: 400,
        lineHeight: 1.9,
        letterSpacing: 0,
      },
    },
  },
  ruRU,
)

export const theme = createTheme(base, {
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { WebkitTextSizeAdjust: '100%' },
        body: {
          backgroundColor: color.sand[100],
          color: color.ink[600],
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          fontFeatureSettings: '"tnum" 0',
        },
        '::selection': { backgroundColor: color.sand[200], color: color.ink[600] },
        ':focus-visible': focusRing,
        '[lang="ar"], [dir="rtl"]': { fontFamily: fontFamily.arabic },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },

    MuiTypography: {
      defaultProps: {
        variantMapping: { arabic: 'p' },
      },
    },

    MuiButtonBase: {
      styleOverrides: {
        root: { '&.Mui-focusVisible': focusRing },
      },
    },

    MuiButton: {
      // Focus is shown by the outline ring; the pulsing focus ripple would double it.
      defaultProps: { disableElevation: true, disableFocusRipple: true },
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          minHeight: 36,
          padding: '6px 14px',
          transition: `background-color ${motion.fast} ${motion.easing}, border-color ${motion.fast} ${motion.easing}, color ${motion.fast} ${motion.easing}`,
          '&.Mui-focusVisible': focusRing,
          '& .MuiButton-startIcon > *:nth-of-type(1), & .MuiButton-endIcon > *:nth-of-type(1)': {
            fontSize: 18,
          },
        },
        sizeSmall: { minHeight: 30, padding: '4px 10px', fontSize: '0.8125rem' },
        sizeLarge: { minHeight: 44, padding: '10px 20px', fontSize: '0.9375rem' },
        contained: {
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          '&:hover': { backgroundColor: color.bronze[700] },
          '&.Mui-disabled': { backgroundColor: color.bronze[200], color: '#FFFFFF' },
        },
        outlined: {
          borderColor: color.neutral[300],
          backgroundColor: color.neutral[0],
          '&:hover': { borderColor: color.neutral[400], backgroundColor: color.neutral[50] },
        },
        outlinedPrimary: {
          color: color.bronze[700],
          borderColor: color.bronze[300],
          '&:hover': { borderColor: color.bronze[500], backgroundColor: color.bronze[50] },
        },
        outlinedError: {
          borderColor: alpha(color.error.main, 0.45),
          '&:hover': { borderColor: color.error.main, backgroundColor: color.error.soft },
        },
        text: { padding: '6px 10px' },
        textPrimary: {
          color: color.bronze[700],
          '&:hover': { backgroundColor: color.bronze[50] },
        },
      },
    },

    MuiIconButton: {
      defaultProps: { disableFocusRipple: true },
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          color: color.neutral[600],
          '&:hover': { backgroundColor: alpha(color.bronze[500], 0.1), color: color.ink[600] },
          '&.Mui-focusVisible': focusRing,
        },
        sizeSmall: { padding: 5 },
      },
    },

    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          color: color.neutral[600],
          borderColor: color.neutral[300],
          '&.Mui-selected': {
            backgroundColor: color.sand[200],
            color: color.ink[600],
            '&:hover': { backgroundColor: color.bronze[100] },
          },
        },
      },
    },

    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
    },
    MuiFormControl: {
      defaultProps: { size: 'small' },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          backgroundColor: color.neutral[0],
          transition: `box-shadow ${motion.fast} ${motion.easing}`,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: color.neutral[400] },
          '&:hover:not(.Mui-disabled):not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
            borderColor: color.neutral[600],
          },
          '&.Mui-focused': { boxShadow: shadow.focus },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: color.bronze[600],
            borderWidth: 1,
          },
          '&.Mui-error.Mui-focused': { boxShadow: shadow.focusError },
          '&.Mui-disabled': { backgroundColor: color.neutral[50] },
          '&.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: color.neutral[200] },
        },
        input: {
          '&::placeholder': { color: color.neutral[500], opacity: 1 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: color.neutral[600],
          '&.Mui-focused': { color: color.bronze[700] },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { marginLeft: 2, marginRight: 2, fontSize: '0.75rem' } },
    },
    MuiFormLabel: {
      styleOverrides: { root: { fontSize: '0.8125rem', fontWeight: 600, color: color.ink[600] } },
    },
    MuiSelect: {
      styleOverrides: {
        icon: { color: color.neutral[600] },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          border: `1px solid ${color.neutral[200]}`,
          boxShadow: shadow.md,
          borderRadius: radius.lg,
        },
        option: { fontSize: '0.875rem' },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          border: `1px solid ${color.neutral[200]}`,
          boxShadow: shadow.md,
          borderRadius: radius.lg,
          marginTop: 4,
        },
        list: { padding: 4 },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: { border: `1px solid ${color.neutral[200]}`, boxShadow: shadow.md, borderRadius: radius.lg },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          borderRadius: radius.sm,
          minHeight: 36,
          '&.Mui-selected': {
            backgroundColor: color.sand[200],
            '&:hover': { backgroundColor: color.bronze[100] },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: color.sand[200],
            '&:hover': { backgroundColor: color.bronze[100] },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: { root: { minWidth: 36, color: color.neutral[600] } },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: radius.lg },
        outlined: { borderColor: color.neutral[200] },
        // Flat paper used as a surface gets a hairline; elevated paper (menus, dialogs) uses shadows.
        elevation0: { border: `1px solid ${color.neutral[200]}` },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          border: `1px solid ${color.neutral[200]}`,
          boxShadow: 'none',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: { root: { padding: 20, '&:last-child': { paddingBottom: 20 } } },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: { padding: '16px 20px' },
        title: { fontSize: '1rem', fontWeight: 600 },
        subheader: { fontSize: '0.8125rem', color: color.neutral[600] },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: radius.xl, boxShadow: shadow.lg, border: 'none' },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: { '&:not(.MuiBackdrop-invisible)': { backgroundColor: 'rgba(28, 22, 18, 0.45)' } },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontSize: '1.125rem', fontWeight: 700, padding: '20px 24px 8px' } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: '12px 24px' } },
    },
    MuiDialogContentText: {
      styleOverrides: { root: { color: color.neutral[600], fontSize: '0.875rem' } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: '12px 24px 20px', gap: 8, '& > :not(style) ~ :not(style)': { marginLeft: 0 } } },
    },

    MuiDrawer: {
      styleOverrides: { paper: { border: 'none', borderRadius: 0 } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: {
        root: {
          backgroundColor: color.neutral[0],
          border: 'none',
          borderBottom: `1px solid ${color.neutral[200]}`,
          color: color.ink[600],
        },
      },
    },

    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          border: `1px solid ${color.neutral[200]}`,
          backgroundColor: color.neutral[0],
          // TableContainer is often given component={Paper}: avoid a double border.
          '&.MuiPaper-root': { boxShadow: 'none' },
        },
      },
    },
    MuiTable: {
      styleOverrides: { root: { borderCollapse: 'separate', borderSpacing: 0 } },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: color.neutral[50],
            color: color.neutral[600],
            fontSize: '0.8125rem',
            fontWeight: 600,
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            borderBottom: `1px solid ${color.neutral[200]}`,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          padding: '10px 14px',
          borderBottom: `1px solid ${color.neutral[100]}`,
        },
        sizeSmall: { padding: '6px 12px' },
        stickyHeader: { backgroundColor: color.neutral[50] },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.MuiTableRow-hover:hover': { backgroundColor: color.bronze[50] },
          '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: color.sand[200] },
          '&:last-child > td': { borderBottom: 'none' },
        },
      },
    },
    MuiTableSortLabel: {
      styleOverrides: {
        root: {
          '&.Mui-active': { color: color.ink[600] },
          '&:hover': { color: color.ink[600] },
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: { borderTop: `1px solid ${color.neutral[200]}` },
        toolbar: { minHeight: 48 },
        selectLabel: { fontSize: '0.8125rem' },
        displayedRows: { fontSize: '0.8125rem' },
      },
    },

    MuiChip: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          fontWeight: 600,
          fontSize: '0.75rem',
          height: 26,
        },
        sizeSmall: { height: 22 },
        label: { paddingLeft: 8, paddingRight: 8 },
        filled: {
          '&.MuiChip-colorDefault': { backgroundColor: color.neutral[100], color: color.neutral[700] },
          '&.MuiChip-colorPrimary': { backgroundColor: color.bronze[100], color: color.bronze[800] },
          '&.MuiChip-colorSecondary': { backgroundColor: color.gold[100], color: color.gold[800] },
          '&.MuiChip-colorSuccess': { backgroundColor: color.success.soft, color: color.success.dark },
          '&.MuiChip-colorWarning': { backgroundColor: color.warning.soft, color: color.warning.dark },
          '&.MuiChip-colorError': { backgroundColor: color.error.soft, color: color.error.dark },
          '&.MuiChip-colorInfo': { backgroundColor: color.info.soft, color: color.info.dark },
          '&.MuiChip-clickable:hover': { filter: 'brightness(0.97)' },
        },
        outlined: { borderColor: color.neutral[300], backgroundColor: color.neutral[0] },
        deleteIcon: { fontSize: 16 },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 42, borderBottom: `1px solid ${color.neutral[200]}` },
        indicator: { height: 2, backgroundColor: color.bronze[600] },
      },
    },
    MuiTab: {
      defaultProps: { disableFocusRipple: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          minHeight: 42,
          minWidth: 0,
          padding: '8px 14px',
          color: color.neutral[600],
          '&.Mui-selected': { color: color.ink[600] },
          '&.Mui-focusVisible': { ...focusRing, outlineOffset: -2 },
        },
      },
    },

    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 300 },
      styleOverrides: {
        tooltip: {
          backgroundColor: color.ink[900],
          color: '#FFF8EE',
          fontSize: '0.75rem',
          fontWeight: 500,
          borderRadius: radius.sm,
          padding: '6px 10px',
        },
        arrow: { color: color.ink[900] },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: radius.md, fontSize: '0.875rem', alignItems: 'flex-start' },
        message: { padding: '8px 0' },
        icon: { padding: '8px 0' },
        standardSuccess: { backgroundColor: color.success.soft, color: color.success.dark, border: `1px solid ${alpha(color.success.main, 0.2)}` },
        standardError: { backgroundColor: color.error.soft, color: color.error.dark, border: `1px solid ${alpha(color.error.main, 0.2)}` },
        standardWarning: { backgroundColor: color.warning.soft, color: color.warning.dark, border: `1px solid ${alpha(color.warning.main, 0.2)}` },
        standardInfo: { backgroundColor: color.info.soft, color: color.info.dark, border: `1px solid ${alpha(color.info.main, 0.2)}` },
      },
    },
    MuiAlertTitle: {
      styleOverrides: { root: { fontWeight: 700, fontSize: '0.875rem', marginBottom: 2 } },
    },
    MuiSnackbar: {
      defaultProps: { anchorOrigin: { vertical: 'bottom', horizontal: 'center' } },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 3, height: 4, backgroundColor: color.bronze[100] },
        bar: { borderRadius: 3 },
      },
    },
    MuiCircularProgress: {
      defaultProps: { thickness: 4.5 },
    },
    MuiSkeleton: {
      defaultProps: { animation: 'wave' },
      styleOverrides: {
        root: { backgroundColor: color.neutral[100] },
        rounded: { borderRadius: radius.md },
      },
    },

    MuiAccordion: {
      defaultProps: { elevation: 0, disableGutters: true },
      styleOverrides: {
        root: {
          border: `1px solid ${color.neutral[200]}`,
          borderRadius: radius.lg,
          '&:before': { display: 'none' },
          '&:not(:last-of-type)': { marginBottom: 8 },
          '&.Mui-expanded:not(:last-of-type)': { marginBottom: 8 },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: { minHeight: 48, borderRadius: radius.lg, '&.Mui-expanded': { minHeight: 48 } },
        content: { margin: '10px 0', '&.Mui-expanded': { margin: '10px 0' } },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked + .MuiSwitch-track': { opacity: 1 },
        },
        track: { backgroundColor: color.neutral[400], opacity: 1 },
      },
    },
    MuiCheckbox: {
      styleOverrides: { root: { color: color.neutral[400] } },
    },
    MuiRadio: {
      styleOverrides: { root: { color: color.neutral[400] } },
    },

    MuiDivider: {
      styleOverrides: { root: { borderColor: color.neutral[200] } },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { fontSize: '0.8125rem', fontWeight: 700 },
        colorDefault: { backgroundColor: color.sand[200], color: color.bronze[800] },
      },
    },
    MuiBadge: {
      styleOverrides: { badge: { fontWeight: 700, fontSize: '0.6875rem' } },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: { fontSize: '0.8125rem', color: color.neutral[600] },
        separator: { marginLeft: 6, marginRight: 6, color: color.neutral[400] },
      },
    },
    MuiLink: {
      defaultProps: { underline: 'hover' },
      styleOverrides: {
        root: {
          color: color.bronze[700],
          fontWeight: 500,
          textUnderlineOffset: '2px',
          '&.Mui-focusVisible, &:focus-visible': focusRing,
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          '&.Mui-selected': { backgroundColor: color.sand[200], color: color.ink[600] },
        },
      },
    },
  },
})

export type AppTheme = typeof theme
