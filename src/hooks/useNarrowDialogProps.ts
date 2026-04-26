import { useMediaQuery, useTheme } from '@mui/material'
import type { DialogProps } from '@mui/material/Dialog'

/** `sx` for bottom actions / keyboard area on notched phones (use on DialogActions). */
export const dialogActionsSafeAreaSx = {
  pb: { xs: 'max(12px, env(safe-area-inset-bottom, 0px))', sm: 2 },
  pt: 1,
} as const

/** Mobile-friendly full-screen for tall forms; desktop keeps `desktopMaxWidth`. */
export function useNarrowDialogProps(
  desktopMaxWidth: DialogProps['maxWidth'] = 'md',
): Pick<DialogProps, 'fullScreen' | 'fullWidth' | 'scroll' | 'maxWidth'> {
  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'))

  return {
    fullScreen: isNarrow,
    fullWidth: true,
    maxWidth: isNarrow ? false : desktopMaxWidth,
    scroll: 'body',
  }
}
