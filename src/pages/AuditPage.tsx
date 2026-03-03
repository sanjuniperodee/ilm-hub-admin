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
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  const [loading, setLoading] = useState(true)
  const [resourceFilter, setResourceFilter] = useState<string>('')
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    fetchLogs()
  }, [resourceFilter, limit])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { limit }
      if (resourceFilter) params.resource = resourceFilter
      const response = await getAuditLogs(params)
      setLogs(Array.isArray(response.data) ? response.data : [])
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
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Аудит лог
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Действия администраторов в системе
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Ресурс</InputLabel>
            <Select
              value={resourceFilter}
              label="Ресурс"
              onChange={(e) => setResourceFilter(e.target.value)}
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
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Лимит</InputLabel>
            <Select value={limit} label="Лимит" onChange={(e) => setLimit(Number(e.target.value))}>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={200}>200</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <TableContainer component={Paper}>
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
    </Box>
  )
}
