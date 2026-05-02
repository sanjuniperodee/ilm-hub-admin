import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { NotificationsActiveOutlined, SendOutlined } from '@mui/icons-material'
import {
  getPushSegments,
  getUsers,
  sendManualPush,
  type PushSegment,
  type PushTarget,
} from '../api/adminApi'

type UserOption = {
  id: string
  email: string
  name?: string
  isPremium?: boolean
  pushEnabled?: boolean
}

const segmentLabels: Record<PushSegment, string> = {
  all: 'Все с push-токеном',
  free: 'Free',
  paid_no_plan: 'Premium без плана',
  paid_with_plan: 'Premium с учебным планом',
}

export default function PushNotificationsPage() {
  const [target, setTarget] = useState<PushTarget>('segment')
  const [segment, setSegment] = useState<PushSegment>('all')
  const [segments, setSegments] = useState<Record<PushSegment, { users: number; tokens: number }> | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([])
  const [title, setTitle] = useState('ILM HUB')
  const [body, setBody] = useState('')
  const [route, setRoute] = useState('/home')
  const [respectUserSettings, setRespectUserSettings] = useState(true)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    setError('')
    try {
      const [segmentsRes, usersRes] = await Promise.all([
        getPushSegments(),
        getUsers({ page: 1, limit: 200 }),
      ])
      setSegments(segmentsRes.data)
      const list = Array.isArray(usersRes.data?.data) ? usersRes.data.data : []
      setUsers(
        list.map((u: any) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          isPremium: u.isPremium,
          pushEnabled: u.pushEnabled,
        })),
      )
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Не удалось загрузить данные для push')
    } finally {
      setLoading(false)
    }
  }

  const selectedSegmentStats = segments?.[segment]
  const recipientHint = useMemo(() => {
    if (target === 'users') {
      return `${selectedUsers.length} выбранных пользователей`
    }
    if (!selectedSegmentStats) return 'Аудитория загружается'
    return `${selectedSegmentStats.users} пользователей, ${selectedSegmentStats.tokens} устройств`
  }, [selectedSegmentStats, selectedUsers.length, target])

  const canSend = title.trim().length > 0 && body.trim().length > 0 && (target === 'segment' || selectedUsers.length > 0)

  const handleSend = async () => {
    if (!canSend) return
    setSending(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await sendManualPush({
        target,
        segment: target === 'segment' ? segment : undefined,
        userIds: target === 'users' ? selectedUsers.map((u) => u.id) : undefined,
        title: title.trim(),
        body: body.trim(),
        route: route.trim() || '/home',
        respectUserSettings,
      })
      setSuccess(
        `Отправлено: ${data.successCount ?? 0} устройств. Аудитория: ${data.targetedUsers ?? 0} пользователей, ${data.targetedTokens ?? 0} токенов.`,
      )
      await getPushSegments().then((res) => setSegments(res.data)).catch(() => {})
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Не удалось отправить push')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="420px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box className="animate-fade-in">
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Push-уведомления
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Ручная отправка конкретным пользователям или сегментам
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={loadInitialData}
          disabled={sending}
          sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}
        >
          Обновить аудиторию
        </Button>
      </Stack>

      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="stretch">
          <Paper sx={{ p: 2.5, flex: 1 }}>
            <Stack spacing={2.25}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <NotificationsActiveOutlined color="primary" />
                <Typography variant="h6">Аудитория</Typography>
              </Stack>

              <RadioGroup row value={target} onChange={(e) => setTarget(e.target.value as PushTarget)}>
                <FormControlLabel value="segment" control={<Radio />} label="Сегмент" />
                <FormControlLabel value="users" control={<Radio />} label="Пользователи" />
              </RadioGroup>

              {target === 'segment' ? (
                <FormControl fullWidth>
                  <InputLabel>Сегмент</InputLabel>
                  <Select value={segment} label="Сегмент" onChange={(e) => setSegment(e.target.value as PushSegment)}>
                    {(Object.keys(segmentLabels) as PushSegment[]).map((key) => (
                      <MenuItem key={key} value={key}>
                        {segmentLabels[key]} · {segments?.[key]?.users ?? 0} users / {segments?.[key]?.tokens ?? 0} tokens
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Autocomplete
                  multiple
                  options={users}
                  value={selectedUsers}
                  onChange={(_, value) => setSelectedUsers(value)}
                  getOptionLabel={(option) => `${option.name || 'Без имени'} · ${option.email}`}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip label={option.email} size="small" {...getTagProps({ index })} />
                    ))
                  }
                  renderInput={(params) => <TextField {...params} label="Пользователи" placeholder="Email или имя" />}
                />
              )}

              <FormControlLabel
                control={
                  <Switch
                    checked={respectUserSettings}
                    onChange={(e) => setRespectUserSettings(e.target.checked)}
                  />
                }
                label="Учитывать настройку Push в профиле пользователя"
              />

              <Alert severity="info" icon={false}>
                Получатели: {recipientHint}
              </Alert>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2.5, flex: 1.2 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Сообщение</Typography>
              <TextField label="Заголовок" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
              <TextField
                label="Текст"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                fullWidth
                multiline
                minRows={4}
                inputProps={{ maxLength: 240 }}
                helperText={`${body.length}/240`}
              />
              <TextField
                label="Route при открытии"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                fullWidth
                placeholder="/home"
              />
              <Divider />
              <Button
                variant="contained"
                size="large"
                startIcon={sending ? <CircularProgress color="inherit" size={18} /> : <SendOutlined />}
                onClick={handleSend}
                disabled={!canSend || sending}
                sx={{ alignSelf: { xs: 'stretch', sm: 'flex-end' } }}
              >
                Отправить push
              </Button>
            </Stack>
          </Paper>
        </Stack>

        {segments && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            {(Object.keys(segmentLabels) as PushSegment[]).map((key) => (
              <Card key={key} sx={{ flex: 1 }}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="body2" color="text.secondary">
                    {segmentLabels[key]}
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.5 }}>
                    {segments[key].users}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {segments[key].tokens} устройств
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
