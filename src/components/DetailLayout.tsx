import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { Box, AppBar, Toolbar, Typography, IconButton } from '@mui/material'
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material'

export default function DetailLayout() {
  const navigate = useNavigate()
  const { lessonId } = useParams<{ lessonId: string }>()

  const handleBack = () => {
    navigate('/content-studio')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="fixed" elevation={0} sx={{ backgroundColor: 'background.paper', color: 'text.primary' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="back to content studio" onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
            Content Studio
          </Typography>
          {lessonId && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              / {lessonId.slice(0, 8)}…
            </Typography>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 8,
          px: 3,
          pb: 3,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
