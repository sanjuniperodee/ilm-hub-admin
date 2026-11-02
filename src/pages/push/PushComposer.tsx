import { useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { GroupsOutlined, PersonOutlined, SendOutlined } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { sendManualPush, type PushSegment, type PushTarget } from '../../api/adminApi'
import { FormSection, SectionCard, getErrorMessage, useConfirm } from '../../components/ui'
import { color, radius } from '../../theme/tokens'
import { PushPhonePreview } from './PushPhonePreview'
import { devicesWord, plural, segmentDescriptions, segmentLabels, usersWord } from './pushLabels'

export type UserOption = {
  id: string
  email: string
  name?: string
  isPremium?: boolean
  pushEnabled?: boolean
}

export type SegmentStats = Record<PushSegment, { users: number; tokens: number }>

interface PushComposerProps {
  segments: SegmentStats | null
  users: UserOption[]
  /** Called after a successful send: refresh audience counts and the log. */
  onSent: () => Promise<void>
}

const BODY_MAX = 240

export function PushComposer({ segments, users, onSent }: PushComposerProps) {
  const confirm = useConfirm()
  const [target, setTarget] = useState<PushTarget>('segment')
  const [segment, setSegment] = useState<PushSegment>('all')
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([])
  const [title, setTitle] = useState('ILM HUB')
  const [body, setBody] = useState('')
  const [route, setRoute] = useState('/home')
  const [respectUserSettings, setRespectUserSettings] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string>('')
  const [sendError, setSendError] = useState('')

  const selectedSegmentStats = segments?.[segment]
  const recipientHint = useMemo(() => {
    if (target === 'users') return plural(selectedUsers.length, ['выбранный пользователь', 'выбранных пользователя', 'выбранных пользователей'])
    if (!selectedSegmentStats) return 'аудитория загружается'
    return `${plural(selectedSegmentStats.users, usersWord)}, ${plural(selectedSegmentStats.tokens, devicesWord)}`
  }, [selectedSegmentStats, selectedUsers.length, target])

  const canSend = title.trim().length > 0 && body.trim().length > 0 && (target === 'segment' || selectedUsers.length > 0)

  const missing = !title.trim()
    ? 'Введите заголовок'
    : !body.trim()
      ? 'Введите текст уведомления'
      : target === 'users' && selectedUsers.length === 0
        ? 'Выберите хотя бы одного пользователя'
        : ''

  const handleSend = async () => {
    if (!canSend) return
    const ok = await confirm({
      title: 'Отправить push сейчас?',
      description: `${target === 'segment' ? `Сегмент «${segmentLabels[segment]}»: ` : ''}${recipientHint}. Отменить отправку будет нельзя.`,
      confirmLabel: 'Отправить push',
    })
    if (!ok) return
    setSending(true)
    setSendError('')
    setResult('')
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
      const summary = `Доставлено на ${plural(data.successCount ?? 0, devicesWord)}. Аудитория: ${plural(data.targetedUsers ?? 0, usersWord)}, ${plural(data.targetedTokens ?? 0, ['токен', 'токена', 'токенов'])}.`
      setResult(summary)
      toast.success('Push отправлен')
      await onSent()
    } catch (e) {
      const message = getErrorMessage(e, 'Не удалось отправить push')
      setSendError(message)
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 320px' }, alignItems: 'start' }}>
      <SectionCard
        title="Новое уведомление"
        description="Уходит сразу после подтверждения. Для регулярных рассылок настройте сценарий во вкладке «Автоматизация»."
        footer={
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1.5}>
            <Box aria-live="polite">
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Получатели: {recipientHint}
              </Typography>
              {missing && (
                <Typography variant="caption" color="text.secondary">
                  {missing}
                </Typography>
              )}
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={sending ? <CircularProgress color="inherit" size={18} /> : <SendOutlined />}
              onClick={handleSend}
              disabled={!canSend || sending}
            >
              Отправить push
            </Button>
          </Stack>
        }
      >
        <FormSection title="Кому" description="Сегмент считается по подписке и учебному плану." divider={false} layout="stacked">
          <Stack gap={2}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={target}
              onChange={(_, v: PushTarget | null) => v && setTarget(v)}
              aria-label="Тип аудитории"
              sx={{ alignSelf: 'flex-start' }}
            >
              <ToggleButton value="segment" sx={{ px: 2, gap: 1 }}>
                <GroupsOutlined fontSize="small" /> Сегмент
              </ToggleButton>
              <ToggleButton value="users" sx={{ px: 2, gap: 1 }}>
                <PersonOutlined fontSize="small" /> Выбранные пользователи
              </ToggleButton>
            </ToggleButtonGroup>

            {target === 'segment' ? (
              <RadioGroup
                aria-label="Сегмент"
                value={segment}
                onChange={(e) => setSegment(e.target.value as PushSegment)}
                sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}
              >
                {(Object.keys(segmentLabels) as PushSegment[]).map((key) => {
                  const active = key === segment
                  const stats = segments?.[key]
                  return (
                    <FormControlLabel
                      key={key}
                      value={key}
                      control={<Radio size="small" sx={{ mt: -0.25 }} />}
                      sx={{
                        m: 0,
                        alignItems: 'flex-start',
                        px: 1.5,
                        py: 1.25,
                        border: 1,
                        borderRadius: `${radius.md}px`,
                        borderColor: active ? 'primary.main' : 'divider',
                        bgcolor: active ? color.bronze[50] : 'transparent',
                        transition: 'border-color 120ms, background-color 120ms',
                      }}
                      label={
                        <Box sx={{ pt: 0.5 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {segmentLabels[key]}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {segmentDescriptions[key]}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                            {stats ? `${plural(stats.users, usersWord)}, ${plural(stats.tokens, devicesWord)}` : '—'}
                          </Typography>
                        </Box>
                      }
                    />
                  )
                })}
              </RadioGroup>
            ) : (
              <Autocomplete
                multiple
                options={users}
                value={selectedUsers}
                onChange={(_, value) => setSelectedUsers(value)}
                getOptionLabel={(option) => `${option.name || 'Без имени'} · ${option.email}`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => <Chip label={option.email} size="small" {...getTagProps({ index })} key={option.id} />)
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Пользователи"
                    placeholder="Email или имя"
                    helperText={`В списке ${users.length} последних зарегистрированных пользователей`}
                  />
                )}
              />
            )}

            <FormControlLabel
              control={<Switch checked={respectUserSettings} onChange={(e) => setRespectUserSettings(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body1">Учитывать настройку push в профиле</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Не отправлять тем, кто выключил уведомления в приложении.
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', m: 0, '& .MuiSwitch-root': { mt: -0.5 } }}
            />
          </Stack>
        </FormSection>

        <FormSection title="Сообщение" layout="stacked">
          <Stack gap={2}>
            <TextField label="Заголовок" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth required />
            <TextField
              label="Текст"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              fullWidth
              required
              multiline
              minRows={4}
              inputProps={{ maxLength: BODY_MAX }}
              helperText={`${body.length} из ${BODY_MAX} символов`}
            />
            <TextField
              label="Экран при открытии"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              fullWidth
              placeholder="/home"
              helperText="Путь в приложении, например /home. Пусто — главная."
            />
          </Stack>
        </FormSection>

        {(result || sendError) && (
          <Alert
            severity={sendError ? 'error' : 'success'}
            onClose={() => {
              setResult('')
              setSendError('')
            }}
            sx={{ mt: 2 }}
          >
            {sendError || result}
          </Alert>
        )}
      </SectionCard>

      <Box sx={{ position: { lg: 'sticky' }, top: { lg: 80 } }}>
        <PushPhonePreview title={title} body={body} route={route} />
      </Box>
    </Box>
  )
}
