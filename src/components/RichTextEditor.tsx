import { Box, IconButton, MenuItem, Paper, Select, Stack, Tooltip } from '@mui/material'
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  Link as LinkIcon,
  Title,
  Clear,
  Image as ImageIcon,
  GifBox,
  Audiotrack,
  VideoLibrary,
  DeleteOutline,
  ZoomOutMap,
  ZoomInMap,
  TableChart,
  LooksOne,
  ViewColumn,
} from '@mui/icons-material'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  ILM_RICHTEXT_TABLE_WRAP_CLASS,
  ILM_RICHTEXT_TABLE_WRAP_STYLE,
  wrapBareTablesInContainer,
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

// execCommand fontSize uses 1–7; we map to human-readable px labels
const FONT_SIZES = [
  { value: '', label: 'Размер' },
  { value: '1', label: '10px' },
  { value: '2', label: '13px' },
  { value: '3', label: '16px' },
  { value: '4', label: '18px' },
  { value: '5', label: '24px' },
  { value: '6', label: '32px' },
  { value: '7', label: '48px' },
]

/** Marker classes — mirrored in `MobilePreview` / `theory_block_widget` (customStyles). */
const ILM_RICHTEXT_AUDIO_CLASS = 'ilm-richtext-audio'
const ILM_RICHTEXT_AUDIO_COMPACT_CLASS = 'ilm-richtext-audio--compact'
const ILM_RICHTEXT_AUDIO_TD_CLASS = 'ilm-richtext-td-audio'

/** Compact chip player only in the dedicated «аудио» column (see insertTextAndAudioTable). */
function useCompactAudioForInsertion(root: HTMLElement, range: Range | null): boolean {
  if (!range) return false
  if (!isRangeInsideTableCell(range, root)) return false
  const cell = findTableCellInEditor(range.commonAncestorContainer, root)
  return cell ? cell.classList.contains(ILM_RICHTEXT_AUDIO_TD_CLASS) : false
}

function findTableCellInEditor(anchor: Node | null, root: HTMLElement): HTMLTableCellElement | null {
  let n: Node | null = anchor
  while (n) {
    if (n === root) return null
    if (n.nodeType === Node.ELEMENT_NODE) {
      const t = (n as Element).tagName
      if (t === 'TD' || t === 'TH') {
        if (root.contains(n)) return n as HTMLTableCellElement
        return null
      }
    }
    n = n.parentNode
  }
  return null
}

function isRangeInsideTableCell(range: Range, root: HTMLElement): boolean {
  return findTableCellInEditor(range.commonAncestorContainer, root) != null
}

/** Finds <audio> / <video> / <img> in event path (incl. shadow roots for media controls). */
function findMediaInComposedPath(event: { composedPath: () => EventTarget[] }, root: HTMLElement): HTMLElement | null {
  for (const n of event.composedPath()) {
    if (!(n instanceof HTMLElement)) continue
    const tag = n.tagName
    if (tag === 'AUDIO' || tag === 'VIDEO' || tag === 'IMG') {
      if (root.contains(n)) return n
    }
  }
  return null
}

function buildAudioHtml(options: { url: string; mediaId?: string; compact: boolean }): string {
  const { url, mediaId, compact } = options
  const idAttr = mediaId ? ` data-media-id="${mediaId}"` : ''
  const cls = compact
    ? `${ILM_RICHTEXT_AUDIO_CLASS} ${ILM_RICHTEXT_AUDIO_COMPACT_CLASS}`
    : ILM_RICHTEXT_AUDIO_CLASS
  // Compact: in-table mini player. Full width otherwise (paragraph-level).
  const style = compact
    ? 'max-width:min(220px,100%);min-width:120px;height:40px;vertical-align:middle;display:inline-block;border-radius:8px;'
    : 'width:100%;max-width:100%;min-height:40px;vertical-align:middle;border-radius:10px;'
  return `<audio class="${cls}"${idAttr} controls="" preload="metadata" style="${style}"><source${idAttr} src="${url}" /></audio>`
}

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  onUploadFile?: (file: File) => Promise<{ id: string; url: string; type: 'image' | 'audio' | 'video'; mimeType?: string }>
  onRemoveMedia?: (mediaId: string) => Promise<void>
}

