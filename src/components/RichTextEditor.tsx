/**
 * Lesson rich-text editor (TipTap). The schema comes from `richtext/extensions.ts` and the
 * saved HTML is converted to IlmDoc on save (docs/RICH_TEXT_FORMAT.md) — this file only
 * changes how editing looks and feels, never what is stored.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AudiotrackOutlined,
  Close,
  DeleteOutline,
  FormatBold,
  FormatClear,
  FormatColorText,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  FormatUnderlined,
  GifBoxOutlined,
  ImageOutlined,
  KeyboardArrowDown,
  LinkOutlined,
  Redo,
  TableChartOutlined,
  Translate,
  Undo,
  UploadFileOutlined,
  VideoLibraryOutlined,
  ZoomInMap,
  ZoomOutMap,
  AutoFixHighOutlined,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type NodeViewProps,
} from '@tiptap/react'
import {
  AudioNode,
  VideoNode,
  buildIlmRichtextExtensions,
  normalizeHtmlForEditor,
  ILM_RICHTEXT_AUDIO_CLASS,
  ILM_RICHTEXT_AUDIO_COMPACT_CLASS,
  ILM_RICHTEXT_AUDIO_TD_CLASS,
} from '../richtext/extensions'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { wrapRichTextTables } from '../utils/wrapRichTextTables'
import { validateUploadSize } from '../constants/uploadLimits'
import { KeyboardHint, arabicInputProps, getErrorMessage, useConfirm } from './ui'
import { color, fontFamily, radius } from '../theme'

const FONT_SIZES = [
  { value: '', label: 'Обычный' },
  { value: '10px', label: '10' },
  { value: '13px', label: '13' },
  { value: '18px', label: '18' },
  { value: '24px', label: '24' },
  { value: '32px', label: '32' },
  { value: '48px', label: '48' },
]

/** Text colours offered to authors; IlmDoc keeps `#rrggbb`. */
const TEXT_COLORS = [
  { value: color.ink[600], label: 'Чёрный' },
  { value: color.bronze[600], label: 'Бронзовый' },
  { value: color.gold[600], label: 'Золотой' },
  { value: color.success.main, label: 'Зелёный' },
  { value: color.error.main, label: 'Красный' },
  { value: color.info.main, label: 'Синий' },
  { value: color.neutral[600], label: 'Серый' },
]

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  onUploadFile?: (file: File) => Promise<{ id: string; url: string; type: 'image' | 'audio' | 'video'; mimeType?: string }>
  onRemoveMedia?: (mediaId: string) => Promise<void>
  /** Accessible name of the editing area, e.g. «Текст блока (RU)». */
  ariaLabel?: string
}

function escapeHtmlAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function escapeHtmlText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Dispatches an empty, history-less transaction so normalising plugins run now. */
function settleSchema(editor: Editor) {
  if (editor.isDestroyed) return
  editor.view.dispatch(editor.state.tr.setMeta('addToHistory', false))
}

function editorHtmlForSave(editor: Editor) {
  return wrapRichTextTables(editor.getHTML())
}

function buildAudioHtml(options: { url: string; mediaId?: string; compact: boolean }) {
  const { url, mediaId, compact } = options
  const idAttr = mediaId ? ` data-media-id="${escapeHtmlAttr(mediaId)}"` : ''
  const cls = compact ? `${ILM_RICHTEXT_AUDIO_CLASS} ${ILM_RICHTEXT_AUDIO_COMPACT_CLASS}` : ILM_RICHTEXT_AUDIO_CLASS
  const style = compact
    ? 'max-width:min(220px,100%);min-width:120px;height:40px;vertical-align:middle;display:inline-block;border-radius:8px;'
    : 'width:100%;max-width:100%;min-height:40px;vertical-align:middle;border-radius:10px;'
  const safeUrl = escapeHtmlAttr(url)
  return `<audio class="${cls}"${idAttr} controls preload="metadata" style="${style}" src="${safeUrl}"><source${idAttr} src="${safeUrl}" /></audio>`
}

function isInAudioColumn(editor: Editor) {
  const attrs = editor.getAttributes('tableCell')
  return typeof attrs.class === 'string' && attrs.class.includes(ILM_RICHTEXT_AUDIO_TD_CLASS)
}

function getSelectedMediaAttrs(editor: Editor): { type: 'image' | 'audio' | 'video'; mediaId?: string; widthPct?: number } | null {
  const { selection } = editor.state
  const node = (selection as any).node
  if (!node || !['image', 'audio', 'video'].includes(node.type.name)) return null
  return {
    type: node.type.name,
    mediaId: node.attrs.mediaId || undefined,
    widthPct: Number(node.attrs.widthPct) || 100,
  }
}

/** Signs that pasted HTML came from Word / Google Docs / a web page with its own styling. */
function looksLikeStyledPaste(html: string) {
  return /class=|mso-|font-family|<font|<div|data-pm-slice|<o:p|google-docs|docs-internal/i.test(html)
}

