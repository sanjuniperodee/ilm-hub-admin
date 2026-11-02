import { useCallback } from 'react'
import { Box, LinearProgress, Stack, Typography } from '@mui/material'
import { CheckCircleOutline, HighlightOff, LinkOutlined } from '@mui/icons-material'
import { getUserLearningSummary, getUserOAuthProviders } from '../../api/adminApi'
import { EmptyState, ErrorState, LoadingState, SectionCard, StatCard, StatGroup, StatusChip } from '../../components/ui'
import { InfoList } from './InfoList'
import { useLoad } from './useLoad'
import { formatDateTime, formatRelative, PROVIDER_LABELS } from './userLabels'

const LANGUAGE_LABELS: Record<string, string> = { ru: 'Русский', kz: 'Қазақша', kk: 'Қазақша', ar: 'العربية', en: 'English' }

function OnOff({ on, label }: { on?: boolean; label: string }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} sx={{ py: 1 }}>
      <Typography variant="body1">{label}</Typography>
      <Stack direction="row" alignItems="center" gap={0.75} sx={{ color: on ? 'success.main' : 'text.secondary', flexShrink: 0 }}>
        {on ? <CheckCircleOutline fontSize="small" aria-hidden /> : <HighlightOff fontSize="small" aria-hidden />}
        <Typography variant="body2" sx={{ color: 'inherit', fontWeight: 500 }}>
          {on ? 'Включено' : 'Выключено'}
        </Typography>
      </Stack>
    </Stack>
  )
}

function LearningSummary({ userId }: { userId: string }) {
  const load = useCallback(() => getUserLearningSummary(userId).then((r) => r.data), [userId])
  const { data, loading, error, reload } = useLoad<any>(load)

  if (error) return <ErrorState variant="inline" title="Не удалось загрузить сводку обучения" error={error} onRetry={reload} />
  const progress = data?.overallProgress ?? 0
  return (
    <StatGroup title="Обучение коротко" columns={{ xs: 2, sm: 3, lg: 6 }}>
      <StatCard variant="plain" loading={loading} label="Уровень" value={data?.level || '—'} />
      <StatCard
        variant="plain"
        loading={loading}
        label="Уроки"
        value={`${data?.lessonsCompleted ?? 0} / ${data?.totalLessons ?? 0}`}
        hint={
          <Box component="span" sx={{ display: 'block' }}>
            <LinearProgress variant="determinate" value={progress} sx={{ mt: 0.5, mb: 0.5 }} aria-label={`Прогресс ${progress}%`} />
            {progress}% программы
          </Box>
        }
      />
      <StatCard variant="plain" loading={loading} label="Тесты сданы" value={`${data?.testsPassed ?? 0} / ${data?.testsTotal ?? 0}`} />
      <StatCard variant="plain" loading={loading} label="Серия" value={`${data?.streak ?? 0} дн.`} />
      <StatCard variant="plain" loading={loading} label="Очки" value={(data?.totalPoints ?? 0).toLocaleString('ru-RU')} />
      <StatCard variant="plain" loading={loading} label="Достижения" value={data?.achievementsCount ?? 0} />
    </StatGroup>
  )
}

function AuthProviders({ userId, email }: { userId: string; email?: string }) {
  const load = useCallback(
    () => getUserOAuthProviders(userId).then((r) => (Array.isArray(r.data) ? r.data : [])),
    [userId],
  )
  const { data, loading, error, reload } = useLoad<any[]>(load)

  return (
    <SectionCard title="Способы входа" description="Аккаунты Google и Apple, привязанные к пользователю.">
      {loading && !data ? (
        <LoadingState variant="list" rows={2} minHeight={0} />
      ) : error ? (
        <ErrorState variant="inline" error={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<LinkOutlined />}
          title="Внешних аккаунтов нет"
          description={email ? `Вход по email ${email}.` : 'Пользователь входит по email.'}
        />
      ) : (
        <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
          {data.map((p: any) => (
            <Stack key={p.id} gap={0.5} sx={{ py: 1.25 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {PROVIDER_LABELS[p.provider] ?? p.provider}
                </Typography>
                <StatusChip label="Привязан" tone="success" />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                {p.email || 'Email не передан провайдером'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}>
                ID у провайдера: {p.providerUserId}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </SectionCard>
  )
}

export function UserOverviewTab({ user }: { user: any }) {
  return (
    <Stack gap={3}>
      <LearningSummary userId={user.id} />

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }, alignItems: 'start' }}>
        <Stack gap={3}>
          <SectionCard title="Профиль">
            <InfoList
              columns={3}
              items={[
                {
                  label: 'Email',
                  value: (
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" component="span">
                      <span>{user.email}</span>
                      <StatusChip label={user.emailVerified ? 'Подтверждён' : 'Не подтверждён'} tone={user.emailVerified ? 'success' : 'warning'} />
                    </Stack>
                  ),
                  wide: true,
                },
                { label: 'Телефон', value: user.phone },
                { label: 'Язык приложения', value: user.language ? LANGUAGE_LABELS[user.language] ?? user.language : null },
                { label: 'Страна', value: user.country },
                { label: 'Уровень', value: user.level },
                { label: 'Цель в день', value: user.dailyGoalMinutes != null ? `${user.dailyGoalMinutes} мин` : null },
                { label: 'Источник привлечения', value: user.attributionSource },
                { label: 'Мотивация', value: Array.isArray(user.motivation) && user.motivation.length ? user.motivation.join(', ') : null, wide: true },
                { label: 'Зарегистрирован', value: formatDateTime(user.createdAt) },
                {
                  label: 'Последняя активность',
                  value: user.lastActiveAt ? `${formatDateTime(user.lastActiveAt)} (${formatRelative(user.lastActiveAt)})` : null,
                },
              ]}
            />
          </SectionCard>
        </Stack>

        <Stack gap={3}>
          <AuthProviders userId={user.id} email={user.email} />
          <SectionCard title="Уведомления" description="Настройки из профиля в приложении.">
            <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />} sx={{ mt: -1, mb: -1 }}>
              <OnOff on={user.pushEnabled} label="Push-уведомления" />
              <OnOff on={user.emailNotifications} label="Письма" />
              <OnOff on={user.studyReminders} label="Напоминания о занятиях" />
            </Stack>
          </SectionCard>
        </Stack>
      </Box>
    </Stack>
  )
}
