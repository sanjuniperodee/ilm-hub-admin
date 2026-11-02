import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { ContentCopyOutlined, MailOutline } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { cancelInvitation } from '../../api/adminApi'
import { DataTable, EmptyState, StatusChip, getErrorMessage, useConfirm, visuallyHidden, type DataTableColumn } from '../../components/ui'
import { RoleChip } from '../users/UserChips'
import { formatDate, formatRelative } from '../users/userLabels'
import { copyToClipboard } from './adminShared'

export interface Invitation {
  id: string
  email: string
  role: string
  inviteUrl?: string
  expiresAt?: string
  createdAt: string
  inviter?: { email?: string; name?: string } | null
}

export function PendingInvitations({
  invitations,
  loading,
  error,
  onRetry,
  onCancelled,
  onInvite,
}: {
  invitations: Invitation[]
  loading: boolean
  error: unknown
  onRetry: () => void
  onCancelled: (id: string) => void
  onInvite: () => void
}) {
  const confirm = useConfirm()

  const handleCancel = async (inv: Invitation) => {
    const ok = await confirm({
      title: 'Отменить приглашение?',
      description: `Ссылка для ${inv.email} перестанет работать. Пригласить заново можно в любой момент.`,
      confirmLabel: 'Отменить приглашение',
      cancelLabel: 'Не отменять',
      destructive: true,
    })
    if (!ok) return
    try {
      await cancelInvitation(inv.id)
      onCancelled(inv.id)
      toast.success('Приглашение отменено')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось отменить приглашение'))
    }
  }

  const columns: DataTableColumn<Invitation>[] = [
    {
      id: 'email',
      header: 'Email',
      minWidth: 220,
      render: (inv) => (
        <Typography variant="body1" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
          {inv.email}
        </Typography>
      ),
    },
    { id: 'role', header: 'Роль', render: (inv) => <RoleChip role={inv.role} /> },
    {
      id: 'createdAt',
      header: 'Отправлено',
      nowrap: true,
      hideBelow: 'md',
      render: (inv) => (
        <Box>
          <Typography variant="body2">{formatDate(inv.createdAt)}</Typography>
          {inv.inviter?.email && (
            <Typography variant="caption" color="text.secondary">
              {inv.inviter.name || inv.inviter.email}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'expiresAt',
      header: 'Ссылка',
      nowrap: true,
      render: (inv) => {
        if (!inv.expiresAt) return <StatusChip status="pending" />
        const expired = new Date(inv.expiresAt).getTime() < Date.now()
        return (
          <Stack alignItems="flex-start" gap={0.25}>
            <StatusChip label={expired ? 'Истекла' : 'Действует'} tone={expired ? 'error' : 'info'} />
            <Typography variant="caption" color="text.secondary">
              {expired ? `истекла ${formatRelative(inv.expiresAt)}` : `до ${formatDate(inv.expiresAt)}`}
            </Typography>
          </Stack>
        )
      },
    },
    {
      id: 'actions',
      header: <Box component="span" sx={visuallyHidden}>Действия</Box>,
      align: 'right',
      nowrap: true,
      render: (inv) => (
        <Stack direction="row" gap={0.5} justifyContent="flex-end">
          {inv.inviteUrl && (
            <Tooltip title="Скопировать ссылку">
              <IconButton aria-label={`Скопировать ссылку для ${inv.email}`} onClick={() => copyToClipboard(inv.inviteUrl!)}>
                <ContentCopyOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Button size="small" color="error" onClick={() => handleCancel(inv)}>
            Отменить
          </Button>
        </Stack>
      ),
    },
  ]

  return (
    <DataTable
      aria-label="Активные приглашения"
      columns={columns}
      rows={invitations}
      getRowId={(inv) => inv.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyState={
        <EmptyState
          size="sm"
          icon={<MailOutline />}
          title="Активных приглашений нет"
          description="Приглашённые сотрудники появятся здесь, пока не примут приглашение."
          action={<Button variant="outlined" onClick={onInvite}>Пригласить сотрудника</Button>}
        />
      }
    />
  )
}
