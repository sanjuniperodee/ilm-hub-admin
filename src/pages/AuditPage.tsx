import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { getAuditLogs } from '../api/adminApi'
import { format } from 'date-fns'

interface AuditLog {
  id: string
  userId: string
  userEmail?: string
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  createdAt: string
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [resourceFilter, setResourceFilter] = useState<string>('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'))

  useEffect(() => {
    fetchLogs()
  }, [resourceFilter, page, rowsPerPage])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        page: page + 1,
        limit: rowsPerPage,
      }
      if (resourceFilter) params.resource = resourceFilter
      const response = await getAuditLogs(params)
      const res = response.data as { data?: AuditLog[]; total?: number }
      setLogs(res.data ?? [])
      setTotal(res.total ?? 0)
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    )
  }

  return (
    <Box className="animate-fade-in">
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: { xs: '1.5rem', sm: '1.75rem', md: '1.875rem' } }}
          >
            Аудит лог
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Действия администраторов в системе
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 }, width: { xs: '100%', sm: 'auto' } }}>
            <InputLabel>Ресурс</InputLabel>
            <Select
              value={resourceFilter}
              label="Ресурс"
              onChange={(e) => {
                setResourceFilter(e.target.value)
                setPage(0)
              }}
            >
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="courses">Курсы</MenuItem>
              <MenuItem value="lessons">Уроки</MenuItem>
              <MenuItem value="modules">Модули</MenuItem>
              <MenuItem value="users">Пользователи</MenuItem>
              <MenuItem value="words">Слова</MenuItem>
              <MenuItem value="islam">Ислам</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {isNarrow ? (
        <Stack spacing={1.5}>
          {logs.map((log) => (
            <Card key={log.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, wordBreak: 'break-word' }}>
                  {log.userEmail || log.userId}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {log.action}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {log.resource}
                </Typography>
                <Typography
                  variant="caption"
                  component="div"
                  color="text.secondary"
                  sx={{ fontFamily: 'monospace', wordBreak: 'break-all', mt: 0.5 }}
                >
                  {log.resourceId || '—'}
                </Typography>
              </CardContent>
            </Card>
          ))}
          {logs.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography color="text.secondary">Нет записей</Typography>
            </Paper>
          )}
        </Stack>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Дата</TableCell>
                <TableCell>Пользователь</TableCell>
                <TableCell>Действие</TableCell>
                <TableCell>Ресурс</TableCell>
                <TableCell>ID</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{log.userEmail || log.userId}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{log.action}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{log.resource}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {log.resourceId || '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6 }}>
                    <Typography color="text.secondary">Нет записей</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10))
          setPage(0)
        }}
        rowsPerPageOptions={[25, 50, 100, 200]}
        labelRowsPerPage="Строк на странице:"
        sx={{
          flexWrap: 'wrap',
          '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', gap: 1 },
        }}
      />
    </Box>
  )
}
