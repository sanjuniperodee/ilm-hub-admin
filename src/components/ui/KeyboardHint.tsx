import { Box, type SxProps, type Theme } from '@mui/material'
import { Fragment } from 'react'
import { color, fontFamily, radius } from '../../theme/tokens'
import { mergeSx, visuallyHidden } from './sx'

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)

const KEY_LABELS: Record<string, string> = {
  mod: isMac ? '⌘' : 'Ctrl',
  ctrl: isMac ? '⌃' : 'Ctrl',
  alt: isMac ? '⌥' : 'Alt',
  shift: isMac ? '⇧' : 'Shift',
  enter: '↵',
  esc: 'Esc',
  escape: 'Esc',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  backspace: '⌫',
}

export interface KeyboardHintProps {
  /**
   * Keys of the shortcut, in order. Use `'Mod'` for Cmd on macOS / Ctrl elsewhere.
   * Named keys (`Shift`, `Alt`, `Enter`, `Esc`, arrows) are rendered as platform symbols.
   */
  keys: string[]
  /** `dark` for use inside tooltips and on the navigation rail. */
  tone?: 'light' | 'dark'
  size?: 'small' | 'medium'
  sx?: SxProps<Theme>
}

/** Human-readable label for a shortcut, e.g. for `aria-keyshortcuts` or tooltips. */
export function formatShortcut(keys: string[]): string {
  return keys.map((k) => KEY_LABELS[k.toLowerCase()] ?? k.toUpperCase()).join(isMac ? '' : '+')
}

/**
 * Renders a keyboard shortcut as `<kbd>` keys.
 *
 * @example
 * <KeyboardHint keys={['Mod', 'S']} />            // ⌘ S on macOS, Ctrl S elsewhere
 * <Tooltip title={<>Свернуть меню <KeyboardHint keys={['[']} tone="dark" /></>}>…
 */
export function KeyboardHint({ keys, tone = 'light', size = 'small', sx }: KeyboardHintProps) {
  const dark = tone === 'dark'
  return (
    <Box
      component="span"
      sx={mergeSx({ display: 'inline-flex', alignItems: 'center', gap: 0.5, verticalAlign: 'middle' }, sx)}
    >
      <Box component="span" sx={visuallyHidden}>
        {formatShortcut(keys)}
      </Box>
      {keys.map((k, i) => (
        <Fragment key={`${k}-${i}`}>
          <Box
            component="kbd"
            aria-hidden
            sx={{
              fontFamily: fontFamily.mono,
              fontSize: size === 'small' ? '0.6875rem' : '0.75rem',
              fontWeight: 600,
              lineHeight: 1,
              minWidth: size === 'small' ? 18 : 22,
              height: size === 'small' ? 18 : 22,
              px: 0.5,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: `${radius.xs}px`,
              color: dark ? 'rgba(255,248,238,0.85)' : color.neutral[700],
              backgroundColor: dark ? 'rgba(255,248,238,0.12)' : color.neutral[0],
              border: `1px solid ${dark ? 'rgba(255,248,238,0.18)' : color.neutral[300]}`,
              boxShadow: dark ? 'none' : `inset 0 -1px 0 ${color.neutral[300]}`,
            }}
          >
            {KEY_LABELS[k.toLowerCase()] ?? k.toUpperCase()}
          </Box>
        </Fragment>
      ))}
    </Box>
  )
}