function MediaNodeView({ node, selected, getPos, editor }: NodeViewProps) {
  const confirm = useConfirm()
  const attrs = node.attrs as Record<string, string>
  const mediaId = attrs.mediaId || undefined
  const isAudio = node.type.name === 'audio'
  const wrapperStyle: React.CSSProperties = { position: 'relative', display: 'block', margin: '6px 0' }
  const stopNativeAudio = (event: React.SyntheticEvent) => {
    // Prevent the native <audio controls> from grabbing the mousedown/click
    // so the user can still select the node and trigger the trash button.
    event.stopPropagation()
  }
  const selectThisNode = (event: React.SyntheticEvent) => {
    if (typeof getPos !== 'function') return
    const pos = getPos()
    if (typeof pos !== 'number') return
    // Don't hijack clicks on the actual <audio>/<video> controls.
    const target = event.target as HTMLElement
    if (target.closest('audio') || target.closest('video')) return
    event.preventDefault()
    event.stopPropagation()
    editor?.chain().focus().setNodeSelection(pos).run()
  }
  const handleRemove = async (event: React.SyntheticEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (typeof getPos !== 'function') return
    const ok = await confirm({
      title: isAudio ? 'Удалить аудио?' : 'Удалить видео?',
      description: 'Файл исчезнет из текста и из хранилища.',
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (!ok) return
    const pos = getPos()
    if (typeof pos !== 'number') return
    // Delete the node, then notify the parent so the media file is also removed from storage.
    editor?.chain().focus().setNodeSelection(pos).deleteSelection().run()
    if (!mediaId) return
    const onRemove = (editor?.options as any)?.editorProps?.onRemoveMedia as ((id: string) => Promise<void>) | undefined
    if (typeof onRemove === 'function') {
      onRemove(mediaId).catch((e) => toast.error(getErrorMessage(e, 'Не удалось удалить файл')))
    }
  }
  const removeButton = (
    <IconButton
      size="small"
      aria-label={isAudio ? 'Удалить аудио' : 'Удалить видео'}
      title={isAudio ? 'Удалить аудио' : 'Удалить видео'}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => void handleRemove(e)}
      sx={{
        position: 'absolute',
        top: 4,
        right: 4,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': { bgcolor: 'error.main', color: 'common.white', borderColor: 'error.main' },
        opacity: selected ? 1 : 0.85,
      }}
    >
      <DeleteOutline fontSize="small" />
    </IconButton>
  )
  if (isAudio) {
    return (
      <NodeViewWrapper as="div" className="ilm-richtext-audio-wrap" data-selected={selected ? 'true' : undefined} style={wrapperStyle} onMouseDown={selectThisNode} onClick={selectThisNode}>
        <audio
          className={attrs.class}
          data-media-id={mediaId}
          controls
          preload="metadata"
          src={attrs.src}
          onMouseDown={stopNativeAudio}
          onClick={stopNativeAudio}
          style={attrs.style ? undefined : { width: '100%' }}
        >
          <source data-media-id={mediaId} src={attrs.src} />
        </audio>
        {removeButton}
      </NodeViewWrapper>
    )
  }
  return (
    <NodeViewWrapper as="div" className="ilm-richtext-video-wrap" data-selected={selected ? 'true' : undefined} style={wrapperStyle} onMouseDown={selectThisNode} onClick={selectThisNode}>
      <video data-media-id={mediaId} controls preload="metadata" src={attrs.src} style={attrs.style ? undefined : { maxWidth: '100%' }}>
        <source src={attrs.src} />
      </video>
      {removeButton}
    </NodeViewWrapper>
  )
}

const ARABIC_LETTER = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g
const ANY_LETTER = /\p{L}/gu

/** Same rule as the app: a paragraph is right-to-left when more than half of its letters are Arabic. */
export function isMostlyArabic(text: string) {
  const letters = text.match(ANY_LETTER)?.length ?? 0
  if (!letters) return false
  return (text.match(ARABIC_LETTER)?.length ?? 0) / letters > 0.5
}

/**
 * Editor-only: marks mostly-Arabic paragraphs/headings with dir="rtl" through decorations,
 * so authors see them as the app shows them. Decorations never reach the saved HTML/IlmDoc.
 */
const ArabicDirection = Extension.create({
  name: 'ilmArabicDirection',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('ilmArabicDirection'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (node.isTextblock) {
                if (isMostlyArabic(node.textContent)) decorations.push(Decoration.node(pos, pos + node.nodeSize, { dir: 'rtl' }))
                return false
              }
              return true
            })
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})

const AudioNodeWithView = AudioNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MediaNodeView)
  },
})

const VideoNodeWithView = VideoNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MediaNodeView)
  },
})

// ── Toolbar building blocks ────────────────────────────────────────────────

function ToolButton({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
  danger,
}: {
  label: string
  shortcut?: string[]
  active?: boolean
  disabled?: boolean
  onClick: (e: React.MouseEvent<HTMLElement>) => void
  children: ReactNode
  danger?: boolean
}) {
  return (
    <Tooltip
      title={
        <Stack direction="row" gap={1} alignItems="center">
          <span>{label}</span>
          {shortcut && <KeyboardHint keys={shortcut} tone="dark" />}
        </Stack>
      }
    >
      <span>
        <IconButton
          size="small"
          aria-label={label}
          aria-pressed={active === undefined ? undefined : active}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          sx={{
            width: 32,
            height: 32,
            borderRadius: `${radius.sm}px`,
            color: active ? 'primary.main' : 'text.secondary',
            bgcolor: active ? 'brand.sand' : 'transparent',
            '&:hover': { bgcolor: active ? 'brand.sand' : 'surface.sunken', color: danger ? 'error.main' : 'text.primary' },
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  )
}

function ToolGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Stack direction="row" alignItems="center" gap={0.25} role="group" aria-label={label} sx={{ flexShrink: 0 }}>
      {children}
    </Stack>
  )
}

const GroupDivider = () => <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

// ── Dialogs ─────────────────────────────────────────────────────────────────

