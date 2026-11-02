import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { Add as AddIcon, Check, DeleteOutline, EditOutlined, GridOnOutlined, ViewListOutlined } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { deleteCustomRole, getCustomRoles, getPermissionGroups } from '../api/adminApi'
import type { CustomRole, PermissionGroup } from '../types/admin-permissions'
import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusChip,
  Toolbar,
  getErrorMessage,
  useConfirm,
  visuallyHidden,
  type DataTableColumn,
} from '../components/ui'
import { RoleEditorDialog } from './admins/RoleEditorDialog'

type View = 'list' | 'matrix'

function RolesMatrix({ roles, groups }: { roles: CustomRole[]; groups: PermissionGroup[] }) {
  const sets = useMemo(
    () => new Map(roles.map((r) => [r.id, new Set(r.permissions?.map((p) => p.permissionId).filter(Boolean) || [])])),
    [roles],
  )
  const sorted = [...groups].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 260px)', border: 'none', borderRadius: 0 }}>
        <Table size="small" stickyHeader aria-label="Матрица прав по ролям">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 240, position: 'sticky', left: 0, zIndex: 3 }}>Право</TableCell>
              {roles.map((r) => (
                <TableCell key={r.id} align="center" sx={{ minWidth: 120 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: r.isActive ? 'text.primary' : 'text.secondary' }}>
                    {r.labelRu}
                  </Typography>
                  {!r.isActive && (
                    <Typography variant="caption" color="text.secondary">
                      выключена
                    </Typography>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((group) => [
              <TableRow key={`g-${group.id}`}>
                <TableCell
                  colSpan={roles.length + 1}
                  sx={{ bgcolor: 'surface.sunken', fontWeight: 600, color: 'text.secondary', py: 0.75 }}
                >
                  {group.labelRu}
                </TableCell>
              </TableRow>,
              ...group.permissions.map((perm) => (
                <TableRow key={perm.id} hover>
                  <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                    <Typography variant="body2">{perm.labelRu}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {perm.name}
                    </Typography>
                  </TableCell>
                  {roles.map((r) => {
                    const has = sets.get(r.id)?.has(perm.id)
                    return (
                      <TableCell key={r.id} align="center">
                        {has ? (
                          <Check fontSize="small" sx={{ color: 'success.main', verticalAlign: 'middle' }} aria-label="есть" />
                        ) : (
                          <Typography component="span" variant="body2" color="text.disabled" aria-label="нет">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )),
            ])}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default function CustomRolesPage() {
  const confirm = useConfirm()
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [view, setView] = useState<View>('list')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRole, setEditRole] = useState<CustomRole | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rolesRes, permsRes] = await Promise.all([getCustomRoles({ includeInactive: true }), getPermissionGroups()])
      setRoles(rolesRes.data as CustomRole[])
      setPermGroups(permsRes.data as PermissionGroup[])
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const permissionTotal = permGroups.reduce((n, g) => n + g.permissions.length, 0)

  const openCreate = () => {
    setEditRole(null)
    setDialogOpen(true)
  }
  const openEdit = (role: CustomRole) => {
    setEditRole(role)
    setDialogOpen(true)
  }

  const handleDelete = async (role: CustomRole) => {
    const ok = await confirm({
      title: `Удалить роль «${role.labelRu}»?`,
      description: 'Роль будет снята со всех сотрудников, у кого она есть. Это действие нельзя отменить.',
      confirmLabel: 'Удалить роль',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteCustomRole(role.id)
      toast.success('Роль удалена')
      fetchData()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось удалить роль'))
    }
  }

  const columns: DataTableColumn<CustomRole>[] = [
    {
      id: 'labelRu',
      header: 'Роль',
      minWidth: 220,
      sortable: true,
      render: (r) => (
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {r.labelRu}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {r.name}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'descriptionRu',
      header: 'Описание',
      hideBelow: 'md',
      render: (r) => (
        <Typography variant="body2" color={r.descriptionRu ? 'text.primary' : 'text.secondary'} sx={{ maxWidth: 420 }}>
          {r.descriptionRu || 'Без описания'}
        </Typography>
      ),
    },
    {
      id: 'permissions',
      header: 'Права',
      sortable: true,
      sortValue: (r) => r.permissions?.length ?? 0,
      render: (r) => {
        const names = r.permissions?.map((p) => p.permission?.labelRu).filter(Boolean) as string[]
        const count = r.permissions?.length ?? 0
        return (
          <Tooltip title={names.length ? names.join(', ') : 'Прав нет'} placement="top-start">
            <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', color: count ? 'text.primary' : 'warning.main' }}>
              {count ? `${count} из ${permissionTotal || count}` : 'Нет прав'}
            </Typography>
          </Tooltip>
        )
      },
    },
    { id: 'isActive', header: 'Статус', render: (r) => <StatusChip status={r.isActive ? 'active' : 'inactive'} label={r.isActive ? 'Активна' : 'Выключена'} /> },
    {
      id: 'actions',
      header: <Box component="span" sx={visuallyHidden}>Действия</Box>,
      align: 'right',
      nowrap: true,
      render: (r) => (
        <Stack direction="row" gap={0.25} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Редактировать">
            <IconButton aria-label={`Редактировать роль ${r.labelRu}`} onClick={() => openEdit(r)}>
              <EditOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Удалить">
            <IconButton aria-label={`Удалить роль ${r.labelRu}`} onClick={() => handleDelete(r)} sx={{ color: 'error.main' }}>
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Роли и права"
        subtitle="Свои наборы прав для сотрудников, когда стандартных ролей мало."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Создать роль
          </Button>
        }
      />

      <Toolbar
        summary={roles.length ? `Ролей: ${roles.length}` : undefined}
        actions={
          <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, v: View | null) => v && setView(v)} aria-label="Вид">
            <ToggleButton value="list" sx={{ gap: 0.75, px: 1.5 }}>
              <ViewListOutlined fontSize="small" /> Список
            </ToggleButton>
            <ToggleButton value="matrix" sx={{ gap: 0.75, px: 1.5 }} disabled={roles.length === 0}>
              <GridOnOutlined fontSize="small" /> Матрица прав
            </ToggleButton>
          </ToggleButtonGroup>
        }
      />

      {view === 'matrix' && roles.length > 0 ? (
        loading && permGroups.length === 0 ? (
          <LoadingState variant="table" />
        ) : error ? (
          <ErrorState error={error} onRetry={fetchData} />
        ) : (
          <RolesMatrix roles={roles} groups={permGroups} />
        )
      ) : (
        <DataTable
          aria-label="Роли"
          columns={columns}
          rows={roles}
          getRowId={(r) => r.id}
          loading={loading}
          error={error}
          onRetry={fetchData}
          onRowClick={openEdit}
          emptyState={
            <EmptyState
              size="sm"
              title="Своих ролей пока нет"
              description="Создайте роль, если сотруднику нужен особый набор прав, например только словарь."
              action={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Создать роль</Button>}
            />
          }
        />
      )}

      <RoleEditorDialog open={dialogOpen} editRole={editRole} permGroups={permGroups} onClose={() => setDialogOpen(false)} onSaved={fetchData} />
    </>
  )
}
