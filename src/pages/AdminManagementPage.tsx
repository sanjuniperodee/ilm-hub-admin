import { useCallback, useEffect, useState } from 'react'
import { Box, Button, IconButton, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material'
import {
  AdminPanelSettingsOutlined,
  KeyOutlined,
  PersonAddOutlined,
  PersonOffOutlined,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { deactivateAdmin, getAdminById, getAdmins, getPendingInvitations } from '../api/adminApi'
import { DataTable, EmptyState, PageHeader, getErrorMessage, useConfirm, visuallyHidden, type DataTableColumn } from '../components/ui'
import { RoleChip, UserAvatar } from './users/UserChips'
import { formatDate, formatRelative } from './users/userLabels'
import { normalizePermissions, type AdminRow } from './admins/adminShared'
import { plural } from './push/pushLabels'
import { InviteAdminDialog } from './admins/InviteAdminDialog'
import { ChangeRoleDialog, EditPermissionsDialog } from './admins/AdminDialogs'
import { PendingInvitations, type Invitation } from './admins/PendingInvitations'

const limit = 20

export default function AdminManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'invitations' ? 'invitations' : 'staff'
  const setTab = (value: 'staff' | 'invitations') => {
    const next = new URLSearchParams(searchParams)
    if (value === 'staff') next.delete('tab')
    else next.set('tab', value)
    setSearchParams(next, { replace: true })
  }

  const confirm = useConfirm()
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [invLoading, setInvLoading] = useState(false)
  const [invError, setInvError] = useState<unknown>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [permsAdmin, setPermsAdmin] = useState<AdminRow | null>(null)
  const [roleAdmin, setRoleAdmin] = useState<AdminRow | null>(null)

  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAdmins({ page, limit })
      const result = res.data as { data: any[]; total: number }
      const withPerms = await Promise.all(
        (result.data || []).map(async (a) => {
          try {
            const d = (await getAdminById(a.id)).data as any
            return { ...a, permissions: normalizePermissions(d.permissions) } as AdminRow
          } catch {
            return { ...a, permissions: [] } as AdminRow
          }
        }),
      )
      setAdmins(withPerms)
      setTotal(result.total || 0)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [page])

  const fetchInvitations = useCallback(async () => {
    setInvLoading(true)
    setInvError(null)
    try {
      const r = await getPendingInvitations()
      setInvitations(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setInvError(e)
    } finally {
      setInvLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  const handleDeactivate = async (admin: AdminRow) => {
    const ok = await confirm({
      title: `Отключить доступ для ${admin.name || admin.email}?`,
      description:
        'Сотрудник станет обычным пользователем приложения: роль сменится на «Ученик», все права в админ-панели будут удалены. Вернуть доступ можно новым приглашением или сменой роли в карточке пользователя.',
      confirmLabel: 'Отключить доступ',
      destructive: true,
    })
    if (!ok) return
    try {
      await deactivateAdmin(admin.id)
      toast.success('Доступ отключён')
      fetchAdmins()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось отключить доступ'))
    }
  }

  const columns: DataTableColumn<AdminRow>[] = [
    {
      id: 'name',
      header: 'Сотрудник',
      minWidth: 240,
      render: (a) => (
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
          <UserAvatar name={a.name} email={a.email} src={a.avatarUrl} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
              {a.name || 'Без имени'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
              {a.email}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    { id: 'role', header: 'Роль', render: (a) => <RoleChip role={a.role} /> },
    {
      id: 'permissions',
      header: 'Права',
      render: (a) => (
        <Tooltip
          title={a.permissions.length ? a.permissions.map((p) => p.labelRu || p.name).join(', ') : 'Прав нет'}
          placement="top-start"
        >
          <Button
            size="small"
            startIcon={<KeyOutlined fontSize="small" />}
            onClick={(e) => {
              e.stopPropagation()
              setPermsAdmin(a)
            }}
            sx={{ color: a.permissions.length ? 'text.primary' : 'warning.main', fontWeight: 500 }}
          >
            {a.permissions.length ? plural(a.permissions.length, ['право', 'права', 'прав']) : 'Нет прав'}
          </Button>
        </Tooltip>
      ),
    },
    {
      id: 'lastActiveAt',
      header: 'Активность',
      nowrap: true,
      hideBelow: 'md',
      render: (a) =>
        a.lastActiveAt ? (
          <Typography variant="body2">{formatRelative(a.lastActiveAt)}</Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Нет данных
          </Typography>
        ),
    },
    { id: 'createdAt', header: 'Аккаунт создан', nowrap: true, hideBelow: 'lg', render: (a) => formatDate(a.createdAt) },
    {
      id: 'actions',
      header: <Box component="span" sx={visuallyHidden}>Действия</Box>,
      align: 'right',
      nowrap: true,
      render: (a) => (
        <Stack direction="row" gap={0.25} justifyContent="flex-end">
          <Tooltip title="Изменить права">
            <IconButton aria-label={`Изменить права: ${a.email}`} onClick={() => setPermsAdmin(a)}>
              <KeyOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Изменить роль">
            <IconButton aria-label={`Изменить роль: ${a.email}`} onClick={() => setRoleAdmin(a)}>
              <AdminPanelSettingsOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Отключить доступ">
            <IconButton aria-label={`Отключить доступ: ${a.email}`} onClick={() => handleDeactivate(a)} sx={{ color: 'error.main' }}>
              <PersonOffOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Сотрудники"
        subtitle="Сотрудники с доступом к админ-панели: роли, точные права и приглашения."
        actions={
          <Button variant="contained" startIcon={<PersonAddOutlined />} onClick={() => setInviteOpen(true)}>
            Пригласить сотрудника
          </Button>
        }
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="Разделы" sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="staff" label={`Сотрудники${total ? ` (${total})` : ''}`} />
          <Tab value="invitations" label={`Приглашения${invitations.length ? ` (${invitations.length})` : ''}`} />
        </Tabs>
      </PageHeader>

      {tab === 'staff' ? (
        <DataTable
          aria-label="Сотрудники админ-панели"
          columns={columns}
          rows={admins}
          getRowId={(a) => a.id}
          loading={loading}
          error={error}
          onRetry={fetchAdmins}
          pagination={{ page: page - 1, rowsPerPage: limit, total, onPageChange: (p) => setPage(p + 1) }}
          rowsPerPageOptions={[limit]}
          emptyState={
            <EmptyState
              size="sm"
              title="Сотрудников пока нет"
              description="Пригласите первого: он получит письмо и задаст пароль сам."
              action={<Button variant="contained" onClick={() => setInviteOpen(true)}>Пригласить сотрудника</Button>}
            />
          }
        />
      ) : (
        <PendingInvitations
          invitations={invitations}
          loading={invLoading}
          error={invError}
          onRetry={fetchInvitations}
          onCancelled={(id) => setInvitations((prev) => prev.filter((i) => i.id !== id))}
          onInvite={() => setInviteOpen(true)}
        />
      )}

      <InviteAdminDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => {
          fetchAdmins()
          fetchInvitations()
        }}
      />
      <EditPermissionsDialog admin={permsAdmin} onClose={() => setPermsAdmin(null)} onSaved={fetchAdmins} />
      <ChangeRoleDialog admin={roleAdmin} onClose={() => setRoleAdmin(null)} onSaved={fetchAdmins} />
    </>
  )
}