function toolbarAction(command: string, value?: string) {
  document.execCommand(command, false, value)
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Введите текст...',
  minHeight = 180,
  onUploadFile,
  onRemoveMedia,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef<Range | null>(null)
  /** Cloned before async `onUploadFile` so insertion returns to the right cell after upload. */
  const insertRangeRef = useRef<Range | null>(null)
  /** Last media clicked in the editor (native <audio> controls do not set document selection). */
  const lastMediaInEditorRef = useRef<HTMLElement | null>(null)
  const [currentFontFamily, setCurrentFontFamily] = useState('')
  const [currentFontSize, setCurrentFontSize] = useState('')

  const rememberSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    selectionRef.current = selection.getRangeAt(0)
    // Read current font state at caret position
    const fontName = document.queryCommandValue('fontName')
    const fontSize = document.queryCommandValue('fontSize')
    setCurrentFontFamily(fontName || '')
    setCurrentFontSize(fontSize || '')
  }

  const restoreSelection = () => {
    const range = selectionRef.current
    if (!range) return
    const selection = window.getSelection()
    if (!selection) return
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const getSelectedMedia = (): { el: HTMLElement; mediaId: string | null } | null => {
    const root = editorRef.current
    if (!root) return null
    const sel = window.getSelection()
    if (sel?.rangeCount) {
      const a = sel.anchorNode
      if (a) {
        const p = a instanceof Element ? a : a.parentElement
        const m = p?.closest('audio,img,video') as HTMLElement | null
        if (m && root.contains(m)) {
          return { el: m, mediaId: m.getAttribute('data-media-id') }
        }
      }
    }
    const last = lastMediaInEditorRef.current
    if (last && root.contains(last)) {
      return { el: last, mediaId: last.getAttribute('data-media-id') }
    }
    return null
  }

  const handleEditorPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const root = editorRef.current
    if (!root) return
    const native = e.nativeEvent
    let media = findMediaInComposedPath(native, root)
    if (!media) {
      const t = e.target
      if (t instanceof HTMLAudioElement || t instanceof HTMLVideoElement) {
        if (root.contains(t)) media = t
      } else if (t instanceof HTMLImageElement) {
        if (root.contains(t)) media = t
      }
    }
    if (media) {
      lastMediaInEditorRef.current = media
      const r = document.createRange()
      r.selectNode(media)
      const sel = window.getSelection()
      if (sel) {
        sel.removeAllRanges()
        try {
          sel.addRange(r)
        } catch {
          // ignore
        }
        try {
          selectionRef.current = r.cloneRange()
        } catch {
          // ignore
        }
      }
      return
    }
    lastMediaInEditorRef.current = null
    rememberSelection()
  }

  const insertHtmlAtCursor = (html: string) => {
    const root = editorRef.current
    if (!root) return
    root.focus()
    restoreSelection()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      const wrap = document.createElement('div')
      wrap.innerHTML = html
      const frag = document.createDocumentFragment()
      while (wrap.firstChild) frag.appendChild(wrap.firstChild)
      root.appendChild(frag)
      onChange(root.innerHTML)
      return
    }

    const range = sel.getRangeAt(0)
    const inCell = isRangeInsideTableCell(range, root)

    if (inCell) {
      const tpl = document.createElement('template')
      tpl.innerHTML = html.trim()
      const frag = tpl.content
      const lastBeforeInsert = frag.lastChild
      try {
        range.deleteContents()
        range.insertNode(frag)
        if (lastBeforeInsert) {
          range.setStartAfter(lastBeforeInsert)
          range.collapse(true)
        }
        sel.removeAllRanges()
        sel.addRange(range)
      } catch {
        document.execCommand('insertHTML', false, html)
      }
    } else {
      document.execCommand('insertHTML', false, html)
    }

    if (sel.rangeCount > 0) {
      selectionRef.current = sel.getRangeAt(0).cloneRange()
    }
    onChange(root.innerHTML)
  }

  const askForUrl = (title: string): string | null => {
    const url = window.prompt(title)
    if (!url || !url.trim()) return null
    return url.trim()
  }

  const insertTable = () => {
    const rowsInput = window.prompt('Количество строк', '3')
    const colsInput = window.prompt('Количество столбцов', '3')
    const rows = Math.max(1, Math.min(20, Number(rowsInput || 0)))
    const cols = Math.max(1, Math.min(10, Number(colsInput || 0)))
    if (!rows || !cols) return

    const body = Array.from({ length: rows })
            .map(
        () =>
          `<tr>${Array.from({ length: cols })
            .map(() => '<td style="border:1px solid #c9bcad;padding:10px 12px;">&nbsp;</td>')
            .join('')}</tr>`,
      )
      .join('')

    insertHtmlAtCursor(
      `<div class="${ILM_RICHTEXT_TABLE_WRAP_CLASS}" style="${ILM_RICHTEXT_TABLE_WRAP_STYLE}">` +
        `<table style="width:100%;border-collapse:collapse;"><tbody>${body}</tbody></table></div><p></p>`,
    )
  }

  /** Two columns: text / labels + a narrow column for one audio per row. */
  const insertTextAndAudioTable = () => {
    const rowsInput = window.prompt('Количество строк (например, по одной на каждую огласовку)', '3')
    const rows = Math.max(1, Math.min(20, Number(rowsInput || 0)))
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

    insertHtmlAtCursor(
      `<div class="${ILM_RICHTEXT_TABLE_WRAP_CLASS}" style="${ILM_RICHTEXT_TABLE_WRAP_STYLE}">` +
        '<table style="width:100%;border-collapse:collapse;table-layout:fixed;">' +
        `<tbody>${body}</tbody></table></div><p></p>`,
    )
  }

  const insertNumberedTable = () => {
    const rowsInput = window.prompt('Количество нумерованных строк', '4')
    const rows = Math.max(1, Math.min(30, Number(rowsInput || 0)))
    if (!rows) return

    const body = Array.from({ length: rows })
      .map(
        (_, idx) =>
          `<tr><td style="width:56px;border:1px solid #c9bcad;padding:10px 8px;text-align:center;">${idx + 1}.</td><td style="border:1px solid #c9bcad;padding:10px 12px;">&nbsp;</td></tr>`,
      )
      .join('')

    insertHtmlAtCursor(
      `<div class="${ILM_RICHTEXT_TABLE_WRAP_CLASS}" style="${ILM_RICHTEXT_TABLE_WRAP_STYLE}">` +
        `<table style="width:100%;border-collapse:collapse;"><tbody>${body}</tbody></table></div><p></p>`,
    )
  }

  const pickAndUpload = (accept: string) => {
    if (!onUploadFile) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file || !editorRef.current) return
      const root = editorRef.current
      root.focus()
      restoreSelection()
      let range: Range | null = null
      const s0 = window.getSelection()
      if (s0?.rangeCount) {
        try {
          range = s0.getRangeAt(0).cloneRange()
        } catch {
          range = null
        }
      }
      if (!range && selectionRef.current) {
        try {
          range = selectionRef.current.cloneRange()
        } catch {
          range = null
        }
      }
      insertRangeRef.current = range
      try {
        const uploaded = await onUploadFile(file)
        if (insertRangeRef.current) {
          const sel1 = window.getSelection()
          if (sel1) {
            sel1.removeAllRanges()
            try {
              sel1.addRange(insertRangeRef.current)
            } catch {
              // Range no longer valid — insertHtmlAtCursor will fall back
            }
          }
          selectionRef.current = insertRangeRef.current
        }
        const inTableCell = !!(
          insertRangeRef.current && isRangeInsideTableCell(insertRangeRef.current, root)
        )
        const audioCompact = useCompactAudioForInsertion(root, insertRangeRef.current)
        if (uploaded.type === 'audio') {
          insertHtmlAtCursor(
            buildAudioHtml({ url: uploaded.url, mediaId: uploaded.id, compact: audioCompact }),
          )
          return
        }
        if (uploaded.type === 'video') {
          const vStyle = inTableCell
            ? 'max-width:min(100%,360px);max-height:200px;border-radius:8px;vertical-align:middle;display:inline-block;'
            : 'max-width:100%;border-radius:8px;vertical-align:middle;'
          insertHtmlAtCursor(
            `<video data-media-id="${uploaded.id}" controls="" preload="metadata" style="${vStyle}"><source src="${uploaded.url}" /></video>`,
          )
          return
        }
        const iStyle = inTableCell
          ? 'max-width:100%;height:auto;max-height:200px;border-radius:8px;vertical-align:middle;'
          : 'max-width:100%;height:auto;border-radius:8px;vertical-align:middle;'
        insertHtmlAtCursor(
          `<img data-media-id="${uploaded.id}" src="${uploaded.url}" alt="${file.name}" style="${iStyle}" />`,
        )
      } catch (e: any) {
        const message = e?.response?.data?.message?.[0] || e?.message || 'Не удалось загрузить файл'
        window.alert(message)
      } finally {
        insertRangeRef.current = null
      }
    }
    input.click()
  }

  const removeCurrentMedia = async () => {
    const root = editorRef.current
    if (!root) return
    const resolved = getSelectedMedia()
    if (!resolved) {
      window.alert(
        'Кликните по аудио, видео или изображению в тексте, затем нажмите «Удалить выбранное медиа» на панели инструментов.',
      )
      return
    }
    const { el: mediaEl, mediaId } = resolved
    const tag = mediaEl.tagName
    if (tag === 'AUDIO') {
      if (!window.confirm('Удалить эту аудио-дорожку из текста? Файл будет откреплён от блока.')) {
        return
      }
    } else if (tag === 'VIDEO') {
      if (!window.confirm('Удалить это видео из текста?')) return
    } else if (tag === 'IMG') {
      if (!window.confirm('Удалить это изображение из текста?')) return
    }
    lastMediaInEditorRef.current = null
    mediaEl.remove()
    onChange(root.innerHTML)
    if (mediaId && onRemoveMedia) {
      try {
        await onRemoveMedia(mediaId)
      } catch (e: any) {
        const message = e?.response?.data?.message?.[0] || e?.message || 'Не удалось удалить медиа'
        window.alert(message)
      }
    }
  }

  const resizeCurrentMedia = (direction: 'smaller' | 'larger') => {
    if (!editorRef.current) return
    const resolved = getSelectedMedia()
    if (!resolved) {
      window.alert(
        'Кликните по изображению, видео или аудио в тексте, затем снова нажмите уменьшение или увеличение.',
      )
      return
    }
    const mediaEl = resolved.el

    const current = Number(mediaEl.getAttribute('data-width-pct')) || 100
    const step = 25
    let next = direction === 'larger' ? current + step : current - step
    next = Math.min(100, Math.max(25, next))

    mediaEl.style.maxWidth = `${next}%`
    mediaEl.style.height = 'auto'
    mediaEl.setAttribute('data-width-pct', String(next))

    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (el.innerHTML !== value) {
      el.innerHTML = value || ''
    }
    wrapBareTablesInContainer(el)
  }, [value])

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          p: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: '#fafafa',
          flexWrap: 'wrap',
        }}
      >
        <Tooltip title="Заголовок">
          <IconButton size="small" onClick={() => toolbarAction('formatBlock', '<h2>')}>
            <Title fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Жирный">
          <IconButton size="small" onClick={() => toolbarAction('bold')}>
            <FormatBold fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Курсив">
          <IconButton size="small" onClick={() => toolbarAction('italic')}>
            <FormatItalic fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Подчеркнутый">
          <IconButton size="small" onClick={() => toolbarAction('underline')}>
            <FormatUnderlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Маркированный список">
          <IconButton size="small" onClick={() => toolbarAction('insertUnorderedList')}>
            <FormatListBulleted fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Нумерованный список">
          <IconButton size="small" onClick={() => toolbarAction('insertOrderedList')}>
            <FormatListNumbered fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Ссылка">
          <IconButton
            size="small"
            onClick={() => {
              const url = window.prompt('Введите URL')
              if (url?.trim()) toolbarAction('createLink', url.trim())
            }}
          >
            <LinkIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={onUploadFile ? 'Загрузить фото' : 'Фото по URL'}>
          <IconButton
            size="small"
            onMouseUp={rememberSelection}
            onClick={() => {
              if (onUploadFile) {
                pickAndUpload('image/*')
              } else {
                const url = askForUrl('Вставьте URL изображения')
                if (!url) return
                insertHtmlAtCursor(
                  `<img src="${url}" alt="image" style="max-width:100%;height:auto;border-radius:8px;vertical-align:middle;" />`,
                )
              }
            }}
          >
            <ImageIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={onUploadFile ? 'Загрузить GIF' : 'GIF по URL'}>
          <IconButton
            size="small"
            onMouseUp={rememberSelection}
            onClick={() => {
              if (onUploadFile) {
                pickAndUpload('image/gif,image/*')
              } else {
                const url = askForUrl('Вставьте URL GIF')
                if (!url) return
                insertHtmlAtCursor(
                  `<img src="${url}" alt="gif" style="max-width:100%;height:auto;border-radius:8px;vertical-align:middle;" />`,
                )
              }
            }}
          >
            <GifBox fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip
          title={
            onUploadFile
              ? 'Загрузить аудио. В таблице «текст+аудио» поставьте курсор в правую ячейку — вставится компактный плеер.'
              : 'Аудио по URL. В колонке «аудио» — компактный плеер; в ячейке с текстом — полноширинный.'
          }
        >
          <IconButton
            size="small"
            onMouseUp={rememberSelection}
            onClick={() => {
              if (onUploadFile) {
                pickAndUpload('audio/*')
                return
              }
              editorRef.current?.focus()
              restoreSelection()
              const s = window.getSelection()
              const compact =
                s && s.rangeCount > 0 && editorRef.current
                  ? useCompactAudioForInsertion(editorRef.current, s.getRangeAt(0))
                  : false
              const url = askForUrl('Вставьте URL аудио (mp3/ogg/m4a и т.д.)')
              if (!url) return
              insertHtmlAtCursor(buildAudioHtml({ url, compact }))
            }}
          >
            <Audiotrack fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={onUploadFile ? 'Загрузить видео' : 'Видео по URL'}>
          <IconButton
            size="small"
            onMouseUp={rememberSelection}
            onClick={() => {
              if (onUploadFile) {
                pickAndUpload('video/*')
              } else {
                const url = askForUrl('Вставьте URL видео (mp4/webm и т.д.)')
                if (!url) return
                insertHtmlAtCursor(
                  `<video controls preload="metadata" style="max-width:100%;border-radius:8px;vertical-align:middle;"><source src="${url}" /></video>`,
                )
              }
            }}
          >
            <VideoLibrary fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Вставить таблицу">
          <IconButton
            size="small"
            onMouseDown={rememberSelection}
            onClick={insertTable}
          >
            <TableChart fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Вставить нумерованную таблицу">
          <IconButton
            size="small"
            onMouseDown={rememberSelection}
            onClick={insertNumberedTable}
          >
            <LooksOne fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Таблица: колонка текста + колонка под аудио (по строке)">
          <IconButton
            size="small"
            onMouseDown={rememberSelection}
            onClick={insertTextAndAudioTable}
          >
            <ViewColumn fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Уменьшить выбранное медиа">
          <span>
            <IconButton
              size="small"
              onClick={() => resizeCurrentMedia('smaller')}
            >
              <ZoomOutMap fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Увеличить выбранное медиа">
          <span>
            <IconButton
              size="small"
              onClick={() => resizeCurrentMedia('larger')}
            >
              <ZoomInMap fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Удалить встроенное фото, аудио или видео: сначала кликните по нему в тексте, затем сюда. Для вставок по URL медиа только убирается из текста.">
          <span>
            <IconButton
              size="small"
              onClick={() => {
                void removeCurrentMedia()
              }}
              color="error"
            >
              <DeleteOutline fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Очистить форматирование">
          <IconButton size="small" onClick={() => toolbarAction('removeFormat')}>
            <Clear fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Font Family selector */}
        <Select
          size="small"
          value={currentFontFamily}
          displayEmpty
          onMouseDown={rememberSelection}
          onChange={(e) => {
            const val = e.target.value as string
            setCurrentFontFamily(val)
            editorRef.current?.focus()
            restoreSelection()
            const entry = FONT_FAMILIES.find((f) => f.value === val)
            if (entry && entry.family) {
              toolbarAction('styleWithCSS', 'true')
              toolbarAction('fontName', entry.family)
              // Apply font-weight on spans created by fontName command
              const container = editorRef.current
              if (container) {
                const spans = container.querySelectorAll('span[style*="font-family"]')
                spans.forEach((span: Element) => {
                  const htmlSpan = span as HTMLElement
                  if (htmlSpan.style.fontFamily.includes(entry.family)) {
                    htmlSpan.style.fontWeight = entry.weight
                  }
                })
              }
            }
            if (editorRef.current) onChange(editorRef.current.innerHTML)
          }}
          sx={{ height: 32, minWidth: 170, fontSize: 13 }}
        >
          {FONT_FAMILIES.map((f) => (
            <MenuItem key={f.value} value={f.value} sx={{ fontSize: 13, fontFamily: f.family || undefined, fontWeight: f.weight ? Number(f.weight) : undefined }}>
              {f.label}
            </MenuItem>
          ))}
        </Select>

        {/* Font Size selector */}
        <Select
          size="small"
          value={currentFontSize}
          displayEmpty
          onMouseDown={rememberSelection}
          onChange={(e) => {
            const sz = e.target.value as string
            setCurrentFontSize(sz)
            editorRef.current?.focus()
            restoreSelection()
            if (sz) {
              toolbarAction('styleWithCSS', 'true')
              toolbarAction('fontSize', sz)
            }
            if (editorRef.current) onChange(editorRef.current.innerHTML)
          }}
          sx={{ height: 32, width: 90, fontSize: 13 }}
        >
          {FONT_SIZES.map((s) => (
            <MenuItem key={s.value} value={s.value} sx={{ fontSize: 13 }}>
              {s.label}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      <Box
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onPointerUp={handleEditorPointerUp}
        onKeyUp={rememberSelection}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        sx={{
          p: 2,
          minHeight,
          outline: 'none',
          '&:empty:before': {
            content: `"${placeholder}"`,
            color: 'text.disabled',
          },
          '& h1, & h2, & h3': { margin: '8px 0' },
          '& p': { margin: '6px 0' },
          '& ul, & ol': { margin: '8px 0 8px 20px' },
          '& a': { color: 'primary.main' },
          // WYSIWYG: do not draw a «card» border/shadow here — that looked like boxes around
          // every block when tables/Word layout nest oddly. Rounded table shell + cell lines
          // come from inline HTML; final look is in MobilePreview & app.
          [`& .${ILM_RICHTEXT_TABLE_WRAP_CLASS}`]: {
            borderRadius: '14px',
            overflow: 'hidden',
            my: 1,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          },
          [`& .${ILM_RICHTEXT_TABLE_WRAP_CLASS} table`]: {
            width: '100%',
            borderCollapse: 'collapse',
            borderSpacing: 0,
            margin: 0,
          },
          [`& .${ILM_RICHTEXT_TABLE_WRAP_CLASS} th`]: {
            bgcolor: '#f0ebe4',
            fontWeight: 600,
          },
          // Layout hints only; avoid heavy chrome that reads as extra «frames» on <audio>
          [`& .${ILM_RICHTEXT_TABLE_WRAP_CLASS} .${ILM_RICHTEXT_AUDIO_TD_CLASS}`]: {
            verticalAlign: 'middle',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          },
        }}
      />
    </Paper>
  )
}
