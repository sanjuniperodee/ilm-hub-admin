import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { AuthLayout } from '../components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      const apiMessage = err.response?.data?.message
      setError(
        (Array.isArray(apiMessage) ? apiMessage[0] : apiMessage) ||
          (err.response?.status === 401 ? 'Неверный email или пароль' : err.message) ||
          'Ошибка входа',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Вход в админ-панель"
      subtitle="Для редакторов контента, поддержки и администраторов ILM HUB."
      footer="Нет доступа? Попросите администратора отправить приглашение на вашу почту."
    >
      <Box component="form" onSubmit={handleSubmit}>
        <Stack gap={2.5}>
          {notice && !error && (
            <Alert severity="success" role="status">
              {notice}
            </Alert>
          )}
          {error && (
            <Alert severity="error" role="alert">
              {error}
            </Alert>
          )}
          <TextField
            label="Email"
            type="email"
            name="email"
            autoComplete="username"
            autoFocus
            required
            fullWidth
            size="medium"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(error)}
          />
          <TextField
            label="Пароль"
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="current-password"
            required
            fullWidth
            size="medium"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(error)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ mt: 0.5 }}
          >
            {loading ? 'Входим…' : 'Войти'}
          </Button>
        </Stack>
      </Box>
    </AuthLayout>
  )
}
