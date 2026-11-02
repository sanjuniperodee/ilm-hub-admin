import { useEffect, useState } from 'react'
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import toast from 'react-hot-toast'
import { getPermissionGroups, updateAdminPermissions, updateAdminRole } from '../../api/adminApi'
import type { PermissionGroup, UserRole } from '../../types/admin-permissions'
import { ErrorState, LoadingState, getErrorMessage } from '../../components/ui'
import { dialogActionsSafeAreaSx, useNarrowDialogProps } from '../../hooks/useNarrowDialogProps'
import { roleInfo } from '../users/userLabels'
import { PermissionMatrix } from './PermissionMatrix'
import { StaffRolePicker, useLastNonNull, type AdminRow } from './adminShared'

export function EditPermissionsDialog({ admin: openFor, onClose, onSaved }: { admin: AdminRow | null; onClose: () => void; onSaved: () => void }) {
  const admin = useLastNonNull(openFor)
  const dialogProps = useNarrowDialogProps('md')
  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([])
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set())
  const [permLoading, setPermLoading] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!openFor) return
    let cancelled = false
    setPermLoading(true)
    setLoadError(null)
    setSaveError('')
    getPermissionGroups()
      .then((res) => {
        if (cancelled) return
        const groups = (res.data || []) as PermissionGroup[]
        setPermGroups(groups)
        // Selection is by permission ID (the API expects IDs); map plain names if the list contained them.
        const byName = new Map(groups.flatMap((g) => g.permissions.map((p) => [p.name as string, p.id] as const)))
        setSelectedPerms(new Set(openFor.permissions.map((p) => byName.get(p.name) ?? p.id)))
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e)
      })
      .finally(() => {
        if (!cancelled) setPermLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [openFor, nonce])

  const handleSavePerms = async () => {
    if (!admin) return
    setSaving(true)
    setSaveError('')
    try {
      await updateAdminPermissions(admin.id, Array.from(selectedPerms))
      toast.success('Права сохранены')
      onSaved()
      onClose()
    } catch (e) {
      setSaveError(getErrorMessage(e, 'Не удалось сохранить права'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(openFor)} onClose={saving ? undefined : onClose} {...dialogProps} aria-labelledby="edit-perms-title">
      <DialogTitle id="edit-perms-title">
        Права доступа
        <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block', mt: 0.25 }}>
          {admin?.name ? `${admin.name}, ` : ''}
          {admin?.email}. Роль: «{roleInfo(admin?.role).label}»
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}
        {permLoading ? (
          <LoadingState variant="list" rows={6} label="Загружаем список прав" />
        ) : loadError ? (
          <ErrorState title="Не удалось загрузить права" error={loadError} onRetry={() => setNonce((n) => n + 1)} />
        ) : (
          <PermissionMatrix groups={permGroups} selected={selectedPerms} onChange={setSelectedPerms} disabled={saving} />
        )}
      </DialogContent>
      <DialogActions sx={dialogActionsSafeAreaSx}>
        <Button variant="outlined" onClick={onClose} disabled={saving}>
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={handleSavePerms}
          disabled={saving || permLoading || Boolean(loadError)}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Сохранить права
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function ChangeRoleDialog({ admin: openFor, onClose, onSaved }: { admin: AdminRow | null; onClose: () => void; onSaved: () => void }) {
  const admin = useLastNonNull(openFor)
  const dialogProps = useNarrowDialogProps('sm')
  const [newRole, setNewRole] = useState<UserRole>('content_manager')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (openFor) {
      setNewRole(openFor.role)
      setError('')
    }
  }, [openFor])

  const handleChangeRole = async () => {
    if (!admin) return
    setSaving(true)
    setError('')
    try {
      await updateAdminRole(admin.id, newRole)
      toast.success(`Роль изменена: ${roleInfo(newRole).label}`)
      onSaved()
      onClose()
    } catch (e) {
      setError(getErrorMessage(e, 'Не удалось изменить роль'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(openFor)} onClose={saving ? undefined : onClose} {...dialogProps} aria-labelledby="change-role-title">
      <DialogTitle id="change-role-title">
        Изменить роль
        <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block', mt: 0.25 }}>
          {admin?.email}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack gap={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <StaffRolePicker value={newRole} onChange={setNewRole} disabled={saving} currentRole={admin?.role} />
          <Alert severity="warning">
            При смене роли права сотрудника сбрасываются до набора по умолчанию для новой роли. Права, выданные вручную, придётся настроить заново.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions sx={dialogActionsSafeAreaSx}>
        <Button variant="outlined" onClick={onClose} disabled={saving}>
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={handleChangeRole}
          disabled={saving || newRole === admin?.role}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Изменить роль
        </Button>
      </DialogActions>
    </Dialog>
  )
}