function LinkDialog({ open, initial, onClose, onSubmit, onRemove }: { open: boolean; initial: string; onClose: () => void; onSubmit: (url: string) => void; onRemove?: () => void }) {
  const [url, setUrl] = useState(initial)
  useEffect(() => {
    if (open) setUrl(initial)
  }, [open, initial])
  const trimmed = url.trim()
  const valid = /^(https?:\/\/|mailto:)\S+$/i.test(trimmed)
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="rte-link-title">
      <DialogTitle id="rte-link-title">{initial ? 'Изменить ссылку' : 'Добавить ссылку'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Адрес"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && valid) onSubmit(trimmed)
          }}
          error={!!trimmed && !valid}
          helperText={trimmed && !valid ? 'Адрес должен начинаться с https:// или mailto:' : 'Ссылка откроется в браузере телефона'}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        {onRemove && initial && (
          <Button color="error" onClick={onRemove} sx={{ mr: 'auto' }}>
            Убрать ссылку
          </Button>
        )}
        <Button variant="outlined" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="contained" disabled={!valid} onClick={() => onSubmit(trimmed)}>
          Сохранить ссылку
        </Button>
      </DialogActions>
    </Dialog>
  )
}

type TableKind = 'plain' | 'numbered' | 'audio'

function TableDialog({ open, kind, onClose, onSubmit }: { open: boolean; kind: TableKind; onClose: () => void; onSubmit: (kind: TableKind, rows: number, cols: number) => void }) {
  const [k, setK] = useState<TableKind>(kind)
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  useEffect(() => {
    if (open) setK(kind)
  }, [open, kind])
  const maxRows = k === 'numbered' ? 30 : 20
  const r = Math.max(1, Math.min(maxRows, rows || 1))
  const c = Math.max(1, Math.min(10, cols || 1))
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="rte-table-title">
      <DialogTitle id="rte-table-title">Вставить таблицу</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ mt: 1 }}>
          <ToggleButtonGroup exclusive fullWidth size="small" value={k} onChange={(_, v) => v && setK(v)} aria-label="Вид таблицы" sx={{ '& .MuiToggleButton-root': { textTransform: 'none' } }}>
            <ToggleButton value="plain">Обычная</ToggleButton>
            <ToggleButton value="numbered">Нумерованная</ToggleButton>
            <ToggleButton value="audio">Текст + аудио</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="body2" color="text.secondary">
            {k === 'plain' && 'Сетка ячеек без заголовка.'}
            {k === 'numbered' && 'Две колонки: номер строки и текст. Удобно для списков примеров.'}
            {k === 'audio' && 'Слева текст, справа узкая колонка под аудио. Перетащите файл в правую ячейку или загрузите записи во все строки сразу.'}
          </Typography>
          <Stack direction="row" gap={2}>
            <TextField type="number" label="Строк" value={rows} onChange={(e) => setRows(Number(e.target.value))} inputProps={{ min: 1, max: maxRows }} fullWidth />
            {k === 'plain' && <TextField type="number" label="Столбцов" value={cols} onChange={(e) => setCols(Number(e.target.value))} inputProps={{ min: 1, max: 10 }} fullWidth />}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="contained" onClick={() => onSubmit(k, r, c)}>
          Вставить таблицу
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function ArabicDialog({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (text: string, size: string) => void }) {
  const [text, setText] = useState('')
  const [size, setSize] = useState('24px')
  useEffect(() => {
    if (open) setText('')
  }, [open])
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="rte-arabic-title">
      <DialogTitle id="rte-arabic-title">Вставить арабский текст</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Текст вставится отдельным абзацем справа налево. Каждая новая строка — новый абзац. Огласовки сохраняются.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          label="Арабский текст"
          value={text}
          onChange={(e) => setText(e.target.value)}
          inputProps={{ ...arabicInputProps, style: { ...arabicInputProps.style, fontSize: 26, lineHeight: 1.9 } }}
          placeholder="بِسْمِ ٱللَّٰهِ"
        />
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ mt: 2 }}>
          <Typography variant="body2" id="rte-arabic-size">
            Размер
          </Typography>
          <ToggleButtonGroup exclusive size="small" value={size} onChange={(_, v) => v !== null && setSize(v)} aria-labelledby="rte-arabic-size" sx={{ '& .MuiToggleButton-root': { textTransform: 'none', px: 1.5 } }}>
            <ToggleButton value="">Как текст</ToggleButton>
            <ToggleButton value="24px">Крупный</ToggleButton>
            <ToggleButton value="32px">Очень крупный</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="contained" disabled={!text.trim()} onClick={() => onSubmit(text, size)}>
          Вставить
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function UrlDialog({ open, title, onClose, onSubmit }: { open: boolean; title: string; onClose: () => void; onSubmit: (url: string) => void }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (open) setUrl('')
  }, [open])
  const valid = /^https?:\/\/\S+$/i.test(url.trim())
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField autoFocus fullWidth label="Ссылка на файл" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" sx={{ mt: 1 }} />
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="contained" disabled={!valid} onClick={() => onSubmit(url.trim())}>
          Вставить
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Editor ──────────────────────────────────────────────────────────────────

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Введите текст…',
  minHeight = 180,
  onUploadFile,
  onRemoveMedia,
  ariaLabel = 'Текст',
}: RichTextEditorProps) {
  const confirm = useConfirm()
  const currentHtmlRef = useRef(value || '')
  const [uploadingFileName, setUploadingFileName] = useState('')
  const [draggingFileOverEditor, setDraggingFileOverEditor] = useState(false)
  const [pasteNotice, setPasteNotice] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [tableDialog, setTableDialog] = useState<TableKind | null>(null)
  const [arabicOpen, setArabicOpen] = useState(false)
  const [urlDialog, setUrlDialog] = useState<null | 'image' | 'audio' | 'video'>(null)
  const [tableMenu, setTableMenu] = useState<HTMLElement | null>(null)
  const [colorMenu, setColorMenu] = useState<HTMLElement | null>(null)
  const uploadRef = useRef<(files: File[]) => Promise<void>>(async () => {})
  const openLinkRef = useRef<() => void>(() => {})

  const extensions = useMemo(() => [...buildIlmRichtextExtensions({ audio: AudioNodeWithView, video: VideoNodeWithView }), ArabicDirection], [])

  const editor = useEditor({
    extensions,
    content: normalizeHtmlForEditor(value || ''),
    editorProps: {
      // Custom prop consumed by MediaNodeView to remove the underlying media file from storage.
      // Cast: TipTap's EditorProps doesn't model this field, but it's surfaced on
      // `editor.options.editorProps` at runtime.
      ...({ onRemoveMedia } as Record<string, unknown>),
      attributes: {
        class: 'ilm-tiptap-editor',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': ariaLabel,
      },
      handleKeyDown(_view, event) {
        if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'k') {
          event.preventDefault()
          openLinkRef.current()
          return true
        }
        return false
      },
      handlePaste(_view, event) {
        const files = Array.from(event.clipboardData?.files || []).filter((file) => /^(image|audio|video)\//.test(file.type || ''))
        if (files.length > 0 && onUploadFile) {
          event.preventDefault()
          void uploadRef.current(files)
          return true
        }
        const html = event.clipboardData?.getData('text/html') || ''
        if (html && looksLikeStyledPaste(html)) setPasteNotice(true)
        return false
      },
      handleDrop(view, event) {
        if (!onUploadFile) return false
        const files = Array.from(event.dataTransfer?.files || []).filter((file) => /^(image|audio|video)\//.test(file.type || ''))
        if (files.length === 0) return false
        event.preventDefault()
        setDraggingFileOverEditor(false)
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
        if (pos) {
          view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, pos.pos)))
        }
        void uploadRef.current(files)
        return true
      },
    },
    onUpdate({ editor }) {
      const next = editorHtmlForSave(editor)
      currentHtmlRef.current = next
      onChange(next)
    },
  })

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null
      const media = getSelectedMediaAttrs(e)
      return {
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        underline: e.isActive('underline'),
        bullet: e.isActive('bulletList'),
        ordered: e.isActive('orderedList'),
        link: e.isActive('link'),
        linkHref: (e.getAttributes('link').href as string) || '',
        heading: e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3' : e.isActive('heading', { level: 1 }) ? 'h2' : 'p',
        fontSize: (e.getAttributes('textStyle').fontSize as string) || '',
        color: (e.getAttributes('textStyle').color as string) || '',
        inTable: e.isActive('table'),
        media,
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        isEmpty: e.isEmpty,
      }
    },
  })

  useEffect(() => {
    if (!editor) return
    const nextValue = value || ''
    if (nextValue !== currentHtmlRef.current) {
      editor.commands.setContent(normalizeHtmlForEditor(nextValue), { emitUpdate: false })
      currentHtmlRef.current = nextValue
      settleSchema(editor)
    }
  }, [editor, value])

  // Schema plugins (e.g. the trailing empty paragraph after a list or table) normalise the
  // document on the first transaction. Run it right away, while the lesson editor treats
  // changes as part of loading — otherwise the first click marks the block as edited.
  useEffect(() => {
    if (editor) settleSchema(editor)
  }, [editor])

  useEffect(() => {
    if (!pasteNotice) return
    const t = window.setTimeout(() => setPasteNotice(false), 9000)
    return () => window.clearTimeout(t)
  }, [pasteNotice])

  const emitCurrentHtml = () => {
    if (!editor) return
    const next = editorHtmlForSave(editor)
    currentHtmlRef.current = next
    onChange(next)
  }

  const insertHtmlAtCursor = (html: string) => {
    editor?.chain().focus().insertContent(html).run()
  }

  const uploadFileToEditor = async (file: File) => {
    if (!editor || !onUploadFile) return
    const sizeError = validateUploadSize(file)
    if (sizeError) {
      toast.error(sizeError)
      return
    }
    try {
      setUploadingFileName(file.name)
      const uploaded = await onUploadFile(file)
      if (uploaded.type === 'audio') {
        insertHtmlAtCursor(buildAudioHtml({ url: uploaded.url, mediaId: uploaded.id, compact: isInAudioColumn(editor) }))
      } else if (uploaded.type === 'video') {
        insertHtmlAtCursor(
          `<video data-media-id="${escapeHtmlAttr(uploaded.id)}" controls preload="metadata" style="max-width:100%;border-radius:8px;vertical-align:middle;" src="${escapeHtmlAttr(uploaded.url)}"><source src="${escapeHtmlAttr(uploaded.url)}" /></video>`,
        )
      } else {
        insertHtmlAtCursor(
          `<img data-media-id="${escapeHtmlAttr(uploaded.id)}" src="${escapeHtmlAttr(uploaded.url)}" alt="${escapeHtmlAttr(file.name)}" style="max-width:100%;height:auto;border-radius:8px;vertical-align:middle;" />`,
        )
      }
    } catch (e) {
      toast.error(getErrorMessage(e, `Не удалось загрузить «${file.name}»`))
    } finally {
      setUploadingFileName('')
    }
  }

  const uploadFilesToEditor = async (files: File[]) => {
    for (const file of files) {
      await uploadFileToEditor(file)
    }
  }
  uploadRef.current = uploadFilesToEditor
  openLinkRef.current = () => setLinkOpen(true)

  const pickAndUpload = (accept: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = true
    input.onchange = (event) => {
      void uploadFilesToEditor(Array.from((event.target as HTMLInputElement).files || []))
    }
    input.click()
  }

  const insertMedia = (kind: 'image' | 'gif' | 'audio' | 'video') => {
    if (onUploadFile) {
      pickAndUpload(kind === 'image' ? 'image/*' : kind === 'gif' ? 'image/gif,image/*' : kind === 'audio' ? 'audio/*' : 'video/*')
      return
    }
    setUrlDialog(kind === 'gif' ? 'image' : kind)
  }

  const insertMediaByUrl = (kind: 'image' | 'audio' | 'video', url: string) => {
    if (!editor) return
    if (kind === 'image') insertHtmlAtCursor(`<img src="${escapeHtmlAttr(url)}" style="max-width:100%;height:auto;border-radius:8px;" />`)
    else if (kind === 'audio') insertHtmlAtCursor(buildAudioHtml({ url, compact: isInAudioColumn(editor) }))
    else insertHtmlAtCursor(`<video controls preload="metadata" src="${escapeHtmlAttr(url)}" style="max-width:100%;border-radius:8px;"><source src="${escapeHtmlAttr(url)}" /></video>`)
  }

  const insertTable = (kind: TableKind, rows: number, cols: number) => {
    if (!editor) return
    if (kind === 'plain') {
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: false }).run()
      emitCurrentHtml()
    } else if (kind === 'numbered') {
      const body = Array.from({ length: rows })
        .map((_, idx) => `<tr><td style="width:56px;border:1px solid #c9bcad;padding:10px 8px;text-align:center;">${idx + 1}.</td><td style="border:1px solid #c9bcad;padding:10px 12px;">&nbsp;</td></tr>`)
        .join('')
      insertHtmlAtCursor(`<table style="width:100%;border-collapse:collapse;"><tbody>${body}</tbody></table><p></p>`)
    } else {
      const body = Array.from({ length: rows })
        .map(
          () =>
            '<tr>' +
            '<td style="border:1px solid #c9bcad;padding:10px 12px;vertical-align:middle;">&nbsp;</td>' +
            `<td class="${ILM_RICHTEXT_AUDIO_TD_CLASS}" style="border:1px solid #c9bcad;padding:8px 10px;vertical-align:middle;width:1%;min-width:128px;max-width:44%;text-align:center;background:#faf8f5;">&nbsp;</td>` +
            '</tr>',
        )
        .join('')
      insertHtmlAtCursor(`<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tbody>${body}</tbody></table><p></p>`)
    }
    setTableDialog(null)
  }

  const bulkUploadAudioToTable = () => {
    if (!editor || !onUploadFile) return
    const template = document.createElement('template')
    template.innerHTML = editor.getHTML()
    if (template.content.querySelectorAll(`td.${ILM_RICHTEXT_AUDIO_TD_CLASS}`).length === 0) {
      toast.error('Сначала вставьте таблицу «Текст + аудио»')
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    input.multiple = true
    input.onchange = async (event) => {
      const files = Array.from((event.target as HTMLInputElement).files || []).filter((file) => file.type.startsWith('audio/'))
      if (files.length === 0) return
      const tooBig = files.map(validateUploadSize).find(Boolean)
      if (tooBig) {
        toast.error(tooBig)
        return
      }
      const tpl = document.createElement('template')
      tpl.innerHTML = editor.getHTML()
      const cells = Array.from(tpl.content.querySelectorAll(`td.${ILM_RICHTEXT_AUDIO_TD_CLASS}`)) as HTMLTableCellElement[]
      let placed = 0
      try {
        for (let i = 0; i < Math.min(files.length, cells.length); i += 1) {
          setUploadingFileName(`${i + 1} из ${Math.min(files.length, cells.length)}: ${files[i].name}`)
          const uploaded = await onUploadFile(files[i])
          cells[i].innerHTML = buildAudioHtml({ url: uploaded.url, mediaId: uploaded.id, compact: true })
          placed += 1
        }
        editor.commands.setContent(tpl.innerHTML, { emitUpdate: true })
        toast.success(`Аудио добавлено в строк: ${placed}${files.length > cells.length ? `. Лишних файлов: ${files.length - cells.length}` : ''}`)
      } catch (e) {
        if (placed > 0) editor.commands.setContent(tpl.innerHTML, { emitUpdate: true })
        toast.error(getErrorMessage(e, 'Не удалось загрузить аудио'))
      } finally {
        setUploadingFileName('')
      }
    }
    input.click()
  }

  const removeCurrentMedia = async () => {
    if (!editor) return
    const media = getSelectedMediaAttrs(editor)
    if (!media) return
    const ok = await confirm({
      title: 'Удалить медиа из текста?',
      description: media.mediaId ? 'Файл будет удалён и из хранилища.' : undefined,
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (!ok) return
    editor.chain().focus().deleteSelection().run()
    if (media.mediaId && onRemoveMedia) {
      try {
        await onRemoveMedia(media.mediaId)
      } catch (e) {
        toast.error(getErrorMessage(e, 'Не удалось удалить файл'))
      }
    }
  }

  const resizeCurrentMedia = (direction: 'smaller' | 'larger') => {
    if (!editor) return
    const media = getSelectedMediaAttrs(editor)
    if (!media) return
    const next = Math.min(100, Math.max(25, (media.widthPct || 100) + (direction === 'larger' ? 25 : -25)))
    const style =
      media.type === 'audio'
        ? `width:${next}%;max-width:100%;min-height:40px;vertical-align:middle;border-radius:10px;`
        : `max-width:${next}%;height:auto;border-radius:8px;vertical-align:middle;`
    editor.chain().focus().updateAttributes(media.type, { widthPct: next, style }).run()
  }

  const insertArabic = (text: string, size: string) => {
    if (!editor) return
    const paragraphs = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => (size ? `<p><span style="font-size: ${size}">${escapeHtmlText(l)}</span></p>` : `<p>${escapeHtmlText(l)}</p>`))
      .join('')
    editor.chain().focus().insertContent(paragraphs).run()
    setArabicOpen(false)
  }

  if (!editor || !state) return null

  const tableActions: { label: string; run: () => void }[] = [
    { label: 'Строка выше', run: () => editor.chain().focus().addRowBefore().run() },
    { label: 'Строка ниже', run: () => editor.chain().focus().addRowAfter().run() },
    { label: 'Столбец слева', run: () => editor.chain().focus().addColumnBefore().run() },
    { label: 'Столбец справа', run: () => editor.chain().focus().addColumnAfter().run() },
  ]

  const showContext = state.inTable || !!state.media

  return (
    <Box sx={{ border: '1px solid', borderColor: color.neutral[400], borderRadius: `${radius.md}px`, minWidth: 0, bgcolor: 'background.paper', '&:focus-within': { borderColor: 'primary.main', boxShadow: `0 0 0 1px ${color.bronze[600]}` } }}>
      <Box sx={{ position: 'sticky', top: 56, zIndex: 3, borderTopLeftRadius: `${radius.md}px`, borderTopRightRadius: `${radius.md}px` }}>
      <Box
        role="toolbar"
        aria-label="Форматирование текста"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          rowGap: 0.5,
          px: 0.75,
          py: 0.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'surface.sunken',
          borderTopLeftRadius: `${radius.md}px`,
          borderTopRightRadius: `${radius.md}px`,
        }}
      >
        <ToolGroup label="История">
          <ToolButton label="Отменить" shortcut={['Mod', 'Z']} disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
            <Undo fontSize="small" />
          </ToolButton>
          <ToolButton label="Повторить" shortcut={['Mod', 'Shift', 'Z']} disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
            <Redo fontSize="small" />
          </ToolButton>
        </ToolGroup>
        <GroupDivider />
        <ToolGroup label="Стиль текста">
          <Select
            size="small"
            value={state.heading}
            inputProps={{ 'aria-label': 'Стиль абзаца' }}
            onChange={(e) => {
              const v = e.target.value
              if (v === 'p') editor.chain().focus().setParagraph().run()
              else editor.chain().focus().setHeading({ level: v === 'h2' ? 2 : 3 }).run()
            }}
            sx={{ height: 32, width: 150, fontSize: 13, bgcolor: 'background.paper' }}
          >
            <MenuItem value="p">Обычный текст</MenuItem>
            <MenuItem value="h2">Заголовок</MenuItem>
            <MenuItem value="h3">Подзаголовок</MenuItem>
          </Select>
          <ToolButton label="Жирный" shortcut={['Mod', 'B']} active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
            <FormatBold fontSize="small" />
          </ToolButton>
          <ToolButton label="Курсив" shortcut={['Mod', 'I']} active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <FormatItalic fontSize="small" />
          </ToolButton>
          <ToolButton label="Подчёркнутый" shortcut={['Mod', 'U']} active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <FormatUnderlined fontSize="small" />
          </ToolButton>
          <Tooltip title="Размер шрифта">
            <Select
              size="small"
              value={FONT_SIZES.some((s) => s.value === state.fontSize) ? state.fontSize : ''}
              displayEmpty
              inputProps={{ 'aria-label': 'Размер шрифта' }}
              onChange={(e) => {
                const size = e.target.value as string
                if (size) editor.chain().focus().setFontSize(size).run()
                else editor.chain().focus().unsetFontSize().run()
              }}
              renderValue={(v) => (v ? `${parseInt(v as string, 10)} px` : 'Размер')}
              sx={{ height: 32, width: 108, fontSize: 13, ml: 0.25, bgcolor: 'background.paper' }}
            >
              {FONT_SIZES.map((s) => (
                <MenuItem key={s.value} value={s.value} sx={{ fontSize: 13 }}>
                  {s.value ? `${s.label} px` : s.label}
                </MenuItem>
              ))}
            </Select>
          </Tooltip>
          <ToolButton label="Цвет текста" active={!!state.color} onClick={(e) => setColorMenu(e.currentTarget)}>
            <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
              <FormatColorText fontSize="small" />
              <Box sx={{ position: 'absolute', bottom: -3, left: 2, right: 2, height: 3, borderRadius: 1, bgcolor: state.color || 'transparent' }} />
            </Box>
          </ToolButton>
          <ToolButton label="Очистить форматирование" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
            <FormatClear fontSize="small" />
          </ToolButton>
        </ToolGroup>
        <GroupDivider />
        <ToolGroup label="Списки и ссылки">
          <ToolButton label="Маркированный список" shortcut={['Mod', 'Shift', '8']} active={state.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <FormatListBulleted fontSize="small" />
          </ToolButton>
          <ToolButton label="Нумерованный список" shortcut={['Mod', 'Shift', '7']} active={state.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <FormatListNumbered fontSize="small" />
          </ToolButton>
          <ToolButton label="Ссылка" shortcut={['Mod', 'K']} active={state.link} onClick={() => setLinkOpen(true)}>
            <LinkOutlined fontSize="small" />
          </ToolButton>
        </ToolGroup>
        <GroupDivider />
        <ToolGroup label="Таблицы">
          <Tooltip title="Таблицы">
            <Button
              size="small"
              color="inherit"
              aria-haspopup="menu"
              aria-label="Таблицы"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => setTableMenu(e.currentTarget)}
              startIcon={<TableChartOutlined fontSize="small" />}
              endIcon={<KeyboardArrowDown fontSize="small" />}
              sx={{ height: 32, minWidth: 0, px: 1, color: state.inTable ? 'primary.main' : 'text.secondary', '& .MuiButton-startIcon': { mr: 0.5 }, '& .MuiButton-endIcon': { ml: 0 } }}
            >
              <Box component="span" sx={{ display: { xs: 'none', lg: 'inline' } }}>
                Таблица
              </Box>
            </Button>
          </Tooltip>
        </ToolGroup>
        <GroupDivider />
        <ToolGroup label="Медиа">
          <ToolButton label={onUploadFile ? 'Фото — загрузить' : 'Фото по ссылке'} onClick={() => insertMedia('image')}>
            <ImageOutlined fontSize="small" />
          </ToolButton>
          <ToolButton label={onUploadFile ? 'GIF — загрузить' : 'GIF по ссылке'} onClick={() => insertMedia('gif')}>
            <GifBoxOutlined fontSize="small" />
          </ToolButton>
          <ToolButton label={onUploadFile ? 'Аудио — загрузить' : 'Аудио по ссылке'} onClick={() => insertMedia('audio')}>
            <AudiotrackOutlined fontSize="small" />
          </ToolButton>
          <ToolButton label={onUploadFile ? 'Видео — загрузить' : 'Видео по ссылке'} onClick={() => insertMedia('video')}>
            <VideoLibraryOutlined fontSize="small" />
          </ToolButton>
        </ToolGroup>
        <GroupDivider />
        <Button
          size="small"
          variant="outlined"
          startIcon={<Translate fontSize="small" />}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setArabicOpen(true)}
          sx={{ height: 30, bgcolor: 'background.paper', flexShrink: 0 }}
        >
          Арабский текст
        </Button>
      </Box>

      {showContext && (
        <Stack
          direction="row"
          alignItems="center"
          gap={0.5}
          flexWrap="wrap"
          role="toolbar"
          aria-label={state.media ? 'Выбранное медиа' : 'Таблица'}
          sx={{ px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: color.bronze[50] }}
        >
          {state.media ? (
            <>
              <Typography variant="caption" sx={{ fontWeight: 600, mr: 0.5 }}>
                {state.media.type === 'image' ? 'Картинка' : state.media.type === 'audio' ? 'Аудио' : 'Видео'}, ширина {state.media.widthPct}%
              </Typography>
              <ToolButton label="Уменьшить" disabled={(state.media.widthPct || 100) <= 25} onClick={() => resizeCurrentMedia('smaller')}>
                <ZoomInMap fontSize="small" />
              </ToolButton>
              <ToolButton label="Увеличить" disabled={(state.media.widthPct || 100) >= 100} onClick={() => resizeCurrentMedia('larger')}>
                <ZoomOutMap fontSize="small" />
              </ToolButton>
              <ToolButton label="Удалить медиа" danger onClick={() => void removeCurrentMedia()}>
                <DeleteOutline fontSize="small" />
              </ToolButton>
            </>
          ) : (
            <>
              <Typography variant="caption" sx={{ fontWeight: 600, mr: 0.5 }}>
                Таблица
              </Typography>
              {tableActions.map((a) => (
                <Button key={a.label} size="small" color="inherit" onMouseDown={(e) => e.preventDefault()} onClick={a.run} sx={{ height: 28, px: 1, fontSize: 13 }}>
                  {a.label}
                </Button>
              ))}
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <Button size="small" color="inherit" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteRow().run()} sx={{ height: 28, px: 1, fontSize: 13 }}>
                Удалить строку
              </Button>
              <Button size="small" color="inherit" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteColumn().run()} sx={{ height: 28, px: 1, fontSize: 13 }}>
                Удалить столбец
              </Button>
              <Button size="small" color="error" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteTable().run()} sx={{ height: 28, px: 1, fontSize: 13 }}>
                Удалить таблицу
              </Button>
            </>
          )}
        </Stack>
      )}

      {uploadingFileName ? (
        <Stack direction="row" gap={1} alignItems="center" role="status" sx={{ px: 1.5, py: 0.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'surface.sunken' }}>
          <CircularProgress size={14} />
          <Typography variant="caption" color="text.secondary" noWrap>
            Загружаем {uploadingFileName}
          </Typography>
        </Stack>
      ) : null}

      {pasteNotice && (
        <Stack direction="row" gap={1} alignItems="center" role="status" sx={{ px: 1.5, py: 0.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: color.info.soft }}>
          <AutoFixHighOutlined sx={{ fontSize: 16, color: color.info.dark }} />
          <Typography variant="caption" sx={{ color: color.info.dark, flex: 1 }}>
            Текст вставлен без чужих стилей и шрифтов. Сохранились заголовки, списки, таблицы, жирный, курсив, размер и цвет — проверьте, как он выглядит в предпросмотре.
          </Typography>
          <IconButton size="small" aria-label="Скрыть подсказку" onClick={() => setPasteNotice(false)}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>
      )}
      </Box>

      <Box
        sx={{
          position: 'relative',
          minWidth: 0,
          '& .ilm-tiptap-editor': {
            px: { xs: 1.5, sm: 2 },
            py: 1.5,
            minHeight: { xs: Math.max(140, minHeight - 40), sm: minHeight },
            outline: 'none',
            overflowX: 'auto',
            overflowWrap: 'anywhere',
            fontFamily: `'Montserrat', ${fontFamily.arabic}`,
            fontSize: 15,
            lineHeight: 1.65,
          },
          '& .ilm-tiptap-editor [dir="rtl"]': { textAlign: 'right', fontSize: '1.3em', lineHeight: 1.9 },
          '& .ilm-tiptap-editor h1, & .ilm-tiptap-editor h2': { fontSize: 20, fontWeight: 700, margin: '12px 0 6px' },
          '& .ilm-tiptap-editor h3': { fontSize: 17, fontWeight: 600, margin: '10px 0 4px' },
          '& .ilm-tiptap-editor p': { margin: '6px 0' },
          '& .ilm-tiptap-editor ul, & .ilm-tiptap-editor ol': { margin: '8px 0', paddingInlineStart: '22px' },
          '& .ilm-tiptap-editor a': { color: 'primary.main' },
          '& .ilm-tiptap-editor table': { width: '100%', minWidth: { xs: 360, sm: '100%' }, borderCollapse: 'collapse', borderSpacing: 0, margin: '8px 0' },
          '& .ilm-tiptap-editor .tableWrapper': { maxWidth: '100%', overflowX: 'auto' },
          '& .ilm-tiptap-editor td, & .ilm-tiptap-editor th': { border: `1px solid ${color.neutral[300]}`, padding: { xs: '8px 9px', sm: '10px 12px' }, verticalAlign: 'middle', position: 'relative' },
          '& .ilm-tiptap-editor .selectedCell': { bgcolor: color.bronze[50] },
          [`& .ilm-tiptap-editor .${ILM_RICHTEXT_AUDIO_TD_CLASS}`]: { textAlign: 'center', whiteSpace: 'nowrap', bgcolor: color.neutral[50], minWidth: { xs: 112, sm: 128 } },
          '& .ilm-tiptap-editor img, & .ilm-tiptap-editor video, & .ilm-tiptap-editor audio': { maxWidth: '100%' },
          '& .ilm-tiptap-editor audio': { width: '100%', minWidth: 0 },
          '& .ilm-tiptap-editor .ProseMirror-selectednode, & [data-selected="true"]': { outline: `2px solid ${color.bronze[500]}`, outlineOffset: 2, borderRadius: '4px' },
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files') && onUploadFile) {
            e.preventDefault()
            setDraggingFileOverEditor(true)
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as globalThis.Node | null)) setDraggingFileOverEditor(false)
        }}
      >
        <EditorContent editor={editor} />
        {state.isEmpty ? (
          <Typography variant="body1" color="text.secondary" sx={{ position: 'absolute', top: 18, left: { xs: 12, sm: 16 }, right: 16, pointerEvents: 'none', opacity: 0.8 }}>
            {placeholder}
          </Typography>
        ) : null}
        {draggingFileOverEditor ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 8,
              zIndex: 4,
              border: '2px dashed',
              borderColor: color.bronze[500],
              borderRadius: `${radius.md}px`,
              bgcolor: 'rgba(250, 243, 234, 0.92)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
              Отпустите файл, чтобы вставить его в текст
            </Typography>
          </Box>
        ) : null}
      </Box>

      <Stack
        direction="row"
        gap={1}
        alignItems="center"
        flexWrap="wrap"
        sx={{ px: 1.5, py: 0.75, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'surface.sunken', borderBottomLeftRadius: `${radius.md}px`, borderBottomRightRadius: `${radius.md}px` }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 200 }}>
          {onUploadFile
            ? 'Файлы можно перетащить прямо в текст: фото до 1 МБ, аудио до 3 МБ, видео до 30 МБ.'
            : 'Медиа вставляются по ссылке.'}
        </Typography>
        {onUploadFile && (
          <Button size="small" color="inherit" startIcon={<UploadFileOutlined fontSize="small" />} onClick={bulkUploadAudioToTable} sx={{ fontSize: 12, color: 'text.secondary' }}>
            Аудио во все строки таблицы
          </Button>
        )}
      </Stack>

      <Menu anchorEl={tableMenu} open={!!tableMenu} onClose={() => setTableMenu(null)}>
        <MenuItem
          onClick={() => {
            setTableMenu(null)
            setTableDialog('plain')
          }}
        >
          <ListItemText primary="Обычная таблица" secondary="Сетка ячеек" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setTableMenu(null)
            setTableDialog('numbered')
          }}
        >
          <ListItemText primary="Нумерованная" secondary="Номер и текст в каждой строке" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setTableMenu(null)
            setTableDialog('audio')
          }}
        >
          <ListItemText primary="Текст + аудио" secondary="Слева текст, справа запись" />
        </MenuItem>
        <Divider />
        <MenuItem
          disabled={!onUploadFile}
          onClick={() => {
            setTableMenu(null)
            bulkUploadAudioToTable()
          }}
        >
          <ListItemIcon>
            <UploadFileOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Загрузить аудио во все строки" secondary="Файлы встанут по порядку в правую колонку" />
        </MenuItem>
      </Menu>

      <Menu anchorEl={colorMenu} open={!!colorMenu} onClose={() => setColorMenu(null)} MenuListProps={{ 'aria-label': 'Цвет текста' }}>
        {TEXT_COLORS.map((c) => (
          <MenuItem
            key={c.value}
            selected={state.color?.toLowerCase() === c.value.toLowerCase()}
            onClick={() => {
              editor.chain().focus().setColor(c.value).run()
              setColorMenu(null)
            }}
          >
            <ListItemIcon>
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: c.value, border: '1px solid', borderColor: 'divider' }} />
            </ListItemIcon>
            <ListItemText primary={c.label} />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            editor.chain().focus().unsetColor().run()
            setColorMenu(null)
          }}
        >
          <ListItemText inset primary="Без цвета" />
        </MenuItem>
      </Menu>

      <LinkDialog
        open={linkOpen}
        initial={state.linkHref}
        onClose={() => setLinkOpen(false)}
        onSubmit={(url) => {
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
          setLinkOpen(false)
        }}
        onRemove={() => {
          editor.chain().focus().extendMarkRange('link').unsetLink().run()
          setLinkOpen(false)
        }}
      />
      <TableDialog open={!!tableDialog} kind={tableDialog ?? 'plain'} onClose={() => setTableDialog(null)} onSubmit={insertTable} />
      <ArabicDialog open={arabicOpen} onClose={() => setArabicOpen(false)} onSubmit={insertArabic} />
      <UrlDialog
        open={!!urlDialog}
        title={urlDialog === 'image' ? 'Картинка по ссылке' : urlDialog === 'audio' ? 'Аудио по ссылке' : 'Видео по ссылке'}
        onClose={() => setUrlDialog(null)}
        onSubmit={(url) => {
          if (urlDialog) insertMediaByUrl(urlDialog, url)
          setUrlDialog(null)
        }}
      />
    </Box>
  )
}
