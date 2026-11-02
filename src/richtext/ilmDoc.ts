/**
 * IlmDoc — the canonical, structured format of lesson rich text.
 *
 * The editor still works with HTML internally, but what the mobile app renders is this
 * JSON tree with a closed set of node and mark types (see docs/RICH_TEXT_FORMAT.md).
 * No CSS, classes or arbitrary attributes survive normalization, so the app never has to
 * repair pasted Word/Tailwind markup.
 */
import { generateJSON, type JSONContent } from '@tiptap/core'
import { buildIlmRichtextExtensions, normalizeHtmlForEditor, ILM_RICHTEXT_AUDIO_COMPACT_CLASS } from './extensions'

export const ILM_DOC_VERSION = 1

export type IlmMark =
  | { type: 'bold' | 'italic' | 'underline' | 'strike' }
  | { type: 'link'; attrs: { href: string } }
  | { type: 'color'; attrs: { color: string } }
  | { type: 'fontSize'; attrs: { size: number } }

export interface IlmNode {
  type: string
  attrs?: Record<string, string | number | boolean | null>
  content?: IlmNode[]
  text?: string
  marks?: IlmMark[]
}

export interface IlmDoc {
  type: 'doc'
  version: number
  content: IlmNode[]
}

const BLOCK_CONTAINERS = new Set(['blockquote', 'bulletList', 'orderedList', 'listItem', 'table', 'tableRow', 'tableCell', 'tableHeader'])

let cachedExtensions: ReturnType<typeof buildIlmRichtextExtensions> | null = null

function extensions() {
  cachedExtensions ??= buildIlmRichtextExtensions()
  return cachedExtensions
}

function safeUrl(value: unknown, allowMailto = false): string | null {
  if (typeof value !== 'string') return null
  const url = value.trim()
  if (/^https?:\/\//i.test(url)) return url
  if (allowMailto && /^mailto:/i.test(url)) return url
  return null
}

function hexColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase()
  const rgb = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgb) {
    return `#${rgb.slice(1, 4).map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('')}`
  }
  return null
}

function fontSizePx(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const n = parseFloat(String(value))
  if (!Number.isFinite(n)) return null
  const px = String(value).trim().endsWith('pt') ? n * (4 / 3) : n
  return Math.round(Math.min(48, Math.max(10, px)))
}

function normalizeMarks(marks: JSONContent['marks']): IlmMark[] | undefined {
  if (!marks?.length) return undefined
  const out: IlmMark[] = []
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
      case 'italic':
      case 'underline':
      case 'strike':
        out.push({ type: mark.type })
        break
      case 'link': {
        const href = safeUrl(mark.attrs?.href, true)
        if (href) out.push({ type: 'link', attrs: { href } })
        break
      }
      case 'textStyle': {
        const color = hexColor(mark.attrs?.color)
        if (color && color !== '#000000') out.push({ type: 'color', attrs: { color } })
        const size = fontSizePx(mark.attrs?.fontSize)
        if (size && size !== 16) out.push({ type: 'fontSize', attrs: { size } })
        break
      }
      default:
        break // code, fontFamily, highlight… are presentation noise for mobile
    }
  }
  return out.length ? out : undefined
}

