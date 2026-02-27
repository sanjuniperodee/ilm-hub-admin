import { useEffect, useState } from 'react'
import { Box, Typography, CircularProgress, Grid, Card, CardContent, Stack } from '@mui/material'
import {
  PeopleOutlined,
  SchoolOutlined,
  TrendingUp,
  CalendarTodayOutlined,
} from '@mui/icons-material'
import { getUsers, getCourses } from '../api/adminApi'

const formatDate = () => {
  const now = new Date()
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  gradient: string
  iconBg: string
}

function StatCard({ title, value, icon, gradient, iconBg }: StatCardProps) {
  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: gradient,
        },
      }}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'text.secondary',
                mb: 1,
              }}
            >
              {title}
            </Typography>
            <Typography
              sx={{
                fontSize: '2rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'text.primary',
                lineHeight: 1,
              }}
            >
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '14px',
              background: iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '& .MuiSvgIcon-root': {
                fontSize: '1.5rem',
              },
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

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
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    )
  }

  return (
    <Box className="animate-fade-in">
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Dashboard
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
          <CalendarTodayOutlined sx={{ fontSize: 16, color: 'text.disabled' }} />
          <Typography variant="body2" color="text.secondary">
            {formatDate()}
          </Typography>
        </Stack>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats.users}
            icon={<PeopleOutlined sx={{ color: '#6366F1' }} />}
            gradient="linear-gradient(135deg, #6366F1, #818CF8)"
            iconBg="rgba(99,102,241,0.1)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Courses"
            value={stats.courses}
            icon={<SchoolOutlined sx={{ color: '#10B981' }} />}
            gradient="linear-gradient(135deg, #10B981, #34D399)"
            iconBg="rgba(16,185,129,0.1)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Today"
            value="—"
            icon={<TrendingUp sx={{ color: '#F59E0B' }} />}
            gradient="linear-gradient(135deg, #F59E0B, #FCD34D)"
            iconBg="rgba(245,158,11,0.1)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completion Rate"
            value="—"
            icon={<TrendingUp sx={{ color: '#3B82F6' }} />}
            gradient="linear-gradient(135deg, #3B82F6, #93C5FD)"
            iconBg="rgba(59,130,246,0.1)"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Quick Overview
        </Typography>
        <Card>
          <CardContent sx={{ p: 4, textAlign: 'center', '&:last-child': { pb: 4 } }}>
            <SchoolOutlined sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" sx={{ fontSize: '0.9375rem' }}>
              Use the sidebar to navigate between sections.
              <br />
              Start with <strong>Content Studio</strong> to manage your courses and lessons.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
