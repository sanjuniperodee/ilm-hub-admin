import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { CheckCircleOutline, ContentCopyOutlined } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { inviteAdmin } from '../../api/adminApi'
import type { UserRole } from '../../types/admin-permissions'
import { FormSection, getErrorMessage } from '../../components/ui'
import { dialogActionsSafeAreaSx, useNarrowDialogProps } from '../../hooks/useNarrowDialogProps'
import { color, radius } from '../../theme/tokens'
import { roleInfo } from '../users/userLabels'
import { StaffRolePicker, copyToClipboard } from './adminShared'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function InviteAdminDialog({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: () => void }) {
  const dialogProps = useNarrowDialogProps('sm')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('content_manager')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [touched, setTouched] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState<{ email: string; role: UserRole; inviteUrl: string | null } | null>(null)

  const email = inviteEmail.trim()
  const emailError = touched && (!email ? 'Введите email' : !EMAIL_RE.test(email) ? 'Проверьте адрес: нужен вид name@example.com' : '')

  const reset = () => {
    setInviteEmail('')
    setInviteRole('content_manager')
    setTouched(false)
    setSubmitError('')
    setDone(null)
  }

  const close = () => {
    if (inviteLoading) return
    onClose()
    // Let the closing animation finish before clearing the success step.
    window.setTimeout(reset, 200)
  }

  const handleInvite = async () => {
    setTouched(true)
    if (!email || !EMAIL_RE.test(email)) return
    setInviteLoading(true)
    setSubmitError('')
    try {
      const { data } = await inviteAdmin({ email, role: inviteRole })
      setDone({ email, role: inviteRole, inviteUrl: data?.inviteUrl || null })
      toast.success('Приглашение отправлено')
      onInvited()
    } catch (e) {
      setSubmitError(getErrorMessage(e, 'Не удалось отправить приглашение'))
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={close} {...dialogProps} aria-labelledby="invite-admin-title">
      <DialogTitle id="invite-admin-title">{done ? 'Приглашение отправлено' : 'Пригласить сотрудника'}</DialogTitle>
      {done ? (
        <>
          <DialogContent>
            <Stack gap={2}>
              <Stack direction="row" gap={1.5} alignItems="flex-start">
                <CheckCircleOutline sx={{ color: 'success.main', mt: 0.25 }} aria-hidden />
                <Typography variant="body1">
                  Письмо со ссылкой поставлено в очередь на {done.email}. Роль: «{roleInfo(done.role).label}». По ссылке сотрудник задаст пароль и войдёт в админ-панель. Ссылка действует 7 дней.
                </Typography>
              </Stack>
              {done.inviteUrl && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                    Ссылка-приглашение
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Если письмо не дойдёт, отправьте ссылку сами. Не публикуйте её: по ней можно создать доступ.
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        px: 1.5,
                        py: 1,
                        borderRadius: `${radius.md}px`,
                        bgcolor: color.neutral[50],
                        border: 1,
                        borderColor: 'divider',
                        fontFamily: 'monospace',
                        fontSize: '0.8125rem',
                        overflowWrap: 'anywhere',
                        userSelect: 'all',
                      }}
                    >
                      {done.inviteUrl}
                    </Box>
                    <Button variant="outlined" startIcon={<ContentCopyOutlined />} onClick={() => copyToClipboard(done.inviteUrl!)} sx={{ flexShrink: 0 }}>
                      Скопировать
                    </Button>
                  </Stack>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={dialogActionsSafeAreaSx}>
            <Button onClick={reset}>Пригласить ещё</Button>
            <Button variant="contained" onClick={close}>
              Готово
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent>
            <Stack gap={1}>
              {submitError && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {submitError}
                </Alert>
              )}
              <FormSection title="Кого пригласить" layout="stacked" divider={false}>
                <TextField
                  label="Рабочий email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInvite()
                  }}
                  error={Boolean(emailError)}
                  helperText={emailError || 'На этот адрес придёт письмо со ссылкой. Повторное приглашение заменит старую ссылку.'}
                  fullWidth
                  autoFocus
                  required
                />
              </FormSection>
              <FormSection title="Роль" description="Права роли можно уточнить позже." layout="stacked">
                <StaffRolePicker value={inviteRole} onChange={setInviteRole} disabled={inviteLoading} />
              </FormSection>
            </Stack>
          </DialogContent>
          <DialogActions sx={dialogActionsSafeAreaSx}>
            <Button variant="outlined" onClick={close} disabled={inviteLoading}>
              Отмена
            </Button>
            <Button
              variant="contained"
              onClick={handleInvite}
              disabled={inviteLoading}
              startIcon={inviteLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              Отправить приглашение
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
