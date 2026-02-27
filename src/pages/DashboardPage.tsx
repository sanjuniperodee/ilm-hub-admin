import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Stack,
  Link,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material'
import {
  PeopleOutlined,
  SchoolOutlined,
  TrendingUp,
  CalendarTodayOutlined,
  ArticleOutlined,
  MenuBookOutlined,
  QuizOutlined,
  CheckCircleOutlined,
  PersonAddOutlined,
  FormatListBulleted,
} from '@mui/icons-material'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Link as RouterLink } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { getDashboardStats } from '../api/adminApi'

interface DashboardStats {
  totalUsers: number
  newUsersToday: number
  newUsersThisWeek: number
  activeUsersToday: number
  totalCourses: number
  totalModules: number
  totalLessons: number
  lessonsCompleted: number
  completionRate: number | null
  testAttemptsTotal: number
  testPassRate: number | null
  signupsByDay: { date: string; count: number }[]
  recentActivity: {
    type: 'user_signup' | 'test_attempt'
    date: string
    userId: string
    userName: string | null
    userEmail: string
    description: string
    lessonTitle?: string
    isPassed?: boolean
  }[]
}

const formatDate = () => {
  const now = new Date()
  return now.toLocaleDateString('ru-RU', {
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
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getDashboardStats({ days: 30 })
        setStats(res.data)
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
        setError('Не удалось загрузить статистику')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    )
  }

  if (error || !stats) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">{error ?? 'Нет данных'}</Typography>
      </Box>
    )
  }

  const chartData = stats.signupsByDay.map((d) => ({
    date: format(new Date(d.date), 'd MMM', { locale: ru }),
    count: d.count,
    fullDate: d.date,
  }))

  const quickLinks = [
    { text: 'Контент', icon: <SchoolOutlined />, path: '/content' },
    { text: 'Пользователи', icon: <PeopleOutlined />, path: '/users' },
    { text: 'Алфавит', icon: <ArticleOutlined />, path: '/words-alphabet' },
    { text: 'Словарь', icon: <MenuBookOutlined />, path: '/words-dictionary' },
  ]

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
          Панель управления
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
          <CalendarTodayOutlined sx={{ fontSize: 16, color: 'text.disabled' }} />
          <Typography variant="body2" color="text.secondary">
            {formatDate()}
          </Typography>
        </Stack>
      </Box>

      {/* KPI Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего пользователей"
            value={stats.totalUsers}
            icon={<PeopleOutlined sx={{ color: '#6366F1' }} />}
            gradient="linear-gradient(135deg, #6366F1, #818CF8)"
            iconBg="rgba(99,102,241,0.1)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Новых за неделю"
            value={stats.newUsersThisWeek}
            icon={<PersonAddOutlined sx={{ color: '#10B981' }} />}
            gradient="linear-gradient(135deg, #10B981, #34D399)"
            iconBg="rgba(16,185,129,0.1)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Активных сегодня"
            value={stats.activeUsersToday}
            icon={<TrendingUp sx={{ color: '#F59E0B' }} />}
            gradient="linear-gradient(135deg, #F59E0B, #FCD34D)"
            iconBg="rgba(245,158,11,0.1)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего курсов"
            value={stats.totalCourses}
            icon={<SchoolOutlined sx={{ color: '#3B82F6' }} />}
            gradient="linear-gradient(135deg, #3B82F6, #93C5FD)"
            iconBg="rgba(59,130,246,0.1)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего уроков"
            value={stats.totalLessons}
            icon={<FormatListBulleted sx={{ color: '#8B5CF6' }} />}
            gradient="linear-gradient(135deg, #8B5CF6, #A78BFA)"
            iconBg="rgba(139,92,246,0.1)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Уроков завершено"
            value={stats.lessonsCompleted}
            icon={<CheckCircleOutlined sx={{ color: '#10B981' }} />}
            gradient="linear-gradient(135deg, #10B981, #34D399)"
            iconBg="rgba(16,185,129,0.1)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Процент завершения"
            value={stats.completionRate != null ? `${stats.completionRate}%` : '—'}
            icon={<TrendingUp sx={{ color: '#6366F1' }} />}
            gradient="linear-gradient(135deg, #6366F1, #818CF8)"
            iconBg="rgba(99,102,241,0.1)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Тесты: попыток / % сдачи"
            value={
              stats.testAttemptsTotal > 0
                ? `${stats.testAttemptsTotal} / ${stats.testPassRate ?? 0}%`
                : '0 / —'
            }
            icon={<QuizOutlined sx={{ color: '#F59E0B' }} />}
            gradient="linear-gradient(135deg, #F59E0B, #FCD34D)"
            iconBg="rgba(245,158,11,0.1)"
          />
        </Grid>
      </Grid>

      {/* Chart + Activity + Quick Links */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Регистрации за 30 дней
              </Typography>
              <Box sx={{ width: '100%', height: 280 }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#64748B" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#64748B" allowDecimals={false} />
                      <Tooltip
                        formatter={(value: number | undefined) => [value ?? 0, 'Регистраций']}
                        labelFormatter={(label, payload) =>
                          payload?.[0]?.payload?.fullDate
                            ? format(new Date(payload[0].payload.fullDate), 'd MMMM yyyy', {
                                locale: ru,
                              })
                            : label
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#6366F1"
                        strokeWidth={2}
                        fill="url(#colorCount)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    height="100%"
                    color="text.secondary"
                  >
                    Нет данных за период
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Последняя активность
              </Typography>
              <List dense disablePadding sx={{ maxHeight: 320, overflow: 'auto' }}>
                {stats.recentActivity.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    Нет активности
                  </Typography>
                ) : (
                  stats.recentActivity.map((item, idx) => (
                    <ListItem key={idx} disablePadding sx={{ mb: 1.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {item.type === 'user_signup' ? (
                          <PersonAddOutlined sx={{ fontSize: 20, color: '#10B981' }} />
                        ) : (
                          <QuizOutlined
                            sx={{
                              fontSize: 20,
                              color: item.isPassed ? '#10B981' : '#F59E0B',
                            }}
                          />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Link
                            component={RouterLink}
                            to={`/users/${item.userId}`}
                            underline="hover"
                            sx={{ fontWeight: 500 }}
                          >
                            {item.userName || item.userEmail || 'Пользователь'}
                          </Link>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {item.description}
                          </Typography>
                        }
                        secondaryTypographyProps={{ component: 'span' }}
                      />
                      <Typography variant="caption" color="text.disabled" sx={{ ml: 1 }}>
                        {format(new Date(item.date), 'd MMM, HH:mm', { locale: ru })}
                      </Typography>
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Быстрые действия
        </Typography>
        <Grid container spacing={2}>
          {quickLinks.map((link) => (
            <Grid item xs={12} sm={6} md={3} key={link.path}>
              <Link component={RouterLink} to={link.path} underline="none">
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 2,
                    },
                  }}
                >
                  <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {link.icon}
                    </Box>
                    <Typography fontWeight={600}>{link.text}</Typography>
                  </CardContent>
                </Card>
              </Link>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  )
}
