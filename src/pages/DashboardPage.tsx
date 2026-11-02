import { useCallback, useEffect, useState } from 'react'
import { Box, ButtonBase, Link, Stack, Typography } from '@mui/material'
import {
  PeopleAltOutlined,
  SchoolOutlined,
  PersonAddAltOutlined,
  QuizOutlined,
  MenuBookOutlined,
  AbcOutlined,
  ImportContactsOutlined,
  TimelineOutlined,
  ChevronRight,
  BoltOutlined,
  TaskAltOutlined,
  ViewModuleOutlined,
} from '@mui/icons-material'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Link as RouterLink } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { getDashboardStats } from '../api/adminApi'
import { useAuth } from '../contexts/AuthContext'
import { isPathAllowedForRole } from '../components/Layout'
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatCard, StatGroup } from '../components/ui'
import { color, fontFamily, radius } from '../theme/tokens'

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

const PERIOD_DAYS = 30

const n = (v: number) => v.toLocaleString('ru-RU')

const todayLabel = () => {
  const s = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const SHORTCUTS = [
  { path: '/content', title: 'Курсы и уроки', text: 'Модули, уроки, блоки и тесты', icon: <SchoolOutlined /> },
  { path: '/words-dictionary', title: 'Словарь', text: 'Слова для уроков и карточек', icon: <MenuBookOutlined /> },
  { path: '/words-alphabet', title: 'Алфавит', text: 'Буквы, формы и произношение', icon: <AbcOutlined /> },
  { path: '/islam-quran', title: 'Коран', text: 'Суры, аяты и перевод', icon: <ImportContactsOutlined /> },
  { path: '/users', title: 'Пользователи', text: 'Профили, прогресс и подписки', icon: <PeopleAltOutlined /> },
]

export default function DashboardPage() {
  const { userRole } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getDashboardStats({ days: PERIOD_DAYS })
      setStats(res.data)
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const canSeeUsers = isPathAllowedForRole('/users', userRole)
  const shortcuts = SHORTCUTS.filter((s) => isPathAllowedForRole(s.path, userRole)).slice(0, 4)

  const header = <PageHeader title="Обзор" subtitle={todayLabel()} />

  if (loading && !stats) {
    return (
      <>
        {header}
        <LoadingState variant="page" rows={8} label="Загружаем статистику…" />
      </>
    )
  }

  if (error || !stats) {
    return (
      <>
        {header}
        <SectionCard>
          <ErrorState title="Не удалось загрузить статистику" error={error} onRetry={fetchStats} />
        </SectionCard>
      </>
    )
  }

  const chartData = stats.signupsByDay.map((d) => ({
    date: format(new Date(d.date), 'd MMM', { locale: ru }),
    count: d.count,
    fullDate: d.date,
  }))
  const periodSignups = stats.signupsByDay.reduce((sum, d) => sum + d.count, 0)

  return (
    <Box>
      {header}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 3fr) minmax(0, 4fr)' },
          mb: 3,
        }}
      >
        <StatGroup title="Аудитория" columns={{ xs: 2, sm: 3 }}>
          <StatCard
            variant="plain"
            label="Всего пользователей"
            value={n(stats.totalUsers)}
            icon={<PeopleAltOutlined />}
            to={canSeeUsers ? '/users' : undefined}
          />
          <StatCard
            variant="plain"
            label="Новых за неделю"
            value={n(stats.newUsersThisWeek)}
            icon={<PersonAddAltOutlined />}
            hint={`Сегодня: ${n(stats.newUsersToday)}`}
          />
          <StatCard variant="plain" label="Активных сегодня" value={n(stats.activeUsersToday)} icon={<BoltOutlined />} />
        </StatGroup>
        <StatGroup title="Обучение" columns={{ xs: 2, md: 4 }}>
          <StatCard
            variant="plain"
            label="Курсов"
            value={n(stats.totalCourses)}
            icon={<SchoolOutlined />}
            hint={`Модулей: ${n(stats.totalModules)}`}
            to={isPathAllowedForRole('/content', userRole) ? '/content' : undefined}
          />
          <StatCard variant="plain" label="Уроков" value={n(stats.totalLessons)} icon={<ViewModuleOutlined />} />
          <StatCard
            variant="plain"
            label="Уроков завершено"
            value={n(stats.lessonsCompleted)}
            icon={<TaskAltOutlined />}
            hint={
              stats.completionRate != null
                ? `${stats.completionRate}% от всех уроков у всех пользователей`
                : 'Процент завершения недоступен'
            }
          />
          <StatCard
            variant="plain"
            label="Попыток тестов"
            value={n(stats.testAttemptsTotal)}
            icon={<QuizOutlined />}
            hint={stats.testAttemptsTotal > 0 ? `Сдано: ${stats.testPassRate ?? 0}%` : 'Тесты ещё не проходили'}
          />
        </StatGroup>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' },
          alignItems: 'stretch',
          mb: 3,
        }}
      >
        <SectionCard
          id="signups"
          title="Регистрации"
          description={`За ${PERIOD_DAYS} дней: ${n(periodSignups)}`}
        >
          <Box sx={{ width: '100%', height: { xs: 220, md: 280 } }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="signupsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color.bronze[500]} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={color.bronze[500]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={color.neutral[200]} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: color.neutral[600], fontFamily: fontFamily.sans }}
                    tickLine={false}
                    axisLine={{ stroke: color.neutral[300] }}
                    minTickGap={16}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: color.neutral[600], fontFamily: fontFamily.sans }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={44}
                  />
                  <Tooltip
                    cursor={{ stroke: color.bronze[300], strokeWidth: 1 }}
                    contentStyle={{
                      borderRadius: radius.md,
                      border: `1px solid ${color.neutral[200]}`,
                      boxShadow: '0 4px 12px rgba(41,28,16,0.10)',
                      fontFamily: fontFamily.sans,
                      fontSize: 13,
                    }}
                    formatter={(value: number | undefined) => [value ?? 0, 'Регистраций']}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.fullDate
                        ? format(new Date(payload[0].payload.fullDate), 'd MMMM yyyy', { locale: ru })
                        : label
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={color.bronze[600]}
                    strokeWidth={2}
                    fill="url(#signupsFill)"
                    activeDot={{ r: 4, fill: color.bronze[600], stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                size="sm"
                icon={<TimelineOutlined />}
                title="Нет регистраций за период"
                description="График появится, когда в приложении зарегистрируются новые пользователи."
              />
            )}
          </Box>
        </SectionCard>

        <SectionCard id="activity" title="Последняя активность" padding="none">
          {stats.recentActivity.length === 0 ? (
            <EmptyState size="sm" title="Активности пока нет" description="Здесь появятся регистрации и попытки тестов." />
          ) : (
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, maxHeight: { xs: 320, lg: 336 }, overflowY: 'auto' }}>
              {stats.recentActivity.map((item, idx) => {
                const isSignup = item.type === 'user_signup'
                const tone = isSignup ? color.info : item.isPassed ? color.success : color.warning
                return (
                  <Stack
                    component="li"
                    key={idx}
                    direction="row"
                    gap={1.5}
                    alignItems="flex-start"
                    sx={{ px: 2.5, py: 1.25, borderTop: idx === 0 ? 0 : 1, borderColor: 'surface.sunken' }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        mt: 0.25,
                        width: 28,
                        height: 28,
                        flexShrink: 0,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: tone.soft,
                        color: tone.main,
                        '& .MuiSvgIcon-root': { fontSize: 16 },
                      }}
                    >
                      {isSignup ? <PersonAddAltOutlined /> : <QuizOutlined />}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      {canSeeUsers ? (
                        <Link
                          component={RouterLink}
                          to={`/users/${item.userId}`}
                          sx={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {item.userName || item.userEmail || 'Пользователь'}
                        </Link>
                      ) : (
                        <Typography variant="body1" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.userName || item.userEmail || 'Пользователь'}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {item.description}
                      </Typography>
                    </Box>
                    <Typography
                      component="time"
                      dateTime={item.date}
                      variant="caption"
                      color="text.secondary"
                      sx={{ flexShrink: 0, mt: 0.25, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {format(new Date(item.date), 'd MMM, HH:mm', { locale: ru })}
                    </Typography>
                  </Stack>
                )
              })}
            </Box>
          )}
        </SectionCard>
      </Box>

      {shortcuts.length > 0 && (
        <SectionCard id="shortcuts" title="Разделы" padding="dense">
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: `repeat(${shortcuts.length}, minmax(0, 1fr))` },
            }}
          >
            {shortcuts.map((s) => (
              <ButtonBase
                key={s.path}
                component={RouterLink}
                to={s.path}
                sx={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: `${radius.md}px`,
                  '&:hover': { bgcolor: color.bronze[50] },
                  '&:hover .shortcut-chevron': { color: color.bronze[600], transform: 'translateX(2px)' },
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    borderRadius: `${radius.md}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: color.sand[200],
                    color: color.bronze[700],
                    '& .MuiSvgIcon-root': { fontSize: 20 },
                  }}
                >
                  {s.icon}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" component="span" sx={{ display: 'block', fontSize: '0.875rem' }}>
                    {s.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                    {s.text}
                  </Typography>
                </Box>
                <ChevronRight
                  className="shortcut-chevron"
                  aria-hidden
                  sx={{ color: color.neutral[400], fontSize: 20, transition: 'transform 120ms, color 120ms' }}
                />
              </ButtonBase>
            ))}
          </Box>
        </SectionCard>
      )}
    </Box>
  )
}
