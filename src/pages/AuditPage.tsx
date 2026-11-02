import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Button,
  Collapse,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { ContentCopyOutlined, KeyboardArrowDown, KeyboardArrowRight } from '@mui/icons-material'
import { getAuditLogs } from '../api/adminApi'
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusChip, Toolbar, visuallyHidden } from '../components/ui'
import { color, radius } from '../theme/tokens'
import { InfoList } from './users/InfoList'
import { formatDateTime, formatRelative } from './users/userLabels'
import { copyToClipboard } from './admins/adminShared'
import {
  ACTION_SHORT,
  RESOURCES,
  actionTone,
  describeAudit,
  formatValue,
  metadataDiff,
  requestLine,
  resourceLabel,
  type AuditLog,
} from './admins/auditFormat'

const COLS = 6

function MetadataView({ meta }: { meta?: Record<string, unknown> | null }) {
  const diff = metadataDiff(meta)
  if (!meta || Object.keys(meta).length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Дополнительных данных нет.
      </Typography>
    )
  }
  if (diff) {
    return (
      <Table size="small" aria-label="Изменения" sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
        <TableHead>
          <TableRow>
            <TableCell>Поле</TableCell>
            <TableCell>Было</TableCell>
            <TableCell>Стало</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {diff.map((row) => (
            <TableRow key={row.key} sx={{ opacity: row.changed ? 1 : 0.6 }}>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{row.key}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', whiteSpace: 'pre-wrap', bgcolor: row.changed ? color.error.soft : undefined }}>
                {formatValue(row.before)}
              </TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', whiteSpace: 'pre-wrap', bgcolor: row.changed ? color.success.soft : undefined }}>
                {formatValue(row.after)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: 'grid',
        gridTemplateColumns: 'minmax(120px, max-content) minmax(0, 1fr)',
        columnGap: 2,
        rowGap: 0.75,
        p: 1.5,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: `${radius.md}px`,
      }}
    >
      {Object.entries(meta).map(([k, v]) => (
        <Fragment key={k}>
          <Typography component="dt" variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
            {k}
          </Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {formatValue(v)}
          </Typography>
        </Fragment>
      ))}
    </Box>
  )
}

function AuditRow({
  log,
  open,
  onToggle,
  onFilterUser,
  onFilterRecord,
}: {
  log: AuditLog
  open: boolean
  onToggle: () => void
  onFilterUser: () => void
  onFilterRecord: () => void
}) {
  const detailId = `audit-detail-${log.id}`
  const req = requestLine(log)
  return (
    <>
      <TableRow
        hover
        onClick={onToggle}
        sx={{ cursor: 'pointer', '& > td': { borderBottom: open ? 'none' : undefined }, bgcolor: open ? color.bronze[50] : undefined }}
      >
        <TableCell padding="checkbox" sx={{ pl: 1 }}>
          <IconButton
            size="small"
            aria-expanded={open}
            aria-controls={detailId}
            aria-label={open ? 'Скрыть подробности' : 'Показать подробности'}
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
          >
            {open ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowRight fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <Typography variant="body2">{formatDateTime(log.createdAt)}</Typography>
          <Typography variant="caption" color="text.secondary">
            {formatRelative(log.createdAt)}
          </Typography>
        </TableCell>
        <TableCell sx={{ minWidth: 180 }}>
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere', fontWeight: 500 }}>
            {log.userEmail || log.userId}
          </Typography>
        </TableCell>
        <TableCell sx={{ minWidth: 260 }}>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <StatusChip label={ACTION_SHORT[log.action] ?? log.action} tone={actionTone(log.action)} />
            <Typography variant="body2">{describeAudit(log)}</Typography>
          </Stack>
          {req && (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere', display: 'block', mt: 0.25 }}>
              {req}
            </Typography>
          )}
        </TableCell>
        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
          <Typography variant="body2">{resourceLabel(log.resource)}</Typography>
        </TableCell>
        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }} title={log.resourceId}>
            {log.resourceId ? `${log.resourceId.slice(0, 8)}…` : '—'}
          </Typography>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={COLS} sx={{ p: 0, bgcolor: color.bronze[50], borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} unmountOnExit>
            <Box id={detailId} sx={{ px: { xs: 2, md: 7 }, py: 2 }}>
              <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1.2fr)' } }}>
                <Stack gap={2}>
                  <InfoList
                    items={[
                      { label: 'Время', value: formatDateTime(log.createdAt) },
                      { label: 'IP-адрес', value: log.ipAddress },
                      {
                        label: 'Сотрудник',
                        value: (
                          <>
                            {log.userEmail || '—'}
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace' }}>
                              {log.userId}
                            </Typography>
                          </>
                        ),
                      },
                      {
                        label: 'Запись',
                        value: log.resourceId ? (
                          <Stack direction="row" alignItems="center" gap={0.5} component="span">
                            <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', overflowWrap: 'anywhere' }}>
                              {log.resourceId}
                            </Box>
                            <Tooltip title="Скопировать ID">
                              <IconButton size="small" aria-label="Скопировать ID записи" onClick={() => copyToClipboard(log.resourceId!, 'ID скопирован')}>
                                <ContentCopyOutlined sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        ) : null,
                      },
                      { label: 'Браузер', value: log.userAgent, wide: true },
                    ]}
                  />
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    <Button size="small" variant="outlined" onClick={onFilterUser} sx={{ bgcolor: 'background.paper' }}>
                      Все действия сотрудника
                    </Button>
                    {log.resourceId && (
                      <Button size="small" variant="outlined" onClick={onFilterRecord} sx={{ bgcolor: 'background.paper' }}>
                        История этой записи
                      </Button>
                    )}
                  </Stack>
                </Stack>
                <Box>
                  <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
                    Данные события
                  </Typography>
                  <MetadataView meta={log.metadata} />
                </Box>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [resourceFilter, setResourceFilter] = useState<string>('')
  const [resourceIdFilter, setResourceIdFilter] = useState<string>('')
  const [userFilter, setUserFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // Staff seen in loaded pages — the API has no "list of actors" endpoint.
  const knownUsers = useRef(new Map<string, string>())
  const [, forceUsers] = useState(0)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string | number> = {
        page: page + 1,
        limit: rowsPerPage,
      }
      if (resourceFilter) params.resource = resourceFilter
      if (resourceFilter && resourceIdFilter) params.resourceId = resourceIdFilter
      if (userFilter) params.userId = userFilter
      const response = await getAuditLogs(params)
      const res = response.data as { data?: AuditLog[]; total?: number }
      const list = res.data ?? []
      setLogs(list)
      setTotal(res.total ?? 0)
      let added = false
      list.forEach((l) => {
        if (l.userId && !knownUsers.current.has(l.userId)) {
          knownUsers.current.set(l.userId, l.userEmail || l.userId)
          added = true
        }
      })
      if (added) forceUsers((n) => n + 1)
    } catch (e) {
      console.error('Error fetching audit logs:', e)
      setLogs([])
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, resourceFilter, resourceIdFilter, userFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Client-side refinements of the loaded page: the API has no date filter, and with a
  // user filter it ignores `resource`.
  const visible = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null
    return logs.filter((l) => {
      const t = new Date(l.createdAt).getTime()
      if (from !== null && t < from) return false
      if (to !== null && t > to) return false
      if (userFilter && resourceFilter && l.resource !== resourceFilter) return false
      if (userFilter && resourceIdFilter && l.resourceId !== resourceIdFilter) return false
      return true
    })
  }, [logs, dateFrom, dateTo, userFilter, resourceFilter, resourceIdFilter])

  const clientFiltered = Boolean(dateFrom || dateTo || (userFilter && (resourceFilter || resourceIdFilter)))
  const hasFilters = Boolean(resourceFilter || resourceIdFilter || userFilter || dateFrom || dateTo)

  const resetFilters = () => {
    setResourceFilter('')
    setResourceIdFilter('')
    setUserFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const userOptions = Array.from(knownUsers.current.entries()).sort((a, b) => a[1].localeCompare(b[1]))

  const summary = loading && logs.length === 0
    ? undefined
    : clientFiltered
      ? `На этой странице: ${visible.length} из ${logs.length}`
      : `Записей: ${total.toLocaleString('ru-RU')}`

  return (
    <>
      <PageHeader title="Журнал аудита" subtitle="Кто из сотрудников что менял в админ-панели. Нажмите на строку, чтобы увидеть подробности." />

      <Toolbar hasActiveFilters={hasFilters} onReset={resetFilters} summary={summary}>
        <TextField
          select
          size="small"
          label="Раздел" SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
          value={resourceFilter}
          onChange={(e) => {
            setResourceFilter(e.target.value)
            setResourceIdFilter('')
            setPage(0)
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Все разделы</MenuItem>
          {Object.entries(RESOURCES).map(([value, r]) => (
            <MenuItem key={value} value={value}>
              {r.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Сотрудник" SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
          value={userFilter}
          onChange={(e) => {
            setUserFilter(e.target.value)
            setPage(0)
          }}
          sx={{ minWidth: 220, maxWidth: 280 }}
        >
          <MenuItem value="">Все сотрудники</MenuItem>
          {userOptions.map(([id, label]) => (
            <MenuItem key={id} value={id}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          type="date"
          size="small"
          label="С"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <TextField
          type="date"
          size="small"
          label="По"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        {resourceIdFilter && (
          <StatusChip label={`Запись ${resourceIdFilter.slice(0, 8)}…`} tone="brand" hideDot />
        )}
      </Toolbar>
      {clientFiltered && (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: -1, mb: 1.5 }}>
          {dateFrom || dateTo ? 'Сервер не фильтрует по датам, поэтому период применяется к загруженной странице. ' : ''}
          {userFilter && (resourceFilter || resourceIdFilter) ? 'Вместе с сотрудником раздел фильтруется только на загруженной странице. ' : ''}
          Листайте страницы или увеличьте число строк, чтобы найти больше.
        </Typography>
      )}

      {error && logs.length === 0 ? (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}>
          <ErrorState title="Не удалось загрузить журнал" error={error} onRetry={fetchLogs} />
        </Box>
      ) : loading && logs.length === 0 ? (
        <LoadingState variant="table" rows={8} label="Загружаем журнал" />
      ) : (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', overflow: 'hidden', position: 'relative' }}>
          {loading && (
            <LinearProgress aria-label="Обновление данных" sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, height: 2 }} />
          )}
          <TableContainer sx={{ border: 'none', borderRadius: 0 }}>
            <Table aria-label="Журнал действий" aria-busy={loading || undefined}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Box component="span" sx={visuallyHidden}>
                      Подробности
                    </Box>
                  </TableCell>
                  <TableCell>Когда</TableCell>
                  <TableCell>Сотрудник</TableCell>
                  <TableCell>Действие</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Раздел</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>ID записи</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLS} sx={{ borderBottom: 'none', p: 0 }}>
                      {hasFilters ? (
                        <EmptyState
                          size="sm"
                          title="По этим фильтрам записей нет"
                          description={clientFiltered ? 'На загруженной странице ничего не подошло. Попробуйте другую страницу или сбросьте фильтры.' : undefined}
                          action={<Button onClick={resetFilters}>Сбросить фильтры</Button>}
                        />
                      ) : (
                        <EmptyState size="sm" title="Журнал пуст" description="Здесь появятся изменения, которые сотрудники вносят в админ-панели." />
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((log) => (
                    <AuditRow
                      key={log.id}
                      log={log}
                      open={expanded.has(log.id)}
                      onToggle={() => toggle(log.id)}
                      onFilterUser={() => {
                        setUserFilter(log.userId)
                        setPage(0)
                      }}
                      onFilterRecord={() => {
                        setResourceFilter(log.resource)
                        setResourceIdFilter(log.resourceId || '')
                        setUserFilter('')
                        setPage(0)
                      }}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {total > 0 && (
            <TablePagination
              component="div"
              count={total}
              page={Math.min(page, Math.max(0, Math.ceil(total / rowsPerPage) - 1))}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10))
                setPage(0)
              }}
              rowsPerPageOptions={[25, 50, 100, 200]}
              labelRowsPerPage="Строк на странице:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
              sx={{ borderTop: 1, borderColor: 'divider', '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', gap: 1 } }}
            />
          )}
        </Box>
      )}
    </>
  )
}
