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
} from '@mui/icons-material'
import { useEffect, useRef, useState } from 'react'

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

  const insertHtmlAtCursor = (html: string) => {
    editorRef.current?.focus()
    restoreSelection()
    toolbarAction('insertHTML', html)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
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
            .map(() => '<td style="border:1px solid #d8d8d8;padding:8px;">&nbsp;</td>')
            .join('')}</tr>`,
      )
      .join('')

    insertHtmlAtCursor(
      `<table style="width:100%;border-collapse:collapse;margin:8px 0;border-radius:12px;overflow:hidden;"><tbody>${body}</tbody></table><p></p>`,
    )
  }

  const insertNumberedTable = () => {
    const rowsInput = window.prompt('Количество нумерованных строк', '4')
    const rows = Math.max(1, Math.min(30, Number(rowsInput || 0)))
    if (!rows) return

    const body = Array.from({ length: rows })
      .map(
        (_, idx) =>
          `<tr><td style="width:56px;border:1px solid #d8d8d8;padding:8px;text-align:center;">${idx + 1}.</td><td style="border:1px solid #d8d8d8;padding:8px;">&nbsp;</td></tr>`,
      )
      .join('')

    insertHtmlAtCursor(
      `<table style="width:100%;border-collapse:collapse;margin:8px 0;border-radius:12px;overflow:hidden;"><tbody>${body}</tbody></table><p></p>`,
    )
  }

  const pickAndUpload = (accept: string) => {
    if (!onUploadFile) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const uploaded = await onUploadFile(file)
        if (uploaded.type === 'audio') {
          insertHtmlAtCursor(
            `<audio data-media-id="${uploaded.id}" controls preload="metadata" style="width:100%;vertical-align:middle;"><source src="${uploaded.url}" /></audio>`,
          )
          return
        }
        if (uploaded.type === 'video') {
          insertHtmlAtCursor(
            `<video data-media-id="${uploaded.id}" controls preload="metadata" style="max-width:100%;border-radius:8px;vertical-align:middle;"><source src="${uploaded.url}" /></video>`,
          )
          return
        }
        insertHtmlAtCursor(
          `<img data-media-id="${uploaded.id}" src="${uploaded.url}" alt="${file.name}" style="max-width:100%;height:auto;border-radius:8px;vertical-align:middle;" />`,
        )
      } catch (e: any) {
        const message = e?.response?.data?.message?.[0] || e?.message || 'Не удалось загрузить файл'
        window.alert(message)
      }
    }
    input.click()
  }

  const removeCurrentMedia = async () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return
    const anchorNode = selection.anchorNode
    if (!anchorNode) return
    const parent = anchorNode instanceof Element ? anchorNode : anchorNode.parentElement
    if (!parent) return
    const mediaEl = (parent.closest('[data-media-id],img,video,audio') as HTMLElement | null)
    if (!mediaEl) return
    const mediaId = mediaEl.getAttribute('data-media-id')
    mediaEl.remove()
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
    // Для новых медиа с data-media-id удаляем и на бэкенде, старые вставки без id просто убираем из HTML
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
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return
    const anchorNode = selection.anchorNode
    if (!anchorNode) return
    const parent = anchorNode instanceof Element ? anchorNode : anchorNode.parentElement
    if (!parent) return
    const mediaEl = parent.closest('img,video') as HTMLElement | null
    if (!mediaEl) return

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
    if (!editorRef.current) return
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ''
    }
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
        <Tooltip title={onUploadFile ? 'Загрузить аудио' : 'Аудио по URL'}>
          <IconButton
            size="small"
            onMouseUp={rememberSelection}
            onClick={() => {
              if (onUploadFile) {
                pickAndUpload('audio/*')
              } else {
                const url = askForUrl('Вставьте URL аудио (mp3/ogg/m4a и т.д.)')
                if (!url) return
                insertHtmlAtCursor(
                  `<audio controls preload="metadata" style="width:100%;vertical-align:middle;"><source src="${url}" /></audio>`,
                )
              }
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
        <Tooltip title="Удалить выбранное медиа">
          <span>
            <IconButton
              size="small"
              onClick={() => {
                void removeCurrentMedia()
              }}
              disabled={!onRemoveMedia}
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
        onMouseUp={rememberSelection}
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
        }}
      />
    </Paper>
  )
}

