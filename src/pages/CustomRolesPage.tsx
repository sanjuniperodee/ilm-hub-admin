import { useState, useEffect } from 'react'
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, Grid, Switch, FormControlLabel, Paper,
  IconButton, Tooltip, Alert, CircularProgress, Divider,
} from '@mui/material'
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
} from '@mui/icons-material'
import {
  getCustomRoles, createCustomRole, updateCustomRole, deleteCustomRole,
  getPermissionGroups,
} from '../api/adminApi'
import { CustomRole, PermissionGroup } from '../types/admin-permissions'

function RoleCard({ role, onEdit, onDelete }: { role: CustomRole; onEdit: () => void; onDelete: () => void }) {
  const permNames = role.permissions?.map((p) => p.permission?.labelRu).filter(Boolean) || []
  return (
    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{role.labelRu}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {role.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Редактировать">
            <IconButton size="small" onClick={onEdit}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Удалить">
            <IconButton size="small" color="error" onClick={onDelete}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      </Box>
      {role.descriptionRu && (
        <Typography variant="body2" color="text.secondary">{role.descriptionRu}</Typography>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
        {permNames.length === 0 ? (
          <Typography variant="caption" color="text.disabled">Нет прав</Typography>
        ) : permNames.map((name) => (
          <Chip key={name} label={name} size="small" variant="outlined" />
        ))}
      </Box>
      {!role.isActive && <Chip label="Неактивна" size="small" color="error" sx={{ alignSelf: 'flex-start' }} />}
    </Paper>
  )
}

export default function CustomRolesPage() {
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRole, setEditRole] = useState<CustomRole | null>(null)
  const [formName, setFormName] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formPerms, setFormPerms] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [rolesRes, permsRes] = await Promise.all([
        getCustomRoles({ includeInactive: true }),
        getPermissionGroups(),
      ])
      setRoles(rolesRes.data as CustomRole[])
      setPermGroups(permsRes.data as PermissionGroup[])
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const openCreate = () => {
    setEditRole(null)
    setFormName('')
    setFormLabel('')
    setFormDesc('')
    setFormIsActive(true)
    setFormPerms(new Set())
    setDialogOpen(true)
  }

  const openEdit = (role: CustomRole) => {
    setEditRole(role)
    setFormName(role.name)
    setFormLabel(role.labelRu)
    setFormDesc(role.descriptionRu || '')
    setFormIsActive(role.isActive)
    setFormPerms(new Set(role.permissions?.map((p) => p.permissionId).filter(Boolean) || []))
    setDialogOpen(true)
  }

  const togglePerm = (permId: string) => {
    const next = new Set(formPerms)
    if (next.has(permId)) next.delete(permId)
    else next.add(permId)
    setFormPerms(next)
  }

  const handleSave = async () => {
    if (!formLabel.trim()) return
    setSaving(true)
    try {
      const data = {
        labelRu: formLabel.trim(),
        descriptionRu: formDesc.trim() || undefined,
        isActive: formIsActive,
        permissionIds: Array.from(formPerms),
        ...(editRole ? {} : { name: formName.trim().toLowerCase().replace(/\s+/g, '_') }),
      }
      if (editRole) {
        await updateCustomRole(editRole.id, data)
      } else {
        await createCustomRole(data as any)
      }
      setDialogOpen(false)
      fetchData()
    } catch (e: any) {
      setError(e?.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteCustomRole(deleteId)
      setDeleteId(null)
      fetchData()
    } catch (e: any) {
      setError(e?.message || 'Ошибка удаления')
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Роли и права</Typography>
          <Typography variant="body2" color="text.secondary">
            Создание кастомных ролей с набором прав доступа
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Создать роль
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2}>
          {roles.map((role) => (
            <Grid item xs={12} sm={6} md={4} key={role.id}>
              <RoleCard
                role={role}
                onEdit={() => openEdit(role)}
                onDelete={() => setDeleteId(role.id)}
              />
            </Grid>
          ))}
          {roles.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                Ролей пока нет. Создайте первую роль.
              </Typography>
            </Grid>
          )}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editRole ? 'Редактировать роль' : 'Создать роль'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {!editRole && (
              <TextField
                label="Системное имя"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                helperText="Латинские буквы и _, например: content_editor"
                fullWidth
              />
            )}
            <TextField
              label="Название"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              fullWidth
            />
            <TextField
              label="Описание"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
            {editRole && (
              <FormControlLabel
                control={<Switch checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />}
                label="Активна"
              />
            )}
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Права доступа</Typography>
            {permGroups.map((group) => (
              <Box key={group.id}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  {group.labelRu}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {group.permissions.map((perm) => (
                    <Chip
                      key={perm.id}
                      label={perm.labelRu}
                      onClick={() => togglePerm(perm.id)}
                      color={formPerms.has(perm.id) ? 'primary' : 'default'}
                      variant={formPerms.has(perm.id) ? 'filled' : 'outlined'}
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !formLabel.trim()}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Удалить роль?</DialogTitle>
        <DialogContent>
          <Typography>Это действие нельзя отменить. Роль будет удалена у всех пользователей.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Отмена</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Удалить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}