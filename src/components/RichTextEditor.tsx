import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Audiotrack,
  Clear,
  DeleteOutline,
  FormatBold,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  FormatUnderlined,
  GifBox,
  Image as ImageIcon,
  Link as LinkIcon,
  LooksOne,
  TableChart,
  Title,
  UploadFile,
  VideoLibrary,
  ViewColumn,
  ZoomInMap,
  ZoomOutMap,
} from '@mui/icons-material'
import { EditorContent, ReactNodeViewRenderer, NodeViewWrapper, useEditor, type NodeViewProps } from '@tiptap/react'
import { Extension, mergeAttributes, Node as TiptapNode } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { TextSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/core'
import {
  ILM_RICHTEXT_TABLE_WRAP_CLASS,
  wrapRichTextTables,
} from '../utils/wrapRichTextTables'

const FONT_FAMILIES = [
  { value: '', label: 'Шрифт', family: '', weight: '' },
  { value: 'montserrat-400', label: 'Montserrat Regular (400)', family: 'Montserrat', weight: '400' },
  { value: 'montserrat-500', label: 'Montserrat Medium (500)', family: 'Montserrat', weight: '500' },
  { value: 'gilroy-300', label: 'Gilroy Light', family: 'Gilroy', weight: '300' },
  { value: 'gilroy-400', label: 'Gilroy Regular', family: 'Gilroy', weight: '400' },
  { value: 'inter-400', label: 'Inter Regular', family: 'Inter', weight: '400' },
  { value: 'inter-500', label: 'Inter Medium', family: 'Inter', weight: '500' },
  { value: 'inter-600', label: 'Inter Semibold', family: 'Inter', weight: '600' },
  { value: 'noto-400', label: 'Noto Sans Arabic', family: 'Noto Sans Arabic', weight: '400' },
  { value: 'noto-500', label: 'Noto Sans Medium', family: 'Noto Sans Arabic', weight: '500' },
  { value: 'noto-600', label: 'Noto Sans Regular', family: 'Noto Sans Arabic', weight: '600' },
]

const FONT_SIZES = [
  { value: '', label: 'Размер' },
  { value: '10px', label: '10px' },
  { value: '13px', label: '13px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '24px', label: '24px' },
  { value: '32px', label: '32px' },
  { value: '48px', label: '48px' },
]

const ILM_RICHTEXT_AUDIO_CLASS = 'ilm-richtext-audio'
const ILM_RICHTEXT_AUDIO_COMPACT_CLASS = 'ilm-richtext-audio--compact'
const ILM_RICHTEXT_AUDIO_TD_CLASS = 'ilm-richtext-td-audio'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  onUploadFile?: (file: File) => Promise<{ id: string; url: string; type: 'image' | 'audio' | 'video'; mimeType?: string }>
  onRemoveMedia?: (mediaId: string) => Promise<void>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
  }
}

function escapeHtmlAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function normalizeHtmlForEditor(html: string) {
  const template = document.createElement('template')
  template.innerHTML = html || ''
  template.content.querySelectorAll(`.${ILM_RICHTEXT_TABLE_WRAP_CLASS}`).forEach((wrap) => {
    const table = wrap.querySelector('table')
    if (table) wrap.replaceWith(table)
  })
  template.content.querySelectorAll('audio').forEach((audio) => {
    const source = audio.querySelector('source')
    const src = audio.getAttribute('src') || source?.getAttribute('src')
    if (src && !audio.getAttribute('src')) audio.setAttribute('src', src)
    const mediaId = audio.getAttribute('data-media-id') || source?.getAttribute('data-media-id')
    if (mediaId && !audio.getAttribute('data-media-id')) audio.setAttribute('data-media-id', mediaId)
  })
  template.content.querySelectorAll('video').forEach((video) => {
    const source = video.querySelector('source')
    const src = video.getAttribute('src') || source?.getAttribute('src')
    if (src && !video.getAttribute('src')) video.setAttribute('src', src)
    const mediaId = video.getAttribute('data-media-id') || source?.getAttribute('data-media-id')
    if (mediaId && !video.getAttribute('data-media-id')) video.setAttribute('data-media-id', mediaId)
  })
  return template.innerHTML
}

