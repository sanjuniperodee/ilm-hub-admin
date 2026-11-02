import { useRef } from 'react'
import { Box, FormControlLabel, Radio, RadioGroup, Typography } from '@mui/material'
import toast from 'react-hot-toast'
import type { UserRole } from '../../types/admin-permissions'
import { color, radius } from '../../theme/tokens'
import { ROLE_INFO } from '../users/userLabels'

export const STAFF_ROLE_OPTIONS: Exclude<UserRole, 'user'>[] = ['support', 'content_manager', 'admin']

export interface AdminPermissionRef {
  id: string
  name: string
  labelRu?: string
}

export interface AdminRow {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  role: UserRole
  createdAt: string
  lastActiveAt?: string
  emailVerified?: boolean
  permissions: AdminPermissionRef[]
}

/** GET /admin/admins/:id returns `{ id, name, labelRu }[]`; tolerate plain names too. */
export function normalizePermissions(raw: unknown): AdminPermissionRef[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((p) => (typeof p === 'string' ? { id: p, name: p, labelRu: p } : (p as AdminPermissionRef)))
    .filter((p) => p && p.id)
}

export async function copyToClipboard(text: string, success = 'Ссылка скопирована') {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(success)
  } catch {
    toast.error('Не удалось скопировать. Выделите ссылку и скопируйте вручную.')
  }
}

/** Radio cards for staff roles with a one-line description of each. */
export function StaffRolePicker({
  value,
  onChange,
  disabled,
  currentRole,
}: {
  value: UserRole
  onChange: (role: UserRole) => void
  disabled?: boolean
  currentRole?: UserRole
}) {
  return (
    <RadioGroup aria-label="Роль" value={value} onChange={(e) => onChange(e.target.value as UserRole)} sx={{ gap: 1 }}>
      {STAFF_ROLE_OPTIONS.map((role) => {
        const info = ROLE_INFO[role]
        const active = value === role
        return (
          <FormControlLabel
            key={role}
            value={role}
            disabled={disabled}
            control={<Radio sx={{ mt: -0.25 }} />}
            sx={{
              m: 0,
              alignItems: 'flex-start',
              px: 1.5,
              py: 1,
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
                  {role === currentRole && (
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
  )
}

/** Keeps the last non-null value so dialog content does not blank out during the close animation. */
export function useLastNonNull<T>(value: T | null): T | null {
  const ref = useRef<T | null>(value)
  if (value !== null) ref.current = value
  return value ?? ref.current
}
