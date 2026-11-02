/**
 * TipTap schema shared by the lesson editor (with React node views) and by the
 * HTML → IlmDoc converter (no views). Keep node/attribute definitions here so the
 * editor and the stored document format can never drift apart.
 */
import { Extension, mergeAttributes, Node as TiptapNode, type AnyExtension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { ILM_RICHTEXT_TABLE_WRAP_CLASS } from '../utils/wrapRichTextTables'

export const ILM_RICHTEXT_AUDIO_CLASS = 'ilm-richtext-audio'
export const ILM_RICHTEXT_AUDIO_COMPACT_CLASS = 'ilm-richtext-audio--compact'
export const ILM_RICHTEXT_AUDIO_TD_CLASS = 'ilm-richtext-td-audio'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
  }
}

export function normalizeHtmlForEditor(html: string) {
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

export function mediaAttrsFromElement(element: HTMLElement) {
  const source = element.querySelector('source')
  return {
    src: element.getAttribute('src') || source?.getAttribute('src') || '',
    mediaId: element.getAttribute('data-media-id') || source?.getAttribute('data-media-id') || '',
    class: element.getAttribute('class') || '',
    style: element.getAttribute('style') || '',
  }
}

export const FontSize = Extension.create({
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

export const PreserveImage = Image.extend({
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

export const AudioNode = TiptapNode.create({
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
})

export const VideoNode = TiptapNode.create({
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

export const PreserveTable = Table.extend({
  addAttributes() {
    return { ...this.parent?.(), ...preserveElementAttrs() }
  },
})

export const PreserveTableRow = TableRow.extend({
  addAttributes() {
    return { ...this.parent?.(), ...preserveElementAttrs() }
  },
})

export const PreserveTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...preserveElementAttrs() }
  },
})

export const PreserveTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...preserveElementAttrs() }
  },
})

/** Full extension list; pass `{ audio, video }` overrides to attach editor node views. */
export function buildIlmRichtextExtensions(overrides: { audio?: AnyExtension; video?: AnyExtension } = {}): AnyExtension[] {
  return [
    // StarterKit v3 already bundles Link and Underline — configure them here instead of
    // registering duplicates. h1 is parsed (pasted content) and normalized to h2 in IlmDoc.
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true },
    }),
    TextStyle,
    FontFamily,
    FontSize,
    Color,
    PreserveImage,
    overrides.audio ?? AudioNode,
    overrides.video ?? VideoNode,
    PreserveTable.configure({ resizable: false, HTMLAttributes: { style: 'width:100%;border-collapse:collapse;' } }),
    PreserveTableRow,
    PreserveTableCell,
    PreserveTableHeader,
  ]
}
