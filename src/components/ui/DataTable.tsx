import {
  Box,
  LinearProgress,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  type SxProps,
  type Theme,
} from '@mui/material'
import { useMemo, useState, type ReactNode } from 'react'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { mergeSx, visuallyHidden } from './sx'

export type SortDirection = 'asc' | 'desc'
export interface SortState {
  by: string
  direction: SortDirection
}

export interface DataTableColumn<T> {
  /** Unique id; also the default property read from the row when `render` is omitted. */
  id: string
  header: ReactNode
  /** Cell renderer. Default: `String(row[id] ?? '—')`. */
  render?: (row: T, index: number) => ReactNode
  /** Enables the sort label on this column. */
  sortable?: boolean
  /** Value used for client-side sorting. Default: `row[id]`. */
  sortValue?: (row: T) => string | number | Date | boolean | null | undefined
  align?: 'left' | 'right' | 'center'
  width?: number | string
  minWidth?: number | string
  /** Hide the column below this breakpoint (keep the 2–3 key columns visible on tablet). */
  hideBelow?: 'sm' | 'md' | 'lg'
  /** Prevent wrapping (dates, numbers, chips). */
  nowrap?: boolean
}

export interface ServerPagination {
  /** Zero-based page index. */
  page: number
  rowsPerPage: number
  /** Total rows on the server. */
  total: number
  onPageChange: (page: number) => void
  onRowsPerPageChange?: (rowsPerPage: number) => void
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[] | undefined | null
  getRowId: (row: T) => string | number
  /** Required accessible name, e.g. «Список пользователей». */
  'aria-label': string

  loading?: boolean
  error?: unknown
  onRetry?: () => void | Promise<unknown>
  /** Node shown when there are no rows (use `<EmptyState size="sm" …/>`). */
  emptyState?: ReactNode

  onRowClick?: (row: T) => void
  selectedRowId?: string | number | null
  dense?: boolean
  stickyHeader?: boolean
  /** Scroll height for long tables with `stickyHeader`. */
  maxHeight?: number | string

  /**
   * Sorting. Uncontrolled by default (client-side, starting from `defaultSort`).
   * Pass `sort` + `onSortChange` for server-side sorting — rows are then rendered as given.
   */
  defaultSort?: SortState
  sort?: SortState | null
  onSortChange?: (sort: SortState) => void

  /**
   * `true` → client-side pagination of `rows`. An object → server-side pagination.
   * Omit for no pagination.
   */
  pagination?: boolean | ServerPagination
  rowsPerPageOptions?: number[]
  initialRowsPerPage?: number
  sx?: SxProps<Theme>
}

const HIDE: Record<NonNullable<DataTableColumn<unknown>['hideBelow']>, SxProps<Theme>> = {
  sm: { display: { xs: 'none', sm: 'table-cell' } },
  md: { display: { xs: 'none', md: 'table-cell' } },
  lg: { display: { xs: 'none', lg: 'table-cell' } },
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return String(a).localeCompare(String(b), 'ru', { numeric: true, sensitivity: 'base' })
}

