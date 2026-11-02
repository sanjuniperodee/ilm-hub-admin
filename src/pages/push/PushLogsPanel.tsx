import { useCallback, useEffect, useState } from 'react'
import { Box, Button, IconButton, MenuItem, TextField, Tooltip, Typography } from '@mui/material'
import { Refresh } from '@mui/icons-material'
import { getPushLogs, type PushNotificationLog } from '../../api/adminApi'
import { DataTable, EmptyState, SearchField, StatusChip, Toolbar, getErrorMessage, type DataTableColumn } from '../../components/ui'
import { deliveryStatus, formatPushDate, logSegmentLabel, logSegmentOptions, pushTypeLabels } from './pushLabels'

/** Push log state lives in the page so filters survive tab switches and a send can refresh it. */
export function usePushLogs() {
  const [logs, setLogs] = useState<PushNotificationLog[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState('')
  const [logPage, setLogPage] = useState(0)
  const [logRowsPerPage, setLogRowsPerPage] = useState(25)
  const [logSegment, setLogSegment] = useState('')
  const [logStatus, setLogStatus] = useState('')
  const [logType, setLogType] = useState('')
  const [logSearch, setLogSearch] = useState('')

  const loadPushLogs = useCallback(async () => {
    setLogsLoading(true)
    setLogsError('')
    try {
      const response = await getPushLogs({
        page: logPage + 1,
        limit: logRowsPerPage,
        segment: logSegment || undefined,
        type: logType || undefined,
        deliveryStatus: logStatus || undefined,
        search: logSearch || undefined,
      })
      setLogs(response.data.data ?? [])
      setLogsTotal(response.data.total ?? 0)
    } catch (e) {
      setLogs([])
      setLogsTotal(0)
      setLogsError(getErrorMessage(e, 'Не удалось загрузить историю push'))
    } finally {
      setLogsLoading(false)
    }
  }, [logPage, logRowsPerPage, logSegment, logStatus, logType, logSearch])

  useEffect(() => {
    loadPushLogs()
  }, [loadPushLogs])

  return {
    logs,
    logsTotal,
    logsLoading,
    logsError,
    loadPushLogs,
    logPage,
    setLogPage,
    logRowsPerPage,
    setLogRowsPerPage,
    filters: { logSegment, logStatus, logType, logSearch },
    setFilter: (key: 'logSegment' | 'logStatus' | 'logType' | 'logSearch', value: string) => {
      if (key === 'logSegment') setLogSegment(value)
      if (key === 'logStatus') setLogStatus(value)
      if (key === 'logType') setLogType(value)
      if (key === 'logSearch') setLogSearch(value)
      setLogPage(0)
    },
    resetFilters: () => {
      setLogSegment('')
      setLogStatus('')
      setLogType('')
      setLogSearch('')
      setLogPage(0)
    },
  }
}

export type PushLogsState = ReturnType<typeof usePushLogs>

export function PushLogsPanel({ state }: { state: PushLogsState }) {
  const { logs, logsTotal, logsLoading, logsError, loadPushLogs, logPage, setLogPage, logRowsPerPage, setLogRowsPerPage, filters, setFilter, resetFilters } = state
  const hasFilters = Boolean(filters.logSearch || filters.logSegment || filters.logStatus || filters.logType)

  const columns: DataTableColumn<PushNotificationLog>[] = [
    {
      id: 'sentAt',
      header: 'Отправлено',
      nowrap: true,
      render: (log) => <Typography variant="body2">{formatPushDate(log.sentAt)}</Typography>,
    },
    {
      id: 'deliveryStatus',
      header: 'Статус',
      nowrap: true,
      render: (log) => {
        const s = deliveryStatus[log.deliveryStatus] ?? { label: log.deliveryStatus, tone: 'neutral' as const }
        return <StatusChip label={s.label} tone={s.tone} />
      },
    },
    {
      id: 'user',
      header: 'Получатель',
      minWidth: 180,
      render: (log) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
            {log.user?.email || log.user?.name || 'Без email'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}>
            {log.userId}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'type',
      header: 'Тип',
      minWidth: 150,
      hideBelow: 'md',
      render: (log) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {pushTypeLabels[log.type] || log.type}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {logSegmentLabel(log.segment)}
            {log.route ? `, ${log.route}` : ''}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'message',
      header: 'Сообщение',
      minWidth: 220,
      render: (log) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
            {log.title || 'Без заголовка'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            {log.body || '—'}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'openedAt',
      header: 'Открыт',
      nowrap: true,
      hideBelow: 'lg',
      render: (log) => (
        <Typography variant="body2" color={log.openedAt ? 'text.primary' : 'text.secondary'}>
          {log.openedAt ? formatPushDate(log.openedAt) : 'Нет'}
        </Typography>
      ),
    },
  ]

  return (
    <>
      <Toolbar
        hasActiveFilters={hasFilters}
        onReset={resetFilters}
        summary={!logsLoading || logs.length ? `Записей: ${logsTotal.toLocaleString('ru-RU')}` : undefined}
        actions={
          <Tooltip title="Обновить журнал">
            <span>
              <IconButton aria-label="Обновить журнал" onClick={loadPushLogs} disabled={logsLoading}>
                <Refresh />
              </IconButton>
            </span>
          </Tooltip>
        }
      >
        <SearchField
          value={filters.logSearch}
          onChange={(v) => setFilter('logSearch', v)}
          placeholder="Email, имя, текст или ID пользователя"
          sx={{ width: { xs: '100%', md: 300 } }}
        />
        <TextField select size="small" label="Сегмент" SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} value={filters.logSegment} onChange={(e) => setFilter('logSegment', e.target.value)} sx={{ minWidth: 170 }}>
          {logSegmentOptions.map((o) => (
            <MenuItem key={o.value || 'any'} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="Тип" SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} value={filters.logType} onChange={(e) => setFilter('logType', e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">Все типы</MenuItem>
          {Object.entries(pushTypeLabels).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="Статус" SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} value={filters.logStatus} onChange={(e) => setFilter('logStatus', e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">Все статусы</MenuItem>
          <MenuItem value="sent">Отправлено</MenuItem>
          <MenuItem value="failed">Ошибка</MenuItem>
          <MenuItem value="disabled">Firebase выключен</MenuItem>
        </TextField>
      </Toolbar>

      <DataTable
        aria-label="Журнал push-уведомлений"
        columns={columns}
        rows={logs}
        getRowId={(log) => log.id}
        loading={logsLoading}
        error={logsError || null}
        onRetry={loadPushLogs}
        dense
        pagination={{
          page: logPage,
          rowsPerPage: logRowsPerPage,
          total: logsTotal,
          onPageChange: setLogPage,
          onRowsPerPageChange: (n) => {
            setLogRowsPerPage(n)
            setLogPage(0)
          },
        }}
        rowsPerPageOptions={[25, 50, 100, 200]}
        emptyState={
          hasFilters ? (
            <EmptyState
              size="sm"
              title="По этим фильтрам записей нет"
              action={<Button onClick={resetFilters}>Сбросить фильтры</Button>}
            />
          ) : (
            <EmptyState size="sm" title="Журнал пуст" description="Здесь появятся ручные и автоматические push после первой отправки." />
          )
        }
      />
    </>
  )
}
