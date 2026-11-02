import type { ReactNode } from 'react'
import { Box, Drawer, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { Close } from '@mui/icons-material'
import { stopAudioPlayback } from './audio'

export interface EditorDrawerProps {
  open: boolean
  onClose: () => void
  /** Action-style title: «Новое слово», «Буква Алиф». */
  title: ReactNode
  subtitle?: ReactNode
  /** Large preview next to the title (Arabic word / letter). */
  preview?: ReactNode
  /** Line under the title row, e.g. a completeness list. */
  meta?: ReactNode
  /** Footer buttons: outlined «Отмена» then the contained verb. */
  footer: ReactNode
  children: ReactNode
  /** Desktop width in px. Mobile is always full-screen. */
  width?: number
}

/**
 * Right-side editor used across the Words and Islam sections. The list stays visible
 * on wide screens so the editor keeps its context; below `sm` it covers the screen.
 */
export function EditorDrawer({ open, onClose, title, subtitle, preview, meta, footer, children, width = 640 }: EditorDrawerProps) {
  const close = () => {
    stopAudioPlayback()
    onClose()
  }
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={close}
      PaperProps={{
        sx: { width: { xs: '100%', sm: width }, maxWidth: '100vw', display: 'flex', flexDirection: 'column' },
        role: 'dialog',
        'aria-modal': true,
      }}
    >
      <Stack
        component="header"
        direction="row"
        alignItems="flex-start"
        gap={2}
        sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="h2" sx={{ fontSize: '1.125rem', fontWeight: 700, overflowWrap: 'anywhere' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
          {meta && <Box sx={{ mt: 1.25 }}>{meta}</Box>}
        </Box>
        {preview && <Box sx={{ flexShrink: 0, maxWidth: '45%' }}>{preview}</Box>}
        <Tooltip title="Закрыть">
          <IconButton onClick={close} aria-label="Закрыть" size="small" sx={{ mt: -0.25, mr: -1 }}>
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, pt: 3, pb: 1 }}>{children}</Box>
      <Stack
        component="footer"
        direction="row"
        gap={1}
        justifyContent="flex-end"
        alignItems="center"
        flexWrap="wrap"
        sx={{
          px: 3,
          py: 1.5,
          pb: { xs: 'max(12px, env(safe-area-inset-bottom, 0px))', sm: 1.5 },
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'surface.sunken',
          flexShrink: 0,
        }}
      >
        {footer}
      </Stack>
    </Drawer>
  )
}
