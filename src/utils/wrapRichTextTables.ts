/**
 * Class + inline style for the table “card” shell.
 * Parity: mobile `kIlmRichtextTableCornerPx` / `kIlmRichtextTableBlockMarginPx` and
 * [MobilePreview] `my: 1.5` (12px) on this class.
 */
export const ILM_RICHTEXT_TABLE_WRAP_CLASS = 'ilm-richtext-table-wrap'

/** `border-radius` must match mobile `kIlmRichtextTableCornerPx` (14). */
export const ILM_RICHTEXT_TABLE_WRAP_STYLE =
  'border-radius:14px;overflow:hidden;margin:12px 0;width:100%;max-width:100%;box-sizing:border-box'

/**
 * Wraps bare <table> nodes in a clip container so border-radius works with border-collapse.
 * Skips tables already inside .ilm-richtext-table-wrap or section[data-ilm-table-wrap].
 */
export function wrapBareTablesInContainer(root: HTMLElement): void {
  const doc = root.ownerDocument
  const tables = Array.from(root.querySelectorAll('table'))
  for (const table of tables) {
    if (table.closest(`.${ILM_RICHTEXT_TABLE_WRAP_CLASS}`)) continue
    if (table.closest('section[data-ilm-table-wrap="1"]')) continue
    const wrap = doc.createElement('div')
    wrap.className = ILM_RICHTEXT_TABLE_WRAP_CLASS
    wrap.setAttribute('style', ILM_RICHTEXT_TABLE_WRAP_STYLE)
    table.parentNode!.insertBefore(wrap, table)
    wrap.appendChild(table)
  }
}

/**
 * HTML fragment → same fragment with bare tables wrapped (for preview / SSR-safe string path).
 * **Persistence:** LessonEditorPage also runs this on save so the API stores the same
 * structure the editor and mobile agree on. Safe to call multiple times.
 */
export function wrapRichTextTables(html: string): string {
  if (!html || !html.toLowerCase().includes('<table')) return html
  const parsed = new DOMParser().parseFromString(
    `<div id="ilm-rt-root">${html}</div>`,
    'text/html',
  )
  const root = parsed.getElementById('ilm-rt-root')
  if (!root) return html
  wrapBareTablesInContainer(root)
  return root.innerHTML
}