function editorHtmlForSave(editor: Editor) {
  return wrapRichTextTables(editor.getHTML())
}

function buildAudioHtml(options: { url: string; mediaId?: string; compact: boolean }) {
  const { url, mediaId, compact } = options
  const idAttr = mediaId ? ` data-media-id="${escapeHtmlAttr(mediaId)}"` : ''
  const cls = compact
    ? `${ILM_RICHTEXT_AUDIO_CLASS} ${ILM_RICHTEXT_AUDIO_COMPACT_CLASS}`
    : ILM_RICHTEXT_AUDIO_CLASS
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

function mediaAttrsFromElement(element: HTMLElement) {
  const source = element.querySelector('source')
  return {
    src: element.getAttribute('src') || source?.getAttribute('src') || '',
    mediaId: element.getAttribute('data-media-id') || source?.getAttribute('data-media-id') || '',
    class: element.getAttribute('class') || '',
    style: element.getAttribute('style') || '',
  }
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

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    }
  },
})

const PreserveImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-media-id'),
        renderHTML: (attributes) => attributes.mediaId ? { 'data-media-id': attributes.mediaId } : {},
      },
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => attributes.class ? { class: attributes.class } : {},
      },
      style: {
        default: 'max-width:100%;height:auto;border-radius:8px;vertical-align:middle;',
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => attributes.style ? { style: attributes.style } : {},
      },
      widthPct: {
        default: 100,
        parseHTML: (element) => Number(element.getAttribute('data-width-pct')) || 100,
        renderHTML: (attributes) => attributes.widthPct ? { 'data-width-pct': attributes.widthPct } : {},
      },
    }
  },
}).configure({ allowBase64: true })

function MediaNodeView({ node, selected, getPos, editor }: NodeViewProps) {
  const attrs = node.attrs as Record<string, string>
  const mediaId = attrs.mediaId || undefined
  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'block',
    margin: '6px 0',
  }
  const stopNativeAudio = (event: React.SyntheticEvent) => {
    // Prevent the native <audio controls> from grabbing the mousedown/click
    // so the user can still select the node and trigger the trash button.
    event.stopPropagation()
  }
  const selectThisNode = (event: React.SyntheticEvent) => {
    if (typeof getPos !== 'function') return
    const pos = getPos()
    if (typeof pos !== 'number') return
    // Don't hijack clicks on the actual <audio>/<video> controls — let the
    // native player handle them. Selection should happen from the wrapper area.
    const target = event.target as HTMLElement
    if (target.closest('audio') || target.closest('video')) return
    event.preventDefault()
    event.stopPropagation()
    editor?.chain().focus().setNodeSelection(pos).run()
  }
  const handleRemove = (event: React.SyntheticEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (typeof getPos !== 'function') return
    const pos = getPos()
    if (typeof pos !== 'number') return
    // Delete the node at this position, then notify the parent so the
    // underlying media file is also removed from storage.
    editor?.chain().focus().setNodeSelection(pos).deleteSelection().run()
    if (!mediaId) return
    const onRemove = (editor?.options as any)?.editorProps?.onRemoveMedia as
      | ((id: string) => Promise<void>)
      | undefined
    if (typeof onRemove === 'function') {
      void onRemove(mediaId)
    }
  }
  if (node.type.name === 'audio') {
    return (
      <NodeViewWrapper
        as="div"
        className="ilm-richtext-audio-wrap"
        data-selected={selected ? 'true' : undefined}
        style={wrapperStyle}
        onMouseDown={selectThisNode}
        onClick={selectThisNode}
      >
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
        <IconButton
          size="small"
          aria-label="Удалить аудио"
          title="Удалить аудио"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleRemove}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': { bgcolor: 'error.main', color: 'common.white' },
            opacity: selected ? 1 : 0.85,
          }}
        >
          <DeleteOutline fontSize="small" />
        </IconButton>
      </NodeViewWrapper>
    )
  }
  return (
    <NodeViewWrapper
      as="div"
      className="ilm-richtext-video-wrap"
      data-selected={selected ? 'true' : undefined}
      style={wrapperStyle}
      onMouseDown={selectThisNode}
      onClick={selectThisNode}
    >
      <video
        data-media-id={mediaId}
        controls
        preload="metadata"
        src={attrs.src}
        style={attrs.style ? undefined : { maxWidth: '100%' }}
      >
        <source src={attrs.src} />
      </video>
      <IconButton
        size="small"
        aria-label="Удалить видео"
        title="Удалить видео"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={handleRemove}
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          bgcolor: 'background.paper',
          boxShadow: 1,
          '&:hover': { bgcolor: 'error.main', color: 'common.white' },
          opacity: selected ? 1 : 0.85,
        }}
      >
        <DeleteOutline fontSize="small" />
      </IconButton>
    </NodeViewWrapper>
  )
}

