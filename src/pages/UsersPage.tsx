import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Button,
  CircularProgress,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  Stack,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Search as SearchIcon, Visibility } from '@mui/icons-material'
import { getUsers } from '../api/adminApi'
import { format } from 'date-fns'

interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  isPremium: boolean
  subscriptionStatus?: string
  role?: string
  createdAt: string
  lastActiveAt?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const navigate = useNavigate()
  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'))

  useEffect(() => {
    fetchUsers()
  }, [page, rowsPerPage])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await getUsers({ page: page + 1, limit: rowsPerPage })
      const res = response.data as { data?: User[]; total?: number }
      setUsers(res.data ?? [])
      setTotal(res.total ?? 0)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  )

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    )
  }

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'flex-start' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: { xs: '1.5rem', sm: '1.75rem', md: '1.875rem' } }}
          >
            Пользователи
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {total} зарегистрировано
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Поиск пользователей..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 280 } }}
        />
      </Stack>

      {isNarrow ? (
        <Stack spacing={1.5} sx={{ mb: 0 }}>
          {filtered.map((user) => (
            <Card
              key={user.id}
              variant="outlined"
              sx={{ borderRadius: 2, cursor: 'pointer' }}
              onClick={() => navigate(`/users/${user.id}`)}
            >
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                  <Avatar
                    src={user.avatarUrl}
                    alt={user.name}
                    sx={{
                      width: 40,
                      height: 40,
                      background: 'linear-gradient(135deg, #6366F1, #818CF8)',
                      fontSize: '0.85rem',
                      flexShrink: 0,
                    }}
                  >
                    {user.name?.[0]?.toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem' }} noWrap>
                      {user.name || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                      {user.email}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }} alignItems="center">
                      <Chip
                        label={user.isPremium ? 'Premium' : 'Free'}
                        size="small"
                        color={user.isPremium ? 'primary' : 'default'}
                        sx={
                          user.isPremium
                            ? {}
                            : {
                                background: 'rgba(100,116,139,0.08)',
                                color: '#64748B',
                              }
                        }
                      />
                      <Chip label={user.role || 'user'} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Создан: {format(new Date(user.createdAt), 'd MMM yyyy')}
                      {user.lastActiveAt ? ` · Активность: ${format(new Date(user.lastActiveAt), 'd MMM yyyy')}` : ''}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/users/${user.id}`)
                    }}
                    sx={{ flexShrink: 0, minWidth: 0, px: 1 }}
                    aria-label="Открыть"
                  >
                    <Visibility sx={{ fontSize: 20 }} />
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography color="text.secondary">Пользователи не найдены</Typography>
            </Paper>
          )}
        </Stack>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id} sx={{ cursor: 'pointer' }} onClick={() => navigate(`/users/${user.id}`)}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar
                        src={user.avatarUrl}
                        alt={user.name}
                        sx={{
                          width: 36,
                          height: 36,
                          background: 'linear-gradient(135deg, #6366F1, #818CF8)',
                          fontSize: '0.8rem',
                        }}
                      >
                        {user.name?.[0]?.toUpperCase()}
                      </Avatar>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {user.name || 'N/A'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                      {user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.isPremium ? 'Premium' : 'Free'}
                      size="small"
                      color={user.isPremium ? 'primary' : 'default'}
                      sx={{
                        ...(user.isPremium
                          ? {}
                          : {
                              background: 'rgba(100,116,139,0.08)',
                              color: '#64748B',
                            }),
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role || 'user'}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {user.lastActiveAt ? format(new Date(user.lastActiveAt), 'MMM dd, yyyy') : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<Visibility sx={{ fontSize: 16 }} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/users/${user.id}`)
                      }}
                      sx={{ fontSize: '0.8125rem' }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                    <Typography color="text.secondary">No users found</Typography>
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
