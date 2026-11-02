import { useEffect, useState } from 'react'
import { TextField, type TextFieldProps } from '@mui/material'

export type CommitTextFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'onBlur'> & {
  value: string
  /** Called on blur (or Enter in single-line fields) only when the text actually changed. */
  onCommit: (value: string) => void
}

/**
 * Text field that edits a local draft and saves once, on blur. Used for inline rule editing
 * so a PATCH is not sent on every keystroke.
 */
export function CommitTextField({ value, onCommit, multiline, ...rest }: CommitTextFieldProps) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  const commit = () => {
    if (draft !== value) onCommit(draft)
  }

  return (
    <TextField
      {...rest}
      multiline={multiline}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (!multiline && e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') setDraft(value)
      }}
    />
  )
}
