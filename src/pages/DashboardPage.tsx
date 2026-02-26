import { useEffect, useState } from 'react'
import { Grid, Paper, Typography, Box, CircularProgress } from '@mui/material'
import { getUsers, getCourses } from '../api/adminApi'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    users: 0,
    courses: 0,
    loading: true,
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, coursesRes] = await Promise.all([
          getUsers(),
          getCourses(),
        ])
        setStats({
          users: usersRes.data.length,
          courses: coursesRes.data.length,
          loading: false,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
        setStats((prev) => ({ ...prev, loading: false }))
      }
    }
    fetchStats()
  }, [])

  if (stats.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h3" color="primary">
              {stats.users}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Total Users
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h3" color="primary">
              {stats.courses}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Total Courses
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
