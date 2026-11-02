import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { UNSAFE_NavigationContext, useLocation } from 'react-router-dom'

/** Width of an element, updated on resize (container-driven layout). Returns a callback ref. */
export function useElementWidth<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    if (!node) return
    setWidth(node.getBoundingClientRect().width)
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (typeof w === 'number') setWidth(w)
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [node])
  return [setNode, width] as const
}

export function useViewportHeight() {
  const [h, setH] = useState(() => (typeof window === 'undefined' ? 900 : window.innerHeight))
  useEffect(() => {
    const on = () => setH(window.innerHeight)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return h
}

/**
 * Ctrl/⌘+S saves. Works while typing (it is the one shortcut people expect inside fields)
 * and always suppresses the browser «Save page» dialog on this screen.
 */
export function useSaveShortcut(handler: () => void) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!e.repeat) ref.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

type Navigator = { push: (...args: any[]) => void; replace: (...args: any[]) => void }

function pathnameOf(to: unknown): string | null {
  if (typeof to === 'string') return to.split(/[?#]/)[0] || null
  if (to && typeof to === 'object' && 'pathname' in to) return ((to as { pathname?: string }).pathname ?? null) || null
  return null
}

/**
 * Guards unsaved work:
 * - closing / reloading the tab → the browser's native «Leave site?» dialog;
 * - in-app navigation to another page (links, sidebar, back button in the header) →
 *   `confirmLeave()`; navigation continues only if it resolves to true.
 *
 * The app uses `<BrowserRouter>` (not a data router), so `useBlocker` is unavailable; this
 * wraps the router navigator's push/replace instead. Search-param changes on the same
 * page (tab / selected block) are never blocked. The browser Back button cannot be
 * intercepted this way — the autosaved draft covers that case.
 */
export function useUnsavedChangesGuard(when: boolean, confirmLeave: () => Promise<boolean>) {
  const { navigator } = useContext(UNSAFE_NavigationContext) as unknown as { navigator: Navigator }
  const location = useLocation()
  const confirmRef = useRef(confirmLeave)
  confirmRef.current = confirmLeave
  const pathRef = useRef(location.pathname)
  pathRef.current = location.pathname

  useEffect(() => {
    if (!when) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [when])

  useEffect(() => {
    if (!when || !navigator) return
    const originalPush = navigator.push
    const originalReplace = navigator.replace
    const wrap =
      (original: (...args: any[]) => void) =>
      (...args: any[]) => {
        const target = pathnameOf(args[0])
        if (!target || target === pathRef.current) {
          original.apply(navigator, args)
          return
        }
        void confirmRef.current().then((ok) => {
          if (ok) original.apply(navigator, args)
        })
      }
    navigator.push = wrap(originalPush)
    navigator.replace = wrap(originalReplace)
    return () => {
      navigator.push = originalPush
      navigator.replace = originalReplace
    }
  }, [when, navigator])
}
