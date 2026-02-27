import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { Box, Typography, IconButton, Chip, Breadcrumbs } from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  NavigateNext,
} from '@mui/icons-material'

export default function DetailLayout() {
  const navigate = useNavigate()
  const { lessonId } = useParams<{ lessonId: string }>()

  const handleBack = () => {
    navigate('/content-studio')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Header */}
      <Box
        sx={{
          px: { xs: 2, md: 4 },
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <IconButton
          onClick={handleBack}
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            border: '1px solid rgba(0,0,0,0.08)',
            color: 'text.secondary',
            '&:hover': {
              background: 'rgba(99,102,241,0.06)',
              borderColor: 'rgba(99,102,241,0.2)',
              color: '#6366F1',
            },
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Breadcrumbs separator={<NavigateNext sx={{ fontSize: 16, color: 'text.disabled' }} />}>
          <Typography
            onClick={handleBack}
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'text.secondary',
              cursor: 'pointer',
              '&:hover': { color: '#6366F1' },
              transition: 'color 0.15s ease',
            }}
          >
            Content Studio
          </Typography>
          {lessonId && (
            <Chip
              label={lessonId.slice(0, 8) + '…'}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.75rem',
                fontWeight: 600,
                background: 'rgba(99,102,241,0.08)',
                color: '#4F46E5',
              }}
            />
          )}
        </Breadcrumbs>
      </Box>

      {/* Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 2, md: 4 },
          py: 3,
          maxWidth: '100%',
        }}
        className="page-enter"
      >
        <Outlet />
      </Box>
    </Box>
  )
}
