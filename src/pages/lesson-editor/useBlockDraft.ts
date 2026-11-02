import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { snapshotDraft } from './blockMapping'
import type { BlockDraft } from './types'

/** Some editors normalise their config right after mounting (fill defaults, attach media ids). */
const SETTLE_MS = 450

export type StoredDraft = { key: string; savedAt: string; draft: BlockDraft }

/**
 * The open block's draft: dirty tracking against a baseline snapshot, and autosave to
 * localStorage (`ilmhub:lesson-block-draft:<lessonId>:<blockId|new>`, same key as before)
 * with an offer to restore it next time the block is opened.
 */
export function useBlockDraft(lessonId: string | undefined, initial: BlockDraft | null) {
  const [draft, setDraftState] = useState<BlockDraft | null>(initial)
  const [baseline, setBaseline] = useState(initial ? snapshotDraft(initial) : '')
  const [session, setSession] = useState(0)
  const [availableDraft, setAvailableDraft] = useState<StoredDraft | null>(null)
  const settleUntil = useRef(0)

  const storageKey = useMemo(
    () => (lessonId && draft ? `ilmhub:lesson-block-draft:${lessonId}:${draft.id || 'new'}` : ''),
    [lessonId, draft?.id], // eslint-disable-line react-hooks/exhaustive-deps -- key depends on id only
  )

  const dirty = useMemo(() => !!draft && !!baseline && snapshotDraft(draft) !== baseline, [draft, baseline])
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  /** Treat changes made in the next moment as part of the loaded state, not user edits. */
  const settle = useCallback(() => {
    settleUntil.current = Date.now() + SETTLE_MS
  }, [])

  useEffect(() => {
    if (draft && Date.now() < settleUntil.current) setBaseline(snapshotDraft(draft))
  }, [draft])

  /** Opens a draft (selected block or a new one) as the clean state. */
  const loadDraft = useCallback(
    (next: BlockDraft | null) => {
      setDraftState(next)
      setBaseline(next ? snapshotDraft(next) : '')
      setSession((s) => s + 1)
      settle()
    },
    [settle],
  )

  const setDraft = useCallback((updater: (prev: BlockDraft) => BlockDraft) => {
    setDraftState((prev) => (prev ? updater(prev) : prev))
  }, [])

  /** After a successful save: `saved` becomes the new clean state. */
  const markSaved = useCallback((saved: BlockDraft) => {
    setDraftState(saved)
    setBaseline(snapshotDraft(saved))
  }, [])

  /** Changes applied to both the draft and the baseline (e.g. new position after reordering). */
  const patchClean = useCallback((patch: Partial<BlockDraft>) => {
    setDraftState((prev) => (prev ? { ...prev, ...patch } : prev))
    setBaseline((b) => {
      if (!b) return b
      try {
        return JSON.stringify({ ...JSON.parse(b), ...patch })
      } catch {
        return b
      }
    })
  }, [])

  /** Discard edits: back to the last clean state. */
  const revert = useCallback(() => {
    if (!baseline) return
    try {
      setDraftState(JSON.parse(baseline) as BlockDraft)
      setSession((s) => s + 1)
      settle()
    } catch {
      /* ignore */
    }
  }, [baseline, settle])

  // Offer the stored draft when a block is opened.
  useEffect(() => {
    if (!storageKey) {
      setAvailableDraft(null)
      return
    }
    try {
      const raw = window.localStorage.getItem(storageKey)
      const parsed = raw ? (JSON.parse(raw) as { savedAt?: string; draft?: BlockDraft }) : null
      if (!parsed?.draft || (draft && snapshotDraft(parsed.draft) === snapshotDraft(draft))) {
        setAvailableDraft(null)
        return
      }
      setAvailableDraft({ key: storageKey, savedAt: parsed.savedAt || '', draft: parsed.draft })
    } catch {
      setAvailableDraft(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when another block is opened
  }, [storageKey, session])

  // Autosave edits (debounced).
  useEffect(() => {
    if (!storageKey || !baseline || !draft) return
    const timer = window.setTimeout(() => {
      try {
        if (!dirtyRef.current) return
        window.localStorage.setItem(storageKey, JSON.stringify({ savedAt: new Date().toISOString(), draft }))
      } catch {
        // localStorage may be unavailable; editing should continue.
      }
    }, 900)
    return () => window.clearTimeout(timer)
  }, [draft, baseline, storageKey])

  const clearStored = useCallback(
    (key = storageKey) => {
      if (!key) return
      try {
        window.localStorage.removeItem(key)
      } catch {
        // ignore
      }
      setAvailableDraft((a) => (a?.key === key ? null : a))
    },
    [storageKey],
  )

  const restoreStored = useCallback(() => {
    if (!availableDraft) return
    // Keep the baseline: the restored text is still unsaved.
    setDraftState({ ...availableDraft.draft, id: draft?.id ?? availableDraft.draft.id })
    setSession((s) => s + 1)
    setAvailableDraft(null)
  }, [availableDraft, draft?.id])

  return {
    draft,
    setDraft,
    loadDraft,
    markSaved,
    patchClean,
    revert,
    dirty,
    dirtyRef,
    session,
    settle,
    storageKey,
    availableDraft,
    clearStored,
    restoreStored,
  }
}
