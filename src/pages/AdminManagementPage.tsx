import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  IconButton,
  Pagination,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material'
import {
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material'
import { getAdmins, getAdminById, inviteAdmin, updateAdminRole, updateAdminPermissions, deactivateAdmin, getPermissionGroups, getPendingInvitations, cancelInvitation } from '../api/adminApi'
import { AdminListItem, PermissionGroup, UserRole } from '../types/admin-permissions';

function RoleChip({ role }: { role: UserRole }) {
  const colors: Record<UserRole, 'primary' | 'warning' | 'success' | 'error'> = {
    admin: 'primary',
    content_manager: 'warning',
    support: 'success',
    user: 'error',
  }
  const labels: Record<UserRole, string> = {
    admin: 'Админ',
    content_manager: 'Контент-менеджер',
    support: 'Поддержка',
    user: 'Пользователь',
  }
  return <Chip label={labels[role]} color={colors[role]} size="small" />
}

export default function AdminManagementPage() {
  const [tab, setTab] = useState(0)
  const [admins, setAdmins] = useState<AdminListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('content_manager')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  // Edit permissions dialog
  const [editPermsOpen, setEditPermsOpen] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<AdminListItem | null>(null)
  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([])
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set())
  const [permLoading, setPermLoading] = useState(false)

  // Role change dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [newRole, setNewRole] = useState<UserRole>('content_manager')

  const limit = 20

  const fetchAdmins = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAdmins({ page, limit })
      const result = res.data as { data: any[]; total: number }
      const withPerms = await Promise.all(
        (result.data || []).map(async (a) => {
          try {
            const d = (await getAdminById(a.id)).data as any
            return { ...a, permissions: d.permissions || [] }
          } catch {
            return { ...a, permissions: [] }
          }
        }),
      )
      setAdmins(withPerms)
      setTotal(result.total || 0)
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAdmins() }, [page])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviteLoading(true)
    setInviteSuccess(null)
    try {
      await inviteAdmin({ email: inviteEmail.trim(), role: inviteRole })
      setInviteSuccess('Приглашение отправлено!')
      setInviteEmail('')
      setInviteOpen(false)
      fetchAdmins()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка приглашения')
    } finally {
      setInviteLoading(false)
    }
  }

  const openEditPerms = async (admin: AdminListItem) => {
    setSelectedAdmin(admin)
    setPermLoading(true)
    setEditPermsOpen(true)
    setSelectedPerms(new Set(admin.permissions))
    try {
      const res = await getPermissionGroups()
      setPermGroups(res.data)
    } catch {
      setError('Не удалось загрузить права')
    } finally {
      setPermLoading(false)
    }
  }

  const togglePerm = (permName: string) => {
    const next = new Set(selectedPerms)
    if (next.has(permName)) next.delete(permName)
    else next.add(permName)
    setSelectedPerms(next)
  }

  const handleSavePerms = async () => {
    if (!selectedAdmin) return
    try {
      await updateAdminPermissions(selectedAdmin.id, Array.from(selectedPerms))
      setEditPermsOpen(false)
      fetchAdmins()
    } catch (e: any) {
      setError(e?.message || 'Ошибка сохранения прав')
    }
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('Деактивировать администратора?')) return
    try {
      await deactivateAdmin(id)
      fetchAdmins()
    } catch (e: any) {
      setError(e?.message || 'Ошибка деактивации')
    }
  }

  const openRoleDialog = (admin: AdminListItem) => {
    setSelectedAdmin(admin)
    setNewRole(admin.role)
    setRoleDialogOpen(true)
  }

  const handleChangeRole = async () => {
    if (!selectedAdmin) return
    try {
      await updateAdminRole(selectedAdmin.id, newRole)
      setRoleDialogOpen(false)
      fetchAdmins()
    } catch (e: any) {
      setError(e?.message || 'Ошибка изменения роли')
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Управление администраторами</Typography>
          <Typography variant="body2" color="text.secondary">
            Создание, редактирование и удаление администраторов
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setInviteOpen(true)}
        >
          Пригласить админа
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {inviteSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInviteSuccess(null)}>{inviteSuccess}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Администраторы" />
        <Tab label="Активные приглашения" />
      </Tabs>

      {tab === 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Администратор</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Роль</TableCell>
                  <TableCell>Прав доступа</TableCell>
                  <TableCell>Дата создания</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      Нет администраторов
                    </TableCell>
                  </TableRow>
                ) : admins.map((admin) => (
                  <TableRow key={admin.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}>
                          {admin.email[0].toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 500 }}>{admin.name || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">{admin.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell><RoleChip role={admin.role} /></TableCell>
                    <TableCell>
                      <Typography variant="body2">{admin.permissions?.length || 0} прав</Typography>
                    </TableCell>
                    <TableCell>{new Date(admin.createdAt).toLocaleDateString('ru-RU')}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Изменить права">
                        <IconButton size="small" onClick={() => openEditPerms(admin)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Изменить роль">
                        <IconButton size="small" onClick={() => openRoleDialog(admin)}><AdminIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Деактивировать">
                        <IconButton size="small" color="error" onClick={() => handleDeactivate(admin.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {total > limit && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={Math.ceil(total / limit)}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {tab === 1 && <PendingInvitationsTab />}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Пригласить администратора</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Роль</InputLabel>
              <Select
                value={inviteRole}
                label="Роль"
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
              >
                <MenuItem value="support">Поддержка</MenuItem>
                <MenuItem value="content_manager">Контент-менеджер</MenuItem>
                <MenuItem value="admin">Администратор</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleInvite} disabled={inviteLoading}>
            {inviteLoading ? 'Отправка...' : 'Пригласить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={editPermsOpen} onClose={() => setEditPermsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Права доступа: {selectedAdmin?.email}</DialogTitle>
        <DialogContent>
          {permLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ pt: 1 }}>
              {permGroups.map((group) => (
                <Box key={group.id} sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>{group.labelRu}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {group.permissions.map((perm) => (
                      <Chip
                        key={perm.id}
                        label={perm.labelRu}
                        onClick={() => togglePerm(perm.name)}
                        color={selectedPerms.has(perm.name) ? 'primary' : 'default'}
                        variant={selectedPerms.has(perm.name) ? 'filled' : 'outlined'}
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPermsOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSavePerms}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Изменить роль: {selectedAdmin?.email}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Роль</InputLabel>
            <Select
              value={newRole}
              label="Роль"
              onChange={(e) => setNewRole(e.target.value as UserRole)}
            >
              <MenuItem value="support">Поддержка</MenuItem>
              <MenuItem value="content_manager">Контент-менеджер</MenuItem>
              <MenuItem value="admin">Администратор</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleChangeRole}>Сохранить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// Pending invitations tab
function PendingInvitationsTab() {
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getPendingInvitations()
      .then((r) => setInvitations(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCancel = async (id: string) => {
    await cancelInvitation(id)
    setInvitations((prev) => prev.filter((i) => i.id !== id))
  }

  if (loading) return <CircularProgress />

  if (invitations.length === 0) {
    return <Typography color="text.secondary">Нет активных приглашений</Typography>
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Email</TableCell>
            <TableCell>Роль</TableCell>
            <TableCell>Отправлено</TableCell>
            <TableCell>Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invitations.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell>{inv.email}</TableCell>
              <TableCell><RoleChip role={inv.role} /></TableCell>
              <TableCell>{new Date(inv.createdAt).toLocaleDateString('ru-RU')}</TableCell>
              <TableCell>
                <Button size="small" color="error" onClick={() => handleCancel(inv.id)}>Отменить</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}