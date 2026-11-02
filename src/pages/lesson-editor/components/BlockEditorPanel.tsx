import { useState, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { ContentCopyOutlined, DeleteOutline, HistoryOutlined, MoreHoriz, Undo } from '@mui/icons-material'
import { FormSection, StatusChip } from '../../../components/ui'
import { color, radius } from '../../../theme'
import { BLOCK_CATEGORIES, BLOCK_TYPES, getBlockTypeInfo } from '../blockTypes'
import type { StoredDraft } from '../useBlockDraft'
import type { BlockType, Lang } from '../types'
import { BlockTypeIcon } from './AddBlockMenu'
import { BlockFields, type BlockFieldsProps } from './BlockFields'
import { LocaleTabs } from './LocaleTabs'

function formatDraftSavedAt(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

export interface BlockEditorPanelProps extends BlockFieldsProps {
  setLang: (l: Lang) => void
  kzGaps: string[]
  dirty: boolean
  position: number
  total: number
  availableDraft: StoredDraft | null
  onRestoreDraft: () => void
  onDismissDraft: () => void
  saveErrors: string[]
  onChangeType: (t: BlockType) => void
  onDuplicate?: () => void
  onDelete: () => void
  onRevert: () => void
  /** Preview toggle shown in the header (when the preview is not docked). */
  previewToggle?: ReactNode
  /** Remount key for editors (new block opened, draft restored). */
  session: number
}

export function BlockEditorPanel(props: BlockEditorPanelProps) {
  const { draft, setDraft, lang, setLang, kzGaps, dirty, position, total, availableDraft, saveErrors, warnings, showIssues } = props
  const [menu, setMenu] = useState<HTMLElement | null>(null)
  const info = getBlockTypeInfo(draft.type)
  const isNew = !draft.id
  const shownWarnings = showIssues ? warnings : []

  return (
    <Box
      component="section"
      aria-labelledby="block-editor-title"
      sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: `${radius.lg}px`, minWidth: 0 }}
    >
      <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 2 }}>
        <Stack direction="row" alignItems="flex-start" gap={1.5}>
          <BlockTypeIcon type={draft.type} size={36} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography id="block-editor-title" variant="h6" component="h2">
                {info?.label ?? draft.type}
              </Typography>
              {isNew ? <StatusChip label="Новый, не сохранён" tone="info" /> : dirty ? <StatusChip label="Есть изменения" tone="warning" /> : null}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {isNew ? `Встанет в конец урока, позиция ${position}` : `Блок ${position} из ${total}`}
              {info ? `. ${info.description}` : ''}
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" gap={0.5} sx={{ flexShrink: 0 }}>
            {dirty && !isNew && (
              <Tooltip title="Отменить несохранённые изменения">
                <IconButton aria-label="Отменить несохранённые изменения" onClick={props.onRevert}>
                  <Undo fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {props.previewToggle}
            <Tooltip title="Действия с блоком">
              <IconButton aria-label="Действия с блоком" aria-haspopup="menu" onClick={(e) => setMenu(e.currentTarget)}>
                <MoreHoriz />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Box sx={{ mt: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <LocaleTabs value={lang} onChange={setLang} kzGaps={kzGaps} />
        </Box>
      </Box>

      <Box id="block-editor-body" role="tabpanel" aria-labelledby={`lang-tab-${lang}`} sx={{ px: { xs: 2, md: 2.5 }, py: 2.5 }}>
        {availableDraft && (
          <Alert severity="warning" icon={<HistoryOutlined />} sx={{ mb: 2.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Найден несохранённый черновик{availableDraft.savedAt ? ` от ${formatDraftSavedAt(availableDraft.savedAt)}` : ''}
            </Typography>
            <Typography variant="body2">Он сохранился в этом браузере автоматически. Восстановите его, чтобы продолжить с того места.</Typography>
            <Stack direction="row" gap={1} sx={{ mt: 1 }} flexWrap="wrap">
              <Button size="small" variant="outlined" color="inherit" onClick={props.onRestoreDraft} sx={{ bgcolor: 'background.paper' }}>
                Восстановить черновик
              </Button>
              <Button size="small" color="inherit" onClick={props.onDismissDraft}>
                Удалить черновик
              </Button>
            </Stack>
          </Alert>
        )}

        {saveErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2.5 }}>
            {saveErrors.length === 1 ? saveErrors[0] : (
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {saveErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </Box>
            )}
          </Alert>
        )}

        {shownWarnings.length > 0 && (
          <Alert severity="warning" variant="outlined" sx={{ mb: 2.5, bgcolor: color.warning.soft }}>
            Проверьте упражнение: {shownWarnings.map((w) => w.message.charAt(0).toLowerCase() + w.message.slice(1)).join('; ')}.
          </Alert>
        )}

        <Box key={props.session}>
          <BlockFields {...props} />
        </Box>

        <FormSection title="Параметры блока" description="Тип и место блока в уроке. Порядок удобнее менять перетаскиванием в списке слева.">
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
            <TextField
              select
              label="Тип блока"
              value={draft.type}
              onChange={(e) => props.onChangeType(e.target.value as BlockType)}
              helperText={isNew ? undefined : 'При смене типа часть содержимого может не перенестись'}
              sx={{ flex: 2 }}
              SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 420 } } } }}
            >
              {BLOCK_CATEGORIES.flatMap((cat) => [
                <ListSubheader key={`h-${cat.id}`} sx={{ lineHeight: '32px', fontWeight: 600 }}>
                  {cat.label}
                </ListSubheader>,
                ...BLOCK_TYPES.filter((t) => t.category === cat.id).map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                )),
              ])}
            </TextField>
            <TextField
              type="number"
              label="Позиция"
              value={draft.orderIndex}
              onChange={(e) => setDraft((p) => ({ ...p, orderIndex: Number(e.target.value) || 1 }))}
              inputProps={{ min: 1 }}
              sx={{ flex: 1, maxWidth: { sm: 160 } }}
            />
          </Stack>
        </FormSection>
      </Box>

      <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
        {props.onDuplicate && (
          <MenuItem
            disabled={isNew}
            onClick={() => {
              setMenu(null)
              props.onDuplicate?.()
            }}
          >
            <ListItemIcon>
              <ContentCopyOutlined fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Дублировать" secondary={isNew ? 'Сначала сохраните блок' : 'Копия встанет следом'} />
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            setMenu(null)
            props.onDelete()
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteOutline fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText primary={isNew ? 'Отменить новый блок' : 'Удалить блок'} />
        </MenuItem>
      </Menu>
    </Box>
  )
}
