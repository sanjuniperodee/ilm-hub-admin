import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { BreadcrumbItem } from './PageHeader'

interface ShellContextValue {
  breadcrumbs: BreadcrumbItem[] | null
  setBreadcrumbs: (items: BreadcrumbItem[] | null) => void
  actionsHost: HTMLElement | null
  setActionsHost: (el: HTMLElement | null) => void
}

const ShellContext = createContext<ShellContextValue | null>(null)

/** Mounted by `Layout`. Pages don't render this. */
export function ShellProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[] | null>(null)
  const [actionsHost, setActionsHost] = useState<HTMLElement | null>(null)
  const value = useMemo(
    () => ({ breadcrumbs, setBreadcrumbs, actionsHost, setActionsHost }),
    [breadcrumbs, actionsHost],
  )
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

/** Internal: used by Layout to read/own the shell state. */
export function useShellState() {
  return useContext(ShellContext)
}

/**
 * Replace the auto-generated breadcrumbs in the top bar with real object names.
 * Pass a stable array (or memoize it); items are compared by value.
 *
 * @example
 * useShellBreadcrumbs(course && [
 *   { label: 'Курсы', to: '/content' },
 *   { label: course.title, to: `/content/courses/${course.id}` },
 *   { label: lesson?.title ?? 'Урок' },
 * ])
 */
export function useShellBreadcrumbs(items: BreadcrumbItem[] | null | undefined | false) {
  const ctx = useContext(ShellContext)
  const key = items ? JSON.stringify(items) : ''
  const setBreadcrumbs = ctx?.setBreadcrumbs
  useEffect(() => {
    if (!setBreadcrumbs) return
    setBreadcrumbs(key ? (JSON.parse(key) as BreadcrumbItem[]) : null)
    return () => setBreadcrumbs(null)
  }, [key, setBreadcrumbs])
}

/**
 * Renders its children in the top bar (right side, before the user menu). Use for
 * actions that must stay reachable while scrolling a long editor — e.g. «Сохранить».
 * Keep it to 1–2 small buttons; the page's own PageHeader still holds the full set.
 *
 * @example
 * <TopBarActions>
 *   <Button size="small" variant="contained" onClick={save} disabled={!dirty}>Сохранить</Button>
 * </TopBarActions>
 */
export function TopBarActions({ children }: { children: ReactNode }) {
  const ctx = useContext(ShellContext)
  if (!ctx?.actionsHost) return null
  return createPortal(children, ctx.actionsHost)
}
