import { useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { acceptAdminInvitation } from '../api/adminApi'
import { AuthLayout, getErrorMessage } from '../components/ui'

const MIN_PASSWORD = 8
const MAX_PASSWORD = 128

function passwordError(value: string): string | null {
  if (!value) return 'Придумайте пароль'
  if (value.length < MIN_PASSWORD) return `Минимум ${MIN_PASSWORD} символов`
  if (value.length > MAX_PASSWORD) return `Максимум ${MAX_PASSWORD} символов`
  return null
}

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({ password: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pwError = passwordError(password)
  const confirmError = !confirm ? 'Повторите пароль' : confirm !== password ? 'Пароли не совпадают' : null
  const showPwError = touched.password && pwError
  const showConfirmError = touched.confirm && confirmError

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ password: true, confirm: true })
    if (!token || pwError || confirmError) return
    setLoading(true)
    setError('')
    try {
      await acceptAdminInvitation(token, password)
      navigate('/login', {
        replace: true,
        state: { notice: 'Приглашение принято — войдите с новым паролем' },
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось принять приглашение'))
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Ссылка недействительна" subtitle="В ссылке нет токена приглашения.">
        <Stack gap={2.5}>
          <Alert severity="warning">
            Откройте ссылку из письма целиком или попросите администратора отправить приглашение ещё раз.
          </Alert>
          <Button component={RouterLink} to="/login" variant="outlined" size="large">
            Перейти ко входу
          </Button>
        </Stack>
      </AuthLayout>
    )
  }

  const toggle = (
    <InputAdornment position="end">
      <Tooltip title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>
        <IconButton
          onClick={() => setShowPassword((v) => !v)}
          edge="end"
          aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          aria-pressed={showPassword}
        >
          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
        </IconButton>
      </Tooltip>
    </InputAdornment>
  )

  return (
    <AuthLayout
      title="Приглашение в админ-панель"
      subtitle="Придумайте пароль — с ним вы будете входить в ILM HUB."
      footer={
        <>
          Уже есть доступ?{' '}
          <Link component={RouterLink} to="/login">
            Войти
          </Link>
        </>
      }
    >
      <Box component="form" onSubmit={handleAccept} noValidate>
        <Stack gap={2.5}>
          {error && (
            <Alert severity="error" role="alert">
              {error}
            </Alert>
          )}
          <TextField
            label="Пароль"
            type={showPassword ? 'text' : 'password'}
            name="new-password"
            autoComplete="new-password"
            autoFocus
            required
            fullWidth
            size="medium"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={Boolean(showPwError)}
            helperText={showPwError || `От ${MIN_PASSWORD} до ${MAX_PASSWORD} символов`}
            inputProps={{ maxLength: MAX_PASSWORD }}
            InputProps={{ endAdornment: toggle }}
          />
          <TextField
            label="Повторите пароль"
            type={showPassword ? 'text' : 'password'}
            name="confirm-password"
            autoComplete="new-password"
            required
            fullWidth
            size="medium"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
            error={Boolean(showConfirmError)}
            helperText={showConfirmError || ' '}
            inputProps={{ maxLength: MAX_PASSWORD }}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {loading ? 'Принимаем…' : 'Принять приглашение'}
          </Button>
        </Stack>
      </Box>
    </AuthLayout>
  )
}
