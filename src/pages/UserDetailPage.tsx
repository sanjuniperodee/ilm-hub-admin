import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Grid,
  Avatar,
  Chip,
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { getUserById } from '../api/adminApi'
import { format } from 'date-fns'

export default function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchUser()
    }
  }, [id])

  const fetchUser = async () => {
    try {
      const response = await getUserById(id!)
      setUser(response.data)
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (!user) {
    return <Typography>User not found</Typography>
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/users')}
        sx={{ mb: 2 }}
      >
        Back to Users
      </Button>
      <Typography variant="h4" gutterBottom>
        User Details
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Avatar src={user.avatarUrl} sx={{ width: 80, height: 80 }}>
                {user.name?.[0]?.toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h5">{user.name || 'N/A'}</Typography>
                <Chip
                  label={user.isPremium ? 'Premium' : 'Free'}
                  color={user.isPremium ? 'primary' : 'default'}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1" gutterBottom>
              {user.email}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
              Created At
            </Typography>
            <Typography variant="body1" gutterBottom>
              {format(new Date(user.createdAt), 'PPpp')}
            </Typography>
            {user.lastActiveAt && (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                  Last Active
                </Typography>
                <Typography variant="body1">
                  {format(new Date(user.lastActiveAt), 'PPpp')}
                </Typography>
              </>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}
