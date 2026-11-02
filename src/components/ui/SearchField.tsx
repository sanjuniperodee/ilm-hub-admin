import { IconButton, InputAdornment, TextField, type SxProps, type Theme } from '@mui/material'
import { Close, Search } from '@mui/icons-material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { KeyboardHint } from './KeyboardHint'
import { mergeSx } from './sx'

export interface SearchFieldProps {
  /** Committed (debounced) value — controlled from the parent. */
  value: string
  /** Called with the trimmed value after `debounceMs` of no typing, on Enter, and on clear. */
  onChange: (value: string) => void
  /** Debounce delay. Default 300ms. Use 0 for instant client-side filtering of short lists. */
  debounceMs?: number
  placeholder?: string
  /** Accessible label (placeholder is not a label). Default «Поиск». */
  label?: string
  /** Press «/» anywhere on the page (outside inputs) to focus this field. */
  enableSlashShortcut?: boolean
  autoFocus?: boolean
  /** Arabic search: right-to-left input with Arabic font. */
  rtl?: boolean
  fullWidth?: boolean
  sx?: SxProps<Theme>
}

/**
 * Search input with debounce, clear button and optional «/» shortcut.
 * The parent owns the committed value (put it in the URL or query key), the field
 * owns the in-progress text.
 *
 * @example
 * const [q, setQ] = useState('')
 * <SearchField value={q} onChange={setQ} placeholder="Слово, перевод или корень" enableSlashShortcut />
 */
export function SearchField({
  value,
  onChange,
  debounceMs = 300,
  placeholder = 'Поиск',
  label = 'Поиск',
  enableSlashShortcut,
  autoFocus,
  rtl,
  fullWidth,
  sx,
}: SearchFieldProps) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastCommitted = useRef(value)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const commit = useCallback((next: string) => {
    lastCommitted.current = next
    onChangeRef.current(next)
  }, [])

  // Sync only when the parent changes the value itself (e.g. «Сбросить фильтры»),
  // not when it echoes back what we just committed — that would eat in-flight typing.
  useEffect(() => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value
      setDraft(value)
    }
  }, [value])

  useEffect(() => {
    const next = draft.trim()
    if (next === lastCommitted.current) return
    const t = window.setTimeout(() => commit(next), debounceMs)
    return () => window.clearTimeout(t)
  }, [draft, debounceMs, commit])

  useEffect(() => {
    if (!enableSlashShortcut) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enableSlashShortcut])

  const clear = () => {
    setDraft('')
    commit('')
    inputRef.current?.focus()
  }

  return (
    <TextField
      inputRef={inputRef}
      type="search"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit(draft.trim())
        if (e.key === 'Escape' && draft) {
          e.stopPropagation()
          clear()
        }
      }}
      placeholder={placeholder}
      autoFocus={autoFocus}
      fullWidth={fullWidth}
      inputProps={{
        'aria-label': label,
        dir: rtl ? 'rtl' : undefined,
        lang: rtl ? 'ar' : undefined,
        style: rtl ? { fontFamily: "'Noto Sans Arabic', sans-serif", fontSize: '1.0625rem' } : undefined,
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search sx={{ fontSize: 18, color: 'text.secondary' }} aria-hidden />
          </InputAdornment>
        ),
        endAdornment: draft ? (
          <InputAdornment position="end">
            <IconButton size="small" onClick={clear} aria-label="Очистить поиск" edge="end">
              <Close sx={{ fontSize: 16 }} />
            </IconButton>
          </InputAdornment>
        ) : enableSlashShortcut ? (
          <InputAdornment position="end" sx={{ display: { xs: 'none', md: 'flex' } }}>
            <KeyboardHint keys={['/']} />
          </InputAdornment>
        ) : undefined,
      }}
      sx={mergeSx(
        {
          minWidth: { xs: '100%', sm: 260 },
          '& input[type="search"]::-webkit-search-cancel-button': { display: 'none' },
        },
        sx,
      )}
    />
  )
}
