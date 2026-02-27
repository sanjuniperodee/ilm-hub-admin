import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  EmailOutlined,
  LockOutlined,
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 40%, #312E81 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          top: '-10%',
          right: '-5%',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(129,140,248,0.1) 0%, transparent 70%)',
          bottom: '-10%',
          left: '-5%',
        }}
      />

      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          mx: 2,
          position: 'relative',
          zIndex: 1,
        }}
        className="animate-fade-in"
      >
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.3rem' }}>
              IH
            </Typography>
          </Box>
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '1.75rem',
              letterSpacing: '-0.02em',
            }}
          >
            ILM HUB
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: '0.875rem',
              fontWeight: 400,
              mt: 0.5,
            }}
          >
            Войдите для доступа к панели администратора
          </Typography>
        </Box>

        {/* Card */}
        <Box
          sx={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            p: 4,
          }}
        >
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: '12px',
                background: 'rgba(239,68,68,0.1)',
                color: '#FCA5A5',
                border: '1px solid rgba(239,68,68,0.2)',
                '& .MuiAlert-icon': { color: '#EF4444' },
              }}
            >
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  color: '#fff',
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.1)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.2)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#6366F1',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255,255,255,0.35)',
                  opacity: 1,
                },
              }}
            />
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      sx={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  color: '#fff',
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.1)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.2)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#6366F1',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255,255,255,0.35)',
                  opacity: 1,
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.5,
                fontSize: '0.9375rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #818CF8 0%, #6366F1 100%)',
                  boxShadow: '0 6px 24px rgba(99,102,241,0.5)',
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  background: 'rgba(99,102,241,0.3)',
                  color: 'rgba(255,255,255,0.5)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </Box>
        </Box>

        <Typography
          sx={{
            textAlign: 'center',
            mt: 4,
            color: 'rgba(255,255,255,0.2)',
            fontSize: '0.75rem',
          }}
        >
          © 2024 ILM HUB. Все права защищены.
        </Typography>
      </Box>
    </Box>
  )
}
