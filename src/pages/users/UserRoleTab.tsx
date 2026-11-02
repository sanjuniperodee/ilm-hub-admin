import { useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material'
import toast from 'react-hot-toast'
import { assignUserRole, type UserRole } from '../../api/adminApi'
import { useAuth } from '../../contexts/AuthContext'
import { SectionCard, getErrorMessage, useConfirm } from '../../components/ui'
import { color, radius } from '../../theme/tokens'
import { RoleChip } from './UserChips'
import { ROLE_INFO, ROLE_ORDER, isStaffRole, roleInfo } from './userLabels'

export function UserRoleTab({ user, onRoleChanged }: { user: any; onRoleChanged: (role: UserRole) => void }) {
  const { userRole } = useAuth()
  const confirm = useConfirm()
  const current: UserRole = (user.role || 'user') as UserRole
  const [selected, setSelected] = useState<UserRole>(current)
  const [roleSaving, setRoleSaving] = useState(false)
  const canEdit = userRole === 'admin'

  useEffect(() => setSelected(current), [current])

  const handleSave = async () => {
    if (selected === current) return
    const next = roleInfo(selected)
    const losesPanel = isStaffRole(current) && !isStaffRole(selected)
    const ok = await confirm({
      title: `Сделать пользователя «${next.label}»?`,
      description: (
        <>
          {user.name || user.email} сейчас: «{roleInfo(current).label}». Права доступа будут сброшены до набора по умолчанию для роли «{next.label}» — выданные вручную права пропадут.
          {losesPanel && ' Пользователь потеряет доступ к админ-панели.'}
        </>
      ),
      confirmLabel: 'Изменить роль',
      destructive: losesPanel || selected === 'admin',
    })
    if (!ok) return
    setRoleSaving(true)
    try {
      await assignUserRole(user.id, selected)
      onRoleChanged(selected)
      toast.success(`Роль изменена: ${next.label}`)
    } catch (err) {
      console.error('Role update failed:', err)
      toast.error(getErrorMessage(err, 'Не удалось изменить роль'))
      setSelected(current)
    } finally {
      setRoleSaving(false)
    }
  }

  return (
    <SectionCard
      title="Роль в системе"
      description="Роль определяет, открывается ли админ-панель и какие разделы в ней доступны."
      actions={<RoleChip role={current} size="medium" />}
      footer={
        canEdit ? (
          <Stack direction="row" justifyContent="flex-end" gap={1}>
            <Button variant="outlined" disabled={selected === current || roleSaving} onClick={() => setSelected(current)}>
              Отмена
            </Button>
            <Button
              variant="contained"
              disabled={selected === current || roleSaving}
              onClick={handleSave}
              startIcon={roleSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              Изменить роль
            </Button>
          </Stack>
        ) : undefined
      }
    >
      <Stack gap={2} sx={{ maxWidth: 720 }}>
        {!canEdit && <Alert severity="info">Менять роль может только администратор.</Alert>}
        <RadioGroup
          aria-label="Роль пользователя"
          value={selected}
          onChange={(e) => setSelected(e.target.value as UserRole)}
          sx={{ gap: 1 }}
        >
          {ROLE_ORDER.map((role) => {
            const info = ROLE_INFO[role]
            const active = selected === role
            return (
              <FormControlLabel
                key={role}
                value={role}
                disabled={!canEdit || roleSaving}
                control={<Radio sx={{ mt: -0.25 }} />}
                sx={{
                  m: 0,
                  alignItems: 'flex-start',
                  px: 1.5,
                  py: 1.25,
                  border: 1,
                  borderRadius: `${radius.md}px`,
                  borderColor: active ? 'primary.main' : 'divider',
                  bgcolor: active ? color.bronze[50] : 'transparent',
                  transition: 'border-color 120ms, background-color 120ms',
                }}
                label={
                  <Box sx={{ pt: 0.75 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {info.label}
                      {role === current && (
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          текущая
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {info.description}
                    </Typography>
                  </Box>
                }
              />
            )
          })}
        </RadioGroup>
        <Typography variant="body2" color="text.secondary">
          После смены роли сервер сбрасывает права до набора по умолчанию. Тонкую настройку прав сотрудника делайте в разделе «Сотрудники».
        </Typography>
      </Stack>
    </SectionCard>
  )
}
