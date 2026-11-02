import { Avatar, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import { StatusChip } from '../../components/ui'
import { color } from '../../theme/tokens'
import { initials, isStaffRole, roleInfo, subscriptionStatusInfo } from './userLabels'

/** Role as a quiet tag (no dot — a role is not a status). */
export function RoleChip({ role, size = 'small' }: { role?: string | null; size?: 'small' | 'medium' }) {
  const info = roleInfo(role)
  return <StatusChip label={info.label} tone={info.tone} hideDot size={size} />
}

/**
 * Role cell for user lists: staff roles stand out as chips, learners are plain text,
 * so admin accounts are easy to spot in a long list.
 */
export function RoleCell({ role }: { role?: string | null }) {
  if (isStaffRole(role)) return <RoleChip role={role} />
  return (
    <Typography variant="body2" color="text.secondary">
      {roleInfo(role).label}
    </Typography>
  )
}

/**
 * Premium / free access as the backend computed it (`isPremium`), with the subscription
 * status underneath when it explains the access (grace period, expired, refunded…).
 */
export function AccessCell({ isPremium, subscriptionStatus }: { isPremium?: boolean; subscriptionStatus?: string | null }) {
  const status = subscriptionStatus && subscriptionStatus !== 'free' && subscriptionStatus !== 'active' ? subscriptionStatusInfo(subscriptionStatus) : null
  return (
    <Stack alignItems="flex-start" gap={0.25}>
      <StatusChip status={isPremium ? 'premium' : 'free'} />
      {status && (
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {status.label}
        </Typography>
      )}
    </Stack>
  )
}

export function UserAvatar({
  name,
  email,
  src,
  size = 36,
  sx,
}: {
  name?: string | null
  email?: string | null
  src?: string | null
  size?: number
  sx?: SxProps<Theme>
}) {
  return (
    <Avatar
      src={src || undefined}
      alt=""
      sx={[
        {
          width: size,
          height: size,
          bgcolor: 'brand.sand',
          color: color.bronze[800],
          fontSize: size >= 48 ? '1.125rem' : '0.8125rem',
          fontWeight: 600,
          flexShrink: 0,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {initials(name, email)}
    </Avatar>
  )
}
