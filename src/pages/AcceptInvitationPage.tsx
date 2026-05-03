import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { CheckCircleOutline, LoginOutlined } from '@mui/icons-material'
import { acceptAdminInvitation } from '../api/adminApi'

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState(token ? '' : 'В ссылке нет токена приглашения.')

  const handleAccept = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await acceptAdminInvitation(token)
      const email = data?.user?.email ? ` для ${data.user.email}` : ''
      setSuccess(`Приглашение принято${email}. Теперь можно войти в админку.`)
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Не удалось принять приглашение')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC',
        px: 2,
      }}
    >
      <Paper sx={{ width: '100%', maxWidth: 460, p: 4 }}>
        <Stack spacing={2.5} alignItems="stretch">
          <Stack spacing={1} alignItems="center" sx={{ textAlign: 'center' }}>
            <CheckCircleOutline color="primary" sx={{ fontSize: 44 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Приглашение в админку
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Подтвердите приглашение, чтобы получить доступ к панели ILM HUB.
            </Typography>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          {!success ? (
            <Button
              variant="contained"
              onClick={handleAccept}
              disabled={loading || !token}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CheckCircleOutline />}
            >
              {loading ? 'Проверяем...' : 'Принять приглашение'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
              startIcon={<LoginOutlined />}
            >
              Войти
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  )
}
