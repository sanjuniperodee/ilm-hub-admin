import { Box, Drawer, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { Close, VisibilityOffOutlined } from '@mui/icons-material'
import { MobilePreviewFrame, type MobilePreviewBlock } from '../../../components/MobilePreview'
import { radius, shadow } from '../../../theme'
import type { Lang } from '../types'

interface PreviewBodyProps {
  block: MobilePreviewBlock | null
  lang: Lang
  onLangChange: (l: Lang) => void
  maxFrameH: number
  maxFrameW: number
}

function PreviewBody({ block, lang, onLangChange, maxFrameH, maxFrameW }: PreviewBodyProps) {
  if (!block) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
        Откройте блок, чтобы увидеть, как он выглядит в приложении.
      </Typography>
    )
  }
  return <MobilePreviewFrame block={block} compact maxFrameH={maxFrameH} maxFrameW={maxFrameW} locale={lang} onLocaleChange={onLangChange} />
}

/** Docked live preview (right column on wide screens). */
export function DockedPreview(props: PreviewBodyProps & { onHide: () => void }) {
  return (
    <Box
      component="aside"
      aria-label="Предпросмотр в приложении"
      sx={{ bgcolor: 'surface.sunken', border: '1px solid', borderColor: 'divider', borderRadius: `${radius.lg}px`, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, pt: 1, pb: 0.5 }}>
        <Box>
          <Typography variant="subtitle2" component="h2">
            В приложении
          </Typography>
          <Typography variant="caption" color="text.secondary" component="p">
            Обновляется, пока вы печатаете
          </Typography>
        </Box>
        <Tooltip title="Скрыть предпросмотр">
          <IconButton size="small" aria-label="Скрыть предпросмотр" onClick={props.onHide}>
            <VisibilityOffOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1, pb: 1.5 }}>
        <PreviewBody {...props} />
      </Box>
    </Box>
  )
}

/**
 * Preview in a side panel over the page (laptops and tablets). Non-modal: the editor
 * stays usable, so the preview updates while you type.
 */
export function DrawerPreview(props: PreviewBodyProps & { open: boolean; onClose: () => void }) {
  return (
    <Drawer
      anchor="right"
      open={props.open}
      onClose={props.onClose}
      variant="persistent"
      PaperProps={{
        role: 'complementary',
        'aria-label': 'Предпросмотр в приложении',
        sx: { width: 380, maxWidth: '100vw', top: 56, height: 'calc(100% - 56px)', bgcolor: 'surface.canvas', boxShadow: shadow.lg },
      } as any}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" component="h2">
          Предпросмотр в приложении
        </Typography>
        <IconButton aria-label="Закрыть предпросмотр" onClick={props.onClose}>
          <Close />
        </IconButton>
      </Stack>
      <Box sx={{ p: 1.5, overflowY: 'auto' }}>
        <PreviewBody {...props} />
      </Box>
    </Drawer>
  )
}