function positiveInt(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

function normalizeChildren(nodes: JSONContent[] | undefined): IlmNode[] {
  const out: IlmNode[] = []
  for (const node of nodes ?? []) out.push(...normalizeNode(node))
  return out
}

/** Returns zero or more nodes: unknown wrappers are unwrapped, unsafe media dropped. */
function normalizeNode(node: JSONContent): IlmNode[] {
  switch (node.type) {
    case 'text':
      return node.text ? [{ type: 'text', text: node.text, ...(normalizeMarks(node.marks) ? { marks: normalizeMarks(node.marks) } : {}) }] : []
    case 'hardBreak':
    case 'horizontalRule':
      return [{ type: node.type }]
    case 'paragraph':
      return [{ type: 'paragraph', content: normalizeChildren(node.content) }]
    case 'codeBlock':
      return [{ type: 'paragraph', content: normalizeChildren(node.content) }]
    case 'heading': {
      const level = Math.min(3, Math.max(2, positiveInt(node.attrs?.level, 2)))
      return [{ type: 'heading', attrs: { level }, content: normalizeChildren(node.content) }]
    }
    case 'orderedList':
      return [{ type: 'orderedList', attrs: { start: positiveInt(node.attrs?.start, 1) }, content: normalizeChildren(node.content) }]
    case 'tableCell':
    case 'tableHeader': {
      const attrs: Record<string, number> = {}
      const colspan = positiveInt(node.attrs?.colspan, 1)
      const rowspan = positiveInt(node.attrs?.rowspan, 1)
      if (colspan > 1) attrs.colspan = colspan
      if (rowspan > 1) attrs.rowspan = rowspan
      const content = normalizeChildren(node.content)
      return [{ type: node.type, ...(Object.keys(attrs).length ? { attrs } : {}), content: content.length ? content : [{ type: 'paragraph', content: [] }] }]
    }
    case 'image': {
      const src = safeUrl(node.attrs?.src)
      if (!src && !node.attrs?.mediaId) return []
      return [{
        type: 'image',
        attrs: {
          src: src ?? '',
          mediaId: (node.attrs?.mediaId as string) || null,
          widthPct: Math.min(100, Math.max(10, positiveInt(node.attrs?.widthPct, 100))),
          alt: typeof node.attrs?.alt === 'string' ? node.attrs.alt : null,
        },
      }]
    }
    case 'audio':
    case 'video': {
      const src = safeUrl(node.attrs?.src)
      if (!src && !node.attrs?.mediaId) return []
      const attrs: Record<string, string | number | boolean | null> = {
        src: src ?? '',
        mediaId: (node.attrs?.mediaId as string) || null,
      }
      if (node.type === 'audio') {
        attrs.compact = typeof node.attrs?.class === 'string' && node.attrs.class.includes(ILM_RICHTEXT_AUDIO_COMPACT_CLASS)
      } else {
        attrs.widthPct = Math.min(100, Math.max(10, positiveInt(node.attrs?.widthPct, 100)))
      }
      return [{ type: node.type, attrs }]
    }
    default:
      if (node.type && BLOCK_CONTAINERS.has(node.type)) {
        return [{ type: node.type, content: normalizeChildren(node.content) }]
      }
      // Unknown node: keep its children so no text is lost.
      return normalizeChildren(node.content)
  }
}

function isEmptyParagraph(node: IlmNode) {
  return node.type === 'paragraph' && (!node.content || node.content.length === 0)
}

/** Normalizes TipTap JSON (editor.getJSON()) into IlmDoc. */
export function normalizeToIlmDoc(json: JSONContent): IlmDoc {
  const content = normalizeChildren(json.content)
  // Trim empty paragraphs at both ends (editor artefacts).
  while (content.length && isEmptyParagraph(content[0])) content.shift()
  while (content.length && isEmptyParagraph(content[content.length - 1])) content.pop()
  return { type: 'doc', version: ILM_DOC_VERSION, content }
}

/** Converts stored lesson HTML into IlmDoc using exactly the editor's schema. */
export function htmlToIlmDoc(html: string): IlmDoc {
  if (!html || !html.trim()) return { type: 'doc', version: ILM_DOC_VERSION, content: [] }
  const json = generateJSON(normalizeHtmlForEditor(html), extensions())
  return normalizeToIlmDoc(json)
}

/** Plain text of a document (search, previews). */
export function ilmDocToPlainText(doc: IlmDoc): string {
  const parts: string[] = []
  const walk = (nodes: IlmNode[] | undefined) => {
    for (const n of nodes ?? []) {
      if (n.type === 'text' && n.text) parts.push(n.text)
      else if (n.type === 'hardBreak') parts.push('\n')
      walk(n.content)
      if (n.type === 'paragraph' || n.type === 'heading') parts.push('\n')
    }
  }
  walk(doc.content)
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim()
}
