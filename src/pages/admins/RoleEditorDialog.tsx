import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material'
import toast from 'react-hot-toast'
import { createCustomRole, updateCustomRole } from '../../api/adminApi'
import type { CustomRole, PermissionGroup } from '../../types/admin-permissions'
import { FormSection, getErrorMessage } from '../../components/ui'
import { dialogActionsSafeAreaSx, useNarrowDialogProps } from '../../hooks/useNarrowDialogProps'
import { PermissionMatrix } from './PermissionMatrix'

const toSystemName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '_')

export function RoleEditorDialog({
  open,
  editRole,
  permGroups,
  onClose,
  onSaved,
}: {
  open: boolean
  /** null → create a new role. */
  editRole: CustomRole | null
  permGroups: PermissionGroup[]
  onClose: () => void
  onSaved: () => void
}) {
  const dialogProps = useNarrowDialogProps('md')
  const [formName, setFormName] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formPerms, setFormPerms] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!open) return
    setTouched(false)
    setSaveError('')
    if (editRole) {
      setFormName(editRole.name)
      setFormLabel(editRole.labelRu)
      setFormDesc(editRole.descriptionRu || '')
      setFormIsActive(editRole.isActive)
      setFormPerms(new Set(editRole.permissions?.map((p) => p.permissionId).filter(Boolean) || []))
    } else {
      setFormName('')
      setFormLabel('')
      setFormDesc('')
      setFormIsActive(true)
      setFormPerms(new Set())
    }
  }, [open, editRole])

  const labelError = touched && !formLabel.trim() ? 'Введите название роли' : ''
  const nameValue = toSystemName(formName)
  const nameError = !editRole && touched && formName && !/^[a-z0-9_]+$/.test(nameValue) ? 'Только латинские буквы, цифры и _' : ''

  const handleSave = async () => {
    setTouched(true)
    if (!formLabel.trim() || nameError) return
    setSaving(true)
    setSaveError('')
    try {
      const data = {
        labelRu: formLabel.trim(),
        descriptionRu: formDesc.trim() || undefined,
        isActive: formIsActive,
        permissionIds: Array.from(formPerms),
        ...(editRole ? {} : { name: toSystemName(formName) }),
      }
      if (editRole) {
        await updateCustomRole(editRole.id, data)
      } else {
        await createCustomRole(data as any)
      }
      toast.success(editRole ? 'Роль сохранена' : 'Роль создана')
      onSaved()
      onClose()
    } catch (e) {
      setSaveError(getErrorMessage(e, 'Не удалось сохранить роль'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} {...dialogProps} aria-labelledby="role-editor-title">
      <DialogTitle id="role-editor-title">{editRole ? `Роль «${editRole.labelRu}»` : 'Новая роль'}</DialogTitle>
      <DialogContent dividers>
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}
        <FormSection title="Основное" description="Как роль называется в списках." divider={false}>
          <Stack gap={2}>
            <TextField
              label="Название"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              onBlur={() => setTouched(true)}
              error={Boolean(labelError)}
              helperText={labelError || 'Например: «Редактор словаря»'}
              required
              fullWidth
              autoFocus={!editRole}
            />
            {editRole ? (
              <TextField label="Системное имя" value={formName} fullWidth disabled helperText="Системное имя нельзя изменить после создания" />
            ) : (
              <TextField
                label="Системное имя"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                error={Boolean(nameError)}
                helperText={nameError || (formName ? `Сохранится как ${nameValue}` : 'Латинские буквы и _, например content_editor')}
                fullWidth
              />
            )}
            <TextField label="Описание" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} multiline minRows={2} fullWidth />
            {editRole && (
              <FormControlLabel
                control={<Switch checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />}
                label={formIsActive ? 'Роль активна' : 'Роль выключена'}
              />
            )}
          </Stack>
        </FormSection>
        <FormSection title="Права доступа" description="Отметьте, что может делать сотрудник с этой ролью.">
          <PermissionMatrix groups={permGroups} selected={formPerms} onChange={setFormPerms} disabled={saving} />
        </FormSection>
      </DialogContent>
      <DialogActions sx={dialogActionsSafeAreaSx}>
        <Button variant="outlined" onClick={onClose} disabled={saving}>
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {editRole ? 'Сохранить роль' : 'Создать роль'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
