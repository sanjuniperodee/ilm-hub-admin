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
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { ArrowBack, EmojiEvents } from '@mui/icons-material'
import {
  getUserById,
  getUserLearningSummary,
  getUserCoursesProgress,
  getUserTestsAttempts,
  getUserAchievements,
  getUserStreaks,
  getUserSubscriptions,
  getUserOAuthProviders,
  getUserStudyPlan,
  getUserWordsSummary,
} from '../api/adminApi'
import { format } from 'date-fns'

type TabValue = 'overview' | 'progress' | 'tests' | 'achievements' | 'streaks' | 'profile' | 'words'

export default function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabValue>('overview')

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
    return <Typography>Пользователь не найден</Typography>
  }

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/users')} sx={{ mb: 2 }}>
        К списку пользователей
      </Button>
      <Typography variant="h4" gutterBottom>
        Профиль пользователя
      </Typography>

      <Paper sx={{ p: 3, mt: 2, mb: 2 }}>
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
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Телефон</Typography>
                <Typography variant="body2">{user.phone || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Язык</Typography>
                <Typography variant="body2">{user.language || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Страна</Typography>
                <Typography variant="body2">{user.country || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Уровень</Typography>
                <Typography variant="body2">{user.level || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Подписка</Typography>
                <Typography variant="body2">{user.subscriptionStatus || '—'}</Typography>
                {user.subscriptionExpiresAt && (
                  <Typography variant="caption" display="block">
                    до {format(new Date(user.subscriptionExpiresAt), 'dd.MM.yyyy')}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Цель мин/день</Typography>
                <Typography variant="body2">{user.dailyGoalMinutes ?? '—'}</Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Email</Typography>
            <Typography variant="body1" gutterBottom>
              {user.email}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
              <Chip size="small" label={user.emailVerified ? 'Email подтверждён' : 'Email не подтверждён'} color={user.emailVerified ? 'success' : 'default'} />
              <Chip size="small" label={user.pushEnabled ? 'Push вкл' : 'Push выкл'} variant="outlined" />
              <Chip size="small" label={user.emailNotifications ? 'Уведомления вкл' : 'Уведомления выкл'} variant="outlined" />
              <Chip size="small" label={user.studyReminders ? 'Напоминания вкл' : 'Напоминания выкл'} variant="outlined" />
            </Stack>
            {user.motivation?.length > 0 && (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Мотивация</Typography>
                <Typography variant="body2">{user.motivation.join(', ')}</Typography>
              </>
            )}
            {user.attributionSource && (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Источник привлечения</Typography>
                <Typography variant="body2">{user.attributionSource}</Typography>
              </>
            )}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Создан</Typography>
            <Typography variant="body1" gutterBottom>
              {format(new Date(user.createdAt), 'PPpp')}
            </Typography>
            {user.lastActiveAt && (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Последняя активность</Typography>
                <Typography variant="body1">
                  {format(new Date(user.lastActiveAt), 'PPpp')}
                </Typography>
              </>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Обзор" value="overview" />
        <Tab label="Прогресс" value="progress" />
        <Tab label="Тесты" value="tests" />
        <Tab label="Достижения" value="achievements" />
        <Tab label="Стрики" value="streaks" />
        <Tab label="Профиль" value="profile" />
        <Tab label="Слова" value="words" />
      </Tabs>

      {tab === 'overview' && <UserOverviewTab userId={id!} />}
      {tab === 'progress' && <UserProgressTab userId={id!} />}
      {tab === 'tests' && <UserTestsTab userId={id!} />}
      {tab === 'achievements' && <UserAchievementsTab userId={id!} />}
      {tab === 'streaks' && <UserStreaksTab userId={id!} />}
      {tab === 'profile' && <UserProfileTab userId={id!} />}
      {tab === 'words' && <UserWordsTab userId={id!} />}
    </Box>
  )
}

function UserOverviewTab({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getUserLearningSummary(userId)
      .then((res) => {
        if (!cancelled) setData(res.data)
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.message?.[0] || e?.message || 'Ошибка загрузки')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId])

  if (loading) return <CircularProgress sx={{ mt: 2 }} />
  if (error) return <Typography color="error">{error}</Typography>
  if (!data) return null

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              Уровень
            </Typography>
            <Typography variant="h6">{data.level || '—'}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              Прогресс уроков
            </Typography>
            <Typography variant="h6">
              {data.lessonsCompleted} / {data.totalLessons} ({data.overallProgress ?? 0}%)
            </Typography>
            <LinearProgress variant="determinate" value={data.overallProgress ?? 0} sx={{ mt: 1 }} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              Тесты пройдено
            </Typography>
            <Typography variant="h6">
              {data.testsPassed} / {data.testsTotal}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              Стрик
            </Typography>
            <Typography variant="h6">{data.streak ?? 0} дней</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              Очки
            </Typography>
            <Typography variant="h6">{data.totalPoints ?? 0}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              Достижений
            </Typography>
            <Typography variant="h6">{data.achievementsCount ?? 0}</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

function UserProgressTab({ userId }: { userId: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getUserCoursesProgress(userId)
      .then((res) => {
        if (!cancelled) setData(Array.isArray(res.data) ? res.data : [])
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.message?.[0] || e?.message || 'Ошибка загрузки')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId])

  if (loading) return <CircularProgress sx={{ mt: 2 }} />
  if (error) return <Typography color="error">{error}</Typography>

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      {data.map((c: any) => (
        <Card key={c.id} variant="outlined">
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {c.titleRu} ({c.code})
              </Typography>
              <Chip
                size="small"
                label={`${c.completedLessons}/${c.totalLessons} (${c.progressPercent}%)`}
                color="primary"
                variant="outlined"
              />
            </Stack>
            <LinearProgress variant="determinate" value={c.progressPercent} sx={{ mb: 1 }} />
            {c.levelTestPassed !== null && (
              <Typography variant="caption" color="text.secondary">
                Тест уровня: {c.levelTestPassed ? 'Пройден' : 'Не пройден'}
              </Typography>
            )}
            {c.modules?.length > 0 && (
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                {c.modules.map((m: any) => (
                  <Typography key={m.id} variant="caption" display="block">
                    {m.titleRu}: {m.completed}/{m.total}
                  </Typography>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      ))}
      {data.length === 0 && (
        <Typography color="text.secondary">Нет данных о прогрессе</Typography>
      )}
    </Stack>
  )
}

function UserTestsTab({ userId }: { userId: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [testTypeFilter, setTestTypeFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    getUserTestsAttempts(userId, testTypeFilter ? { testType: testTypeFilter } : undefined)
      .then((res) => {
        if (!cancelled) setData(Array.isArray(res.data) ? res.data : [])
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.message?.[0] || e?.message || 'Ошибка загрузки')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId, testTypeFilter])

  if (loading) return <CircularProgress sx={{ mt: 2 }} />
  if (error) return <Typography color="error">{error}</Typography>

  return (
    <Box sx={{ mt: 1 }}>
      <FormControl size="small" sx={{ minWidth: 120, mb: 2 }}>
        <InputLabel>Тип теста</InputLabel>
        <Select
          value={testTypeFilter}
          label="Тип теста"
          onChange={(e) => setTestTypeFilter(e.target.value)}
        >
          <MenuItem value="">Все</MenuItem>
          <MenuItem value="lesson">Урок</MenuItem>
          <MenuItem value="module">Модуль</MenuItem>
          <MenuItem value="level">Уровень</MenuItem>
        </Select>
      </FormControl>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Тест</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Результат</TableCell>
              <TableCell>Попытка</TableCell>
              <TableCell>Дата</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row: any) => (
              <TableRow key={row.id}>
                <TableCell>{row.titleRu || row.miniTestId}</TableCell>
                <TableCell>
                  <Chip size="small" label={row.testType} />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={`${row.score ?? 0}%`}
                    color={row.isPassed ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>#{row.attemptNumber}</TableCell>
                <TableCell>
                  {row.completedAt
                    ? format(new Date(row.completedAt), 'dd.MM.yyyy HH:mm')
                    : row.createdAt
                    ? format(new Date(row.createdAt), 'dd.MM.yyyy HH:mm')
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {data.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Нет попыток по тестам
        </Typography>
      )}
    </Box>
  )
}

function UserAchievementsTab({ userId }: { userId: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getUserAchievements(userId)
      .then((res) => {
        if (!cancelled) setData(Array.isArray(res.data) ? res.data : [])
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.message?.[0] || e?.message || 'Ошибка загрузки')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId])

  if (loading) return <CircularProgress sx={{ mt: 2 }} />
  if (error) return <Typography color="error">{error}</Typography>

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {data.map((a: any) => (
        <Grid item xs={12} sm={6} md={4} key={a.id}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <EmojiEvents color="primary" />
                <Typography variant="subtitle2">{a.achievementType || a.id}</Typography>
              </Stack>
              {a.unlockedAt && (
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(a.unlockedAt), 'dd.MM.yyyy')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
      {data.length === 0 && (
        <Grid item xs={12}>
          <Typography color="text.secondary">Нет достижений</Typography>
        </Grid>
      )}
    </Grid>
  )
}

function UserStreaksTab({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getUserStreaks(userId)
      .then((res) => {
        if (!cancelled) setData(res.data)
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.message?.[0] || e?.message || 'Ошибка загрузки')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId])

  if (loading) return <CircularProgress sx={{ mt: 2 }} />
  if (error) return <Typography color="error">{error}</Typography>
  if (!data) return null

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="caption" color="text.secondary">
            Текущий стрик
          </Typography>
          <Typography variant="h4">{data.currentStreak ?? 0} дней</Typography>
        </CardContent>
      </Card>
      {data.weeklyActivity?.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Активность за неделю
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {data.weeklyActivity.map((d: any) => (
                <Box
                  key={d.date}
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    bgcolor: (d.lessonsCompleted > 0 || d.exercisesCompleted > 0) ? 'action.selected' : 'action.hover',
                    minWidth: 80,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="caption" display="block">
                    {d.date}
                  </Typography>
                  <Typography variant="body2">
                    {d.lessonsCompleted ?? 0} ур. / {d.exercisesCompleted ?? 0} упр.
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  )
}

function UserProfileTab({ userId }: { userId: string }) {
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [oauthProviders, setOAuthProviders] = useState<any[]>([])
  const [studyPlan, setStudyPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getUserSubscriptions(userId),
      getUserOAuthProviders(userId),
      getUserStudyPlan(userId),
    ])
      .then(([subRes, oauthRes, planRes]) => {
        if (!cancelled) {
          setSubscriptions(Array.isArray(subRes.data) ? subRes.data : [])
          setOAuthProviders(Array.isArray(oauthRes.data) ? oauthRes.data : [])
          setStudyPlan(planRes.data)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.message?.[0] || e?.message || 'Ошибка загрузки')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId])

  if (loading) return <CircularProgress sx={{ mt: 2 }} />
  if (error) return <Typography color="error">{error}</Typography>

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Подписки
          </Typography>
          {subscriptions.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Платформа</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Начало</TableCell>
                    <TableCell>Окончание</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subscriptions.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.platform}</TableCell>
                      <TableCell>
                        <Chip size="small" label={s.status} />
                      </TableCell>
                      <TableCell>{s.startedAt ? format(new Date(s.startedAt), 'dd.MM.yyyy') : '—'}</TableCell>
                      <TableCell>{s.expiresAt ? format(new Date(s.expiresAt), 'dd.MM.yyyy') : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary">Нет подписок</Typography>
          )}
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            OAuth провайдеры
          </Typography>
          {oauthProviders.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Провайдер</TableCell>
                    <TableCell>Provider User ID</TableCell>
                    <TableCell>Email</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {oauthProviders.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Chip size="small" label={p.provider} />
                      </TableCell>
                      <TableCell>{p.providerUserId}</TableCell>
                      <TableCell>{p.email || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary">Нет привязанных провайдеров</Typography>
          )}
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            План обучения
          </Typography>
          {studyPlan ? (
            <Stack spacing={1}>
              <Typography variant="body2">Цель: {studyPlan.goalText || '—'}</Typography>
              <Typography variant="body2">Минут в день: {studyPlan.dailyMinutes}</Typography>
              <Typography variant="body2">Дней в неделю: {studyPlan.daysPerWeek}</Typography>
              {studyPlan.targetDate && (
                <Typography variant="body2">Целевая дата: {format(new Date(studyPlan.targetDate), 'dd.MM.yyyy')}</Typography>
              )}
            </Stack>
          ) : (
            <Typography color="text.secondary">Нет активного плана</Typography>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

function UserWordsTab({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getUserWordsSummary(userId)
      .then((res) => {
        if (!cancelled) setData(res.data)
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.message?.[0] || e?.message || 'Ошибка загрузки')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId])

  if (loading) return <CircularProgress sx={{ mt: 2 }} />
  if (error) return <Typography color="error">{error}</Typography>
  if (!data) return null

  const cardProgress = data.cardProgress || {}
  const byTheme = cardProgress.byTheme || []
  const quizAttempts = data.quizAttempts || []

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">Выучено карточек</Typography>
              <Typography variant="h5">{cardProgress.totalLearned ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">В процессе</Typography>
              <Typography variant="h5">{cardProgress.totalLearning ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">В избранном (словарь)</Typography>
              <Typography variant="h5">{data.dictionaryFavoritesCount ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Прогресс по темам
          </Typography>
          {byTheme.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Тема</TableCell>
                    <TableCell>Выучено</TableCell>
                    <TableCell>В процессе</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {byTheme.map((t: any) => (
                    <TableRow key={t.themeId}>
                      <TableCell>{t.themeTitle}</TableCell>
                      <TableCell>{t.learned}</TableCell>
                      <TableCell>{t.learning}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary">Нет прогресса по карточкам</Typography>
          )}
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Попытки квиза карточек
          </Typography>
          {quizAttempts.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Тема</TableCell>
                    <TableCell>Вопросов</TableCell>
                    <TableCell>Правильно</TableCell>
                    <TableCell>Неправильно</TableCell>
                    <TableCell>Дата</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quizAttempts.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.themeTitle}</TableCell>
                      <TableCell>{a.totalQuestions}</TableCell>
                      <TableCell>{a.correctCount}</TableCell>
                      <TableCell>{a.incorrectCount}</TableCell>
                      <TableCell>{a.createdAt ? format(new Date(a.createdAt), 'dd.MM.yyyy HH:mm') : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary">Нет попыток квиза</Typography>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}