/**
 * Table with sorting, pagination and built-in loading / error / empty states.
 * Covers the common list page; for drag-and-drop ordering or tree data use plain MUI Table.
 *
 * @example
 * <DataTable
 *   aria-label="Словарь"
 *   rows={words}
 *   getRowId={(w) => w.id}
 *   loading={isLoading}
 *   error={error}
 *   onRetry={refetch}
 *   pagination
 *   defaultSort={{ by: 'createdAt', direction: 'desc' }}
 *   onRowClick={(w) => openEditor(w)}
 *   emptyState={<EmptyState size="sm" title="Слов не найдено" description="Измените запрос или сбросьте фильтры." />}
 *   columns={[
 *     { id: 'arabic', header: 'Слово', render: (w) => <ArabicText size="sm">{w.arabic}</ArabicText> },
 *     { id: 'translation', header: 'Перевод', sortable: true },
 *     { id: 'level', header: 'Уровень', hideBelow: 'md', render: (w) => <StatusChip label={w.level} tone="brand" hideDot /> },
 *     { id: 'createdAt', header: 'Добавлено', sortable: true, nowrap: true, align: 'right',
 *       sortValue: (w) => new Date(w.createdAt), render: (w) => format(new Date(w.createdAt), 'd MMM yyyy', { locale: ru }) },
 *   ]}
 * />
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  'aria-label': ariaLabel,
  loading,
  error,
  onRetry,
  emptyState,
  onRowClick,
  selectedRowId,
  dense,
  stickyHeader,
  maxHeight,
  defaultSort,
  sort: controlledSort,
  onSortChange,
  pagination,
  rowsPerPageOptions = [10, 25, 50, 100],
  initialRowsPerPage = 25,
  sx,
}: DataTableProps<T>) {
  const [localSort, setLocalSort] = useState<SortState | null>(defaultSort ?? null)
  const [localPage, setLocalPage] = useState(0)
  const [localRpp, setLocalRpp] = useState(initialRowsPerPage)

  const serverSort = onSortChange !== undefined
  const sort = serverSort ? controlledSort ?? null : localSort
  const server = typeof pagination === 'object' ? pagination : null
  const clientPaginate = pagination === true

  const sorted = useMemo(() => {
    const list = rows ?? []
    if (serverSort || !sort) return list
    const col = columns.find((c) => c.id === sort.by)
    if (!col) return list
    const get = col.sortValue ?? ((r: T) => (r as Record<string, unknown>)[col.id] as never)
    const dir = sort.direction === 'asc' ? 1 : -1
    return [...list].sort((a, b) => compare(get(a), get(b)) * dir)
  }, [rows, sort, serverSort, columns])

  const total = server ? server.total : sorted.length
  const page = server ? server.page : localPage
  const rpp = server ? server.rowsPerPage : localRpp
  const maxPage = Math.max(0, Math.ceil(total / rpp) - 1)
  const safePage = Math.min(page, maxPage)
  const visible = clientPaginate ? sorted.slice(safePage * rpp, safePage * rpp + rpp) : sorted

  const handleSort = (id: string) => {
    const next: SortState =
      sort?.by === id ? { by: id, direction: sort.direction === 'asc' ? 'desc' : 'asc' } : { by: id, direction: 'asc' }
    if (serverSort) onSortChange?.(next)
    else setLocalSort(next)
    if (!server) setLocalPage(0)
  }

  const hasRows = visible.length > 0
  const initialLoading = loading && !hasRows

  if (error && !hasRows) {
    return (
      <Box sx={mergeSx({ border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }, sx)}>
        <ErrorState error={error} onRetry={onRetry} />
      </Box>
    )
  }

  return (
    <Box sx={mergeSx({ position: 'relative' }, sx)}>
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight, position: 'relative', border: 'none', borderRadius: 0 }}>
          {loading && hasRows && (
            <LinearProgress
              aria-label="Обновление данных"
              sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, borderRadius: 0, height: 2 }}
            />
          )}
          <Table size={dense ? 'small' : 'medium'} stickyHeader={stickyHeader} aria-label={ariaLabel} aria-busy={loading || undefined}>
            <TableHead>
              <TableRow>
                {columns.map((c) => {
                  const active = sort?.by === c.id
                  return (
                    <TableCell
                      key={c.id}
                      align={c.align}
                      sortDirection={active ? sort?.direction : false}
                      sx={mergeSx({ width: c.width, minWidth: c.minWidth }, c.hideBelow ? HIDE[c.hideBelow] : undefined)}
                    >
                      {c.sortable ? (
                        <TableSortLabel
                          active={active}
                          direction={active ? sort?.direction : 'asc'}
                          onClick={() => handleSort(c.id)}
                        >
                          {c.header}
                          {active && (
                            <Box component="span" sx={visuallyHidden}>
                              {sort?.direction === 'desc' ? 'по убыванию' : 'по возрастанию'}
                            </Box>
                          )}
                        </TableSortLabel>
                      ) : (
                        c.header
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {initialLoading &&
                Array.from({ length: Math.min(rpp, 8) }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {columns.map((c) => (
                      <TableCell key={c.id} sx={c.hideBelow ? HIDE[c.hideBelow] : undefined}>
                        <Skeleton width={`${50 + ((i * 17 + c.id.length * 7) % 40)}%`} height={18} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && !hasRows && (
                <TableRow>
                  <TableCell colSpan={columns.length} sx={{ borderBottom: 'none', p: 0 }}>
                    {emptyState ?? <EmptyState size="sm" title="Здесь пока пусто" />}
                  </TableCell>
                </TableRow>
              )}

              {visible.map((row, index) => {
                const id = getRowId(row)
                const clickable = Boolean(onRowClick)
                return (
                  <TableRow
                    key={id}
                    hover={clickable}
                    selected={selectedRowId != null && selectedRowId === id}
                    onClick={clickable ? () => onRowClick?.(row) : undefined}
                    onKeyDown={
                      clickable
                        ? (e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
                              e.preventDefault()
                              onRowClick?.(row)
                            }
                          }
                        : undefined
                    }
                    tabIndex={clickable ? 0 : undefined}
                    sx={
                      clickable
                        ? {
                            cursor: 'pointer',
                            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.light', outlineOffset: -2 },
                          }
                        : undefined
                    }
                  >
                    {columns.map((c) => (
                      <TableCell
                        key={c.id}
                        align={c.align}
                        sx={mergeSx(
                          { whiteSpace: c.nowrap ? 'nowrap' : undefined, fontVariantNumeric: c.align === 'right' ? 'tabular-nums' : undefined },
                          c.hideBelow ? HIDE[c.hideBelow] : undefined,
                        )}
                      >
                        {c.render
                          ? c.render(row, index)
                          : String((row as Record<string, unknown>)[c.id] ?? '—')}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {(clientPaginate || server) && total > 0 && (
          <TablePagination
            component="div"
            count={total}
            page={safePage}
            rowsPerPage={rpp}
            rowsPerPageOptions={rowsPerPageOptions}
            onPageChange={(_, p) => (server ? server.onPageChange(p) : setLocalPage(p))}
            onRowsPerPageChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (server) {
                server.onRowsPerPageChange?.(v)
                server.onPageChange(0)
              } else {
                setLocalRpp(v)
                setLocalPage(0)
              }
            }}
            labelRowsPerPage="Строк на странице:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
          />
        )}
      </Box>
      {error != null && hasRows && <ErrorState variant="inline" error={error} onRetry={onRetry} sx={{ mt: 1.5 }} />}
    </Box>
  )
}
