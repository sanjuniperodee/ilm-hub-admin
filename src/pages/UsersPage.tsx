import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { getUsers } from '../api/adminApi'
import { DataTable, EmptyState, PageHeader, SearchField, Toolbar, type DataTableColumn } from '../components/ui'
import { AccessCell, RoleCell, UserAvatar } from './users/UserChips'
import { formatDate, formatRelative } from './users/userLabels'

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

type AccessFilter = 'all' | 'premium' | 'free' | 'staff'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [search, setSearch] = useState('')
  const [access, setAccess] = useState<AccessFilter>('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const navigate = useNavigate()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await getUsers({ page: page + 1, limit: rowsPerPage })
      const res = response.data as { data?: User[]; total?: number }
      setUsers(res.data ?? [])
      setTotal(res.total ?? 0)
    } catch (e) {
      console.error('Error fetching users:', e)
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // GET /admin/users has no search/filter params — filters apply to the loaded page only.
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter((u) => {
      if (q && !(u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))) return false
      if (access === 'premium' && !u.isPremium) return false
      if (access === 'free' && u.isPremium) return false
      if (access === 'staff' && !(u.role && u.role !== 'user')) return false
      return true
    })
  }, [users, search, access])

  const hasFilters = Boolean(search) || access !== 'all'
  const resetFilters = () => {
    setSearch('')
    setAccess('all')
  }

  const columns: DataTableColumn<User>[] = [
    {
      id: 'name',
      header: 'Пользователь',
      minWidth: 240,
      render: (u) => (
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
          <UserAvatar name={u.name} email={u.email} src={u.avatarUrl} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
              {u.name || 'Без имени'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
              {u.email}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    { id: 'access', header: 'Доступ', render: (u) => <AccessCell isPremium={u.isPremium} subscriptionStatus={u.subscriptionStatus} /> },
    { id: 'role', header: 'Роль', hideBelow: 'sm', render: (u) => <RoleCell role={u.role} /> },
    {
      id: 'createdAt',
      header: 'Регистрация',
      nowrap: true,
      hideBelow: 'md',
      render: (u) => <Typography variant="body2">{formatDate(u.createdAt)}</Typography>,
    },
    {
      id: 'lastActiveAt',
      header: 'Последняя активность',
      nowrap: true,
      hideBelow: 'md',
      render: (u) =>
        u.lastActiveAt ? (
          <Box>
            <Typography variant="body2">{formatRelative(u.lastActiveAt)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(u.lastActiveAt)}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Нет данных
          </Typography>
        ),
    },
  ]

  const summary = loading && users.length === 0
    ? undefined
    : hasFilters
      ? `На этой странице: ${filtered.length} из ${users.length}`
      : `Всего ${total.toLocaleString('ru-RU')}`

  return (
    <>
      <PageHeader
        title="Пользователи"
        subtitle="Ученики приложения и сотрудники. Откройте пользователя, чтобы увидеть подписку, прогресс и роль."
      />

      <Toolbar hasActiveFilters={hasFilters} onReset={resetFilters} summary={summary}>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Имя или email на этой странице"
          enableSlashShortcut
          sx={{ width: { xs: '100%', sm: 320 } }}
        />
        <TextField
          select
          size="small"
          label="Показать"
          value={access}
          onChange={(e) => setAccess(e.target.value as AccessFilter)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">Всех</MenuItem>
          <MenuItem value="premium">Только Premium</MenuItem>
          <MenuItem value="free">Только бесплатный доступ</MenuItem>
          <MenuItem value="staff">Только сотрудников</MenuItem>
        </TextField>
      </Toolbar>
      {hasFilters && (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: -1, mb: 1.5 }}>
          Сервер пока не умеет искать по всей базе, поэтому поиск и фильтр работают только по загруженной странице. Чтобы искать шире, увеличьте число строк на странице.
        </Typography>
      )}

      <DataTable
        aria-label="Список пользователей"
        columns={columns}
        rows={filtered}
        getRowId={(u) => u.id}
        loading={loading}
        error={error}
        onRetry={fetchUsers}
        onRowClick={(u) => navigate(`/users/${u.id}`)}
        pagination={{
          page,
          rowsPerPage,
          total,
          onPageChange: setPage,
          onRowsPerPageChange: (n) => {
            setRowsPerPage(n)
            setPage(0)
          },
        }}
        rowsPerPageOptions={[25, 50, 100, 200]}
        emptyState={
          hasFilters ? (
            <EmptyState
              size="sm"
              title="На этой странице никого не нашли"
              description="Измените запрос или перейдите на другую страницу списка."
              action={<Button onClick={resetFilters}>Сбросить фильтры</Button>}
            />
          ) : (
            <EmptyState size="sm" title="Пользователей пока нет" description="Они появятся здесь после регистрации в приложении." />
          )
        }
      />
    </>
  )
}