const AudioNode = TiptapNode.create({
  name: 'audio',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: '', parseHTML: (element) => mediaAttrsFromElement(element as HTMLElement).src },
      mediaId: { default: null, parseHTML: (element) => mediaAttrsFromElement(element as HTMLElement).mediaId },
      class: { default: ILM_RICHTEXT_AUDIO_CLASS, parseHTML: (element) => mediaAttrsFromElement(element as HTMLElement).class || ILM_RICHTEXT_AUDIO_CLASS },
      style: { default: '', parseHTML: (element) => mediaAttrsFromElement(element as HTMLElement).style },
      widthPct: {
        default: 100,
        parseHTML: (element) => Number((element as HTMLElement).getAttribute('data-width-pct')) || 100,
      },
    }
  },
  parseHTML() {
    return [{ tag: 'audio' }]
  },
  renderHTML({ HTMLAttributes }) {
    const { mediaId, widthPct, ...attrs } = HTMLAttributes
    const src = attrs.src || ''
    return [
      'audio',
      mergeAttributes(
        {
          controls: '',
          preload: 'metadata',
          class: ILM_RICHTEXT_AUDIO_CLASS,
        },
        attrs,
        mediaId ? { 'data-media-id': mediaId } : {},
        widthPct ? { 'data-width-pct': widthPct } : {},
      ),
      ['source', mergeAttributes({ src }, mediaId ? { 'data-media-id': mediaId } : {})],
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer(MediaNodeView)
  },
})

const VideoNode = TiptapNode.create({
  name: 'video',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: '', parseHTML: (element) => mediaAttrsFromElement(element as HTMLElement).src },
      mediaId: { default: null, parseHTML: (element) => mediaAttrsFromElement(element as HTMLElement).mediaId },
      style: { default: 'max-width:100%;border-radius:8px;vertical-align:middle;', parseHTML: (element) => mediaAttrsFromElement(element as HTMLElement).style },
      widthPct: {
        default: 100,
        parseHTML: (element) => Number((element as HTMLElement).getAttribute('data-width-pct')) || 100,
      },
    }
  },
  parseHTML() {
    return [{ tag: 'video' }]
  },
  renderHTML({ HTMLAttributes }) {
    const { mediaId, widthPct, ...attrs } = HTMLAttributes
    const src = attrs.src || ''
    return [
      'video',
      mergeAttributes(
        { controls: '', preload: 'metadata' },
        attrs,
        mediaId ? { 'data-media-id': mediaId } : {},
        widthPct ? { 'data-width-pct': widthPct } : {},
      ),
      ['source', { src }],
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer(MediaNodeView)
  },
})

function preserveElementAttrs() {
  return {
    class: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute('class'),
      renderHTML: (attributes: Record<string, string>) => attributes.class ? { class: attributes.class } : {},
    },
    style: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute('style'),
      renderHTML: (attributes: Record<string, string>) => attributes.style ? { style: attributes.style } : {},
    },
  }
}

const PreserveTable = Table.extend({
  addAttributes() {
    return { ...this.parent?.(), ...preserveElementAttrs() }
  },
})

const PreserveTableRow = TableRow.extend({
  addAttributes() {
    return { ...this.parent?.(), ...preserveElementAttrs() }
  },
})

const PreserveTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...preserveElementAttrs() }
  },
})

const PreserveTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...preserveElementAttrs() }
  },
})

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Введите текст...',
  minHeight = 180,
  onUploadFile,
  onRemoveMedia,
}: RichTextEditorProps) {
  const currentHtmlRef = useRef(value || '')
  const [uploadingFileName, setUploadingFileName] = useState('')
  const [draggingFileOverEditor, setDraggingFileOverEditor] = useState(false)
  const [currentFontFamily, setCurrentFontFamily] = useState('')
  const [currentFontSize, setCurrentFontSize] = useState('')

  const extensions = useMemo(
    () => [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      PreserveImage,
      AudioNode,
      VideoNode,
      PreserveTable.configure({ resizable: false, HTMLAttributes: { style: 'width:100%;border-collapse:collapse;' } }),
      PreserveTableRow,
      PreserveTableCell,
      PreserveTableHeader,
    ],
    [],
  )

  const editor = useEditor({
    extensions,
    content: normalizeHtmlForEditor(value || ''),
    editorProps: {
      // Custom prop consumed by MediaNodeView to remove the underlying
      // media file from storage when the in-editor trash button is clicked.
      // Cast: TipTap's EditorProps doesn't model this custom field, but it's
      // surfaced on `editor.options.editorProps` at runtime.
      ...({ onRemoveMedia } as Record<string, unknown>),
      attributes: {
        class: 'ilm-tiptap-editor',
      },
      handlePaste(_view, event) {
        if (!onUploadFile) return false
        const files = Array.from(event.clipboardData?.files || []).filter((file) => /^(image|audio|video)\//.test(file.type || ''))
        if (files.length === 0) return false
        event.preventDefault()
        void uploadFilesToEditor(files)
        return true
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
        void uploadFilesToEditor(files)
        return true
      },
    },
    onUpdate({ editor }) {
      const next = editorHtmlForSave(editor)
      currentHtmlRef.current = next
      onChange(next)
    },
    onSelectionUpdate({ editor }) {
      const attrs = editor.getAttributes('textStyle')
      setCurrentFontFamily(attrs.fontFamily || '')
      setCurrentFontSize(attrs.fontSize || '')
    },
  })

  useEffect(() => {
    if (!editor) return
    const nextValue = value || ''
    if (nextValue !== currentHtmlRef.current) {
      editor.commands.setContent(normalizeHtmlForEditor(nextValue), { emitUpdate: false })
      currentHtmlRef.current = nextValue
    }
  }, [editor, value])

  const emitCurrentHtml = () => {
    if (!editor) return
    const next = editorHtmlForSave(editor)
    currentHtmlRef.current = next
    onChange(next)
  }

  const askForUrl = (title: string) => {
    const url = window.prompt(title)
    return url?.trim() || ''
  }

  const insertHtmlAtCursor = (html: string) => {
    editor?.chain().focus().insertContent(html).run()
  }

  const uploadFileToEditor = async (file: File) => {
    if (!editor || !onUploadFile) return
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
    } catch (e: any) {
      window.alert(e?.response?.data?.message?.[0] || e?.message || 'Не удалось загрузить файл')
    } finally {
      setUploadingFileName('')
    }
  }

  const uploadFilesToEditor = async (files: File[]) => {
    for (const file of files) {
      await uploadFileToEditor(file)
    }
  }

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

  const insertTable = () => {
    const rows = Math.max(1, Math.min(20, Number(window.prompt('Количество строк', '3') || 0)))
    const cols = Math.max(1, Math.min(10, Number(window.prompt('Количество столбцов', '3') || 0)))
    if (!editor || !rows || !cols) return
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: false }).run()
    emitCurrentHtml()
  }

  const insertNumberedTable = () => {
    const rows = Math.max(1, Math.min(30, Number(window.prompt('Количество нумерованных строк', '4') || 0)))
    if (!rows) return
    const body = Array.from({ length: rows })
      .map((_, idx) => `<tr><td style="width:56px;border:1px solid #c9bcad;padding:10px 8px;text-align:center;">${idx + 1}.</td><td style="border:1px solid #c9bcad;padding:10px 12px;">&nbsp;</td></tr>`)
      .join('')
    insertHtmlAtCursor(`<table style="width:100%;border-collapse:collapse;"><tbody>${body}</tbody></table><p></p>`)
  }

  const insertTextAndAudioTable = () => {
    const rows = Math.max(1, Math.min(20, Number(window.prompt('Количество строк (например, по одной на каждую огласовку)', '3') || 0)))
    if (!rows) return
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

  const bulkUploadAudioToTable = () => {
    if (!editor || !onUploadFile) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    input.multiple = true
    input.onchange = async (event) => {
      const files = Array.from((event.target as HTMLInputElement).files || []).filter((file) => file.type.startsWith('audio/'))
      if (files.length === 0) return
      const template = document.createElement('template')
      template.innerHTML = editor.getHTML()
      const cells = Array.from(template.content.querySelectorAll(`td.${ILM_RICHTEXT_AUDIO_TD_CLASS}`)) as HTMLTableCellElement[]
      if (cells.length === 0) {
        window.alert('Сначала вставьте таблицу «текст + аудио».')
        return
      }
      try {
        for (let i = 0; i < Math.min(files.length, cells.length); i += 1) {
          setUploadingFileName(files[i].name)
          const uploaded = await onUploadFile(files[i])
          cells[i].innerHTML = buildAudioHtml({ url: uploaded.url, mediaId: uploaded.id, compact: true })
        }
        editor.commands.setContent(template.innerHTML, { emitUpdate: true })
      } catch (e: any) {
        window.alert(e?.response?.data?.message?.[0] || e?.message || 'Не удалось загрузить аудио')
      } finally {
        setUploadingFileName('')
      }
    }
    input.click()
  }

  const removeCurrentMedia = async () => {
    if (!editor) return
    const media = getSelectedMediaAttrs(editor)
    if (!media) {
      window.alert('Выберите аудио, видео или изображение в тексте, затем нажмите корзину.')
      return
    }
    if (!window.confirm('Удалить выбранное медиа из текста?')) return
    editor.chain().focus().deleteSelection().run()
    if (media.mediaId && onRemoveMedia) {
      try {
        await onRemoveMedia(media.mediaId)
      } catch (e: any) {
        window.alert(e?.response?.data?.message?.[0] || e?.message || 'Не удалось удалить медиа')
      }
    }
  }

  const resizeCurrentMedia = (direction: 'smaller' | 'larger') => {
    if (!editor) return
    const media = getSelectedMediaAttrs(editor)
    if (!media) {
      window.alert('Выберите изображение, видео или аудио в тексте, затем нажмите увеличение или уменьшение.')
      return
    }
    const next = Math.min(100, Math.max(25, (media.widthPct || 100) + (direction === 'larger' ? 25 : -25)))
    const style =
      media.type === 'audio'
        ? `width:${next}%;max-width:100%;min-height:40px;vertical-align:middle;border-radius:10px;`
        : `max-width:${next}%;height:auto;border-radius:8px;vertical-align:middle;`
    editor.chain().focus().updateAttributes(media.type, { widthPct: next, style }).run()
  }

  if (!editor) return null

  return (
    <Paper variant="outlined" sx={{ borderRadius: { xs: 2, sm: 3 }, overflow: 'hidden', minWidth: 0 }}>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          p: { xs: 0.75, sm: 1 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fafafa',
          flexWrap: { xs: 'nowrap', sm: 'wrap' },
          overflowX: { xs: 'auto', sm: 'visible' },
          overflowY: 'hidden',
          maxWidth: '100%',
          position: 'sticky',
          top: 0,
          zIndex: 3,
          scrollbarWidth: 'thin',
          '& .MuiIconButton-root': {
            width: 34,
            height: 34,
            flex: '0 0 auto',
          },
          '& .MuiSelect-select': {
            whiteSpace: 'nowrap',
          },
        }}
      >
        <Tooltip title="Заголовок">
          <IconButton size="small" color={editor.isActive('heading') ? 'primary' : 'default'} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Title fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Жирный">
          <IconButton size="small" color={editor.isActive('bold') ? 'primary' : 'default'} onClick={() => editor.chain().focus().toggleBold().run()}>
            <FormatBold fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Курсив">
          <IconButton size="small" color={editor.isActive('italic') ? 'primary' : 'default'} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <FormatItalic fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Подчеркнутый">
          <IconButton size="small" color={editor.isActive('underline') ? 'primary' : 'default'} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <FormatUnderlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Маркированный список">
          <IconButton size="small" onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <FormatListBulleted fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Нумерованный список">
          <IconButton size="small" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <FormatListNumbered fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Ссылка">
          <IconButton
            size="small"
            color={editor.isActive('link') ? 'primary' : 'default'}
            onClick={() => {
              const url = askForUrl('Введите URL')
              if (url) editor.chain().focus().setLink({ href: url }).run()
            }}
          >
            <LinkIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={onUploadFile ? 'Загрузить фото' : 'Фото по URL'}>
          <IconButton size="small" onClick={() => onUploadFile ? pickAndUpload('image/*') : insertHtmlAtCursor(`<img src="${escapeHtmlAttr(askForUrl('Вставьте URL изображения'))}" style="max-width:100%;height:auto;border-radius:8px;" />`)}>
            <ImageIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={onUploadFile ? 'Загрузить GIF' : 'GIF по URL'}>
          <IconButton size="small" onClick={() => onUploadFile ? pickAndUpload('image/gif,image/*') : insertHtmlAtCursor(`<img src="${escapeHtmlAttr(askForUrl('Вставьте URL GIF'))}" style="max-width:100%;height:auto;border-radius:8px;" />`)}>
            <GifBox fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Загрузить аудио или вставить URL">
          <IconButton
            size="small"
            onClick={() => {
              if (onUploadFile) pickAndUpload('audio/*')
              else {
                const url = askForUrl('Вставьте URL аудио')
                if (url) insertHtmlAtCursor(buildAudioHtml({ url, compact: isInAudioColumn(editor) }))
              }
            }}
          >
            <Audiotrack fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={onUploadFile ? 'Загрузить видео' : 'Видео по URL'}>
          <IconButton
            size="small"
            onClick={() => {
              if (onUploadFile) {
                pickAndUpload('video/*')
                return
              }
              const url = askForUrl('Вставьте URL видео')
              if (url) {
                insertHtmlAtCursor(`<video controls preload="metadata" src="${escapeHtmlAttr(url)}" style="max-width:100%;border-radius:8px;"><source src="${escapeHtmlAttr(url)}" /></video>`)
              }
            }}
          >
            <VideoLibrary fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Вставить таблицу">
          <IconButton size="small" onClick={insertTable}>
            <TableChart fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Вставить нумерованную таблицу">
          <IconButton size="small" onClick={insertNumberedTable}>
            <LooksOne fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Таблица: колонка текста + колонка под аудио">
          <IconButton size="small" onClick={insertTextAndAudioTable}>
            <ViewColumn fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Bulk: загрузить аудио и привязать к строкам таблицы «текст + аудио»">
          <span>
            <IconButton size="small" onClick={bulkUploadAudioToTable} disabled={!onUploadFile}>
              <UploadFile fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Уменьшить выбранное медиа">
          <IconButton size="small" onClick={() => resizeCurrentMedia('smaller')}>
            <ZoomOutMap fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Увеличить выбранное медиа">
          <IconButton size="small" onClick={() => resizeCurrentMedia('larger')}>
            <ZoomInMap fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Удалить выбранное медиа">
          <IconButton size="small" color="error" onClick={() => void removeCurrentMedia()}>
            <DeleteOutline fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Очистить форматирование">
          <IconButton size="small" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
            <Clear fontSize="small" />
          </IconButton>
        </Tooltip>

        <Select
          size="small"
          value={currentFontFamily}
          displayEmpty
          onChange={(e) => {
            const val = e.target.value as string
            const entry = FONT_FAMILIES.find((f) => f.value === val)
            setCurrentFontFamily(val)
            if (entry?.family) editor.chain().focus().setFontFamily(entry.family).run()
          }}
          sx={{
            height: 32,
            minWidth: { xs: 142, sm: 170 },
            maxWidth: { xs: 170, sm: 220 },
            flex: '0 0 auto',
            fontSize: 13,
          }}
        >
          {FONT_FAMILIES.map((f) => (
            <MenuItem key={f.value} value={f.value} sx={{ fontSize: 13, fontFamily: f.family || undefined, fontWeight: f.weight ? Number(f.weight) : undefined }}>
              {f.label}
            </MenuItem>
          ))}
        </Select>

        <Select
          size="small"
          value={currentFontSize}
          displayEmpty
          onChange={(e) => {
            const size = e.target.value as string
            setCurrentFontSize(size)
            if (size) editor.chain().focus().setFontSize(size).run()
          }}
          sx={{ height: 32, width: { xs: 84, sm: 90 }, flex: '0 0 auto', fontSize: 13 }}
        >
          {FONT_SIZES.map((s) => (
            <MenuItem key={s.value} value={s.value} sx={{ fontSize: 13 }}>
              {s.label}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      {uploadingFileName ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary" noWrap>
            Загрузка медиа: {uploadingFileName}
          </Typography>
        </Stack>
      ) : null}

      <Box
        sx={{
          position: 'relative',
          minWidth: 0,
          '& .ilm-tiptap-editor': {
            p: { xs: 1.25, sm: 2 },
            minHeight: { xs: Math.max(140, minHeight - 40), sm: minHeight },
            outline: 'none',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            overflowWrap: 'anywhere',
            wordBreak: 'normal',
          },
          '& .ilm-tiptap-editor h2, & .ilm-tiptap-editor h3': { margin: '8px 0' },
          '& .ilm-tiptap-editor p': { margin: '6px 0' },
          '& .ilm-tiptap-editor ul, & .ilm-tiptap-editor ol': { margin: '8px 0 8px 20px' },
          '& .ilm-tiptap-editor a': { color: 'primary.main' },
          '& .ilm-tiptap-editor table': {
            width: '100%',
            minWidth: { xs: 360, sm: '100%' },
            borderCollapse: 'collapse',
            borderSpacing: 0,
            margin: '8px 0',
          },
          '& .ilm-tiptap-editor .tableWrapper': {
            maxWidth: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          },
          '& .ilm-tiptap-editor td, & .ilm-tiptap-editor th': {
            border: '1px solid #c9bcad',
            padding: { xs: '8px 9px', sm: '10px 12px' },
            verticalAlign: 'middle',
          },
          [`& .ilm-tiptap-editor .${ILM_RICHTEXT_AUDIO_TD_CLASS}`]: {
            textAlign: 'center',
            whiteSpace: 'nowrap',
            bgcolor: '#faf8f5',
            minWidth: { xs: 112, sm: 128 },
          },
          '& .ilm-tiptap-editor img, & .ilm-tiptap-editor video, & .ilm-tiptap-editor audio': {
            maxWidth: '100%',
          },
          '& .ilm-tiptap-editor audio': {
            width: '100%',
            minWidth: 0,
          },
          '& .ilm-tiptap-editor .ProseMirror-selectednode, & [data-selected="true"]': {
            outline: '2px solid #d14343',
            outlineOffset: 2,
          },
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault()
            setDraggingFileOverEditor(true)
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as globalThis.Node | null)) setDraggingFileOverEditor(false)
        }}
      >
        <EditorContent editor={editor} />
        {editor.isEmpty ? (
          <Typography variant="body2" color="text.disabled" sx={{ position: 'absolute', top: { xs: 10, sm: 16 }, left: { xs: 10, sm: 16 }, right: { xs: 10, sm: 16 }, pointerEvents: 'none' }}>
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
              borderColor: 'primary.main',
              borderRadius: 2,
              bgcolor: 'rgba(25, 118, 210, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
              Отпустите файл, чтобы вставить медиа в текст
            </Typography>
          </Box>
        ) : null}
      </Box>

      <Alert severity="info" sx={{ borderRadius: 0 }}>
        Новый редактор работает на TipTap/ProseMirror. Можно перетаскивать медиа в текст, а bulk-аудио привяжет файлы к строкам таблицы «текст + аудио».
      </Alert>
    </Paper>
  )
}
