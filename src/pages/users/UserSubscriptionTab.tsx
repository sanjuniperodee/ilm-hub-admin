import { useCallback } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { WorkspacePremiumOutlined } from '@mui/icons-material'
import { getUserSubscriptions } from '../../api/adminApi'
import { DataTable, EmptyState, SectionCard, StatusChip, type DataTableColumn } from '../../components/ui'
import { color, radius } from '../../theme/tokens'
import { InfoList } from './InfoList'
import { useLoad } from './useLoad'
import { flushTableSx, formatDate, formatRelative, PLATFORM_LABELS, subscriptionStatusInfo } from './userLabels'

interface SubscriptionRow {
  id: string
  platform: string
  productId?: string
  status: string
  startedAt?: string
  expiresAt?: string
  createdAt?: string
}

function AccessBanner({ user, latest }: { user: any; latest?: SubscriptionRow }) {
  const premium = Boolean(user.isPremium)
  const status = subscriptionStatusInfo(user.subscriptionStatus)
  const expires = user.subscriptionExpiresAt
  const expired = expires ? new Date(expires).getTime() < Date.now() : false

  return (
    <SectionCard>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={3} alignItems={{ md: 'center' }}>
        <Stack direction="row" alignItems="center" gap={2} sx={{ flex: '0 0 auto', minWidth: { md: 280 } }}>
          <Box
            aria-hidden
            sx={{
              width: 56,
              height: 56,
              borderRadius: `${radius.lg}px`,
              display: 'grid',
              placeItems: 'center',
              bgcolor: premium ? color.gold[100] : 'surface.sunken',
              color: premium ? color.gold[800] : 'text.secondary',
              border: 1,
              borderColor: premium ? color.gold[300] : 'divider',
            }}
          >
            <WorkspacePremiumOutlined sx={{ fontSize: 30 }} />
          </Box>
          <Box>
            <Typography variant="h6" component="p">
              {premium ? 'Premium открыт' : 'Бесплатный доступ'}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <StatusChip status={premium ? 'premium' : 'free'} size="medium" />
            </Box>
          </Box>
        </Stack>

        <InfoList
          columns={3}
          sx={{ flex: 1, pt: { xs: 2, md: 0 }, pl: { md: 3 }, borderTop: { xs: 1, md: 0 }, borderLeft: { md: 1 }, borderColor: 'divider' }}
          items={[
            { label: 'Статус подписки', value: <StatusChip label={status.label} tone={status.tone} /> },
            {
              label: expired ? 'Доступ закончился' : 'Доступ до',
              value: expires ? (
                <>
                  {formatDate(expires)}
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                    {formatRelative(expires)}
                  </Typography>
                </>
              ) : null,
            },
            {
              label: 'Магазин',
              value: latest ? PLATFORM_LABELS[latest.platform] ?? latest.platform : null,
            },
          ]}
        />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5 }}>
        Premium открывает сервер: активная подписка или льготный период после неудачного списания. Оплата и цены — только в App Store и Google Play, вернуть деньги можно там же.
      </Typography>
    </SectionCard>
  )
}

export function UserSubscriptionTab({ user }: { user: any }) {
  const load = useCallback(
    () => getUserSubscriptions(user.id).then((r) => (Array.isArray(r.data) ? (r.data as SubscriptionRow[]) : [])),
    [user.id],
  )
  const { data, loading, error, reload } = useLoad<SubscriptionRow[]>(load)

  const columns: DataTableColumn<SubscriptionRow>[] = [
    {
      id: 'platform',
      header: 'Магазин',
      render: (s) => (
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {PLATFORM_LABELS[s.platform] ?? s.platform}
          </Typography>
          {s.productId && (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}>
              {s.productId}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'status',
      header: 'Статус',
      render: (s) => {
        const info = subscriptionStatusInfo(s.status)
        return <StatusChip label={info.label} tone={info.tone} />
      },
    },
    { id: 'startedAt', header: 'Начало', nowrap: true, render: (s) => formatDate(s.startedAt) },
    { id: 'expiresAt', header: 'Окончание', nowrap: true, render: (s) => formatDate(s.expiresAt) },
    { id: 'createdAt', header: 'Запись создана', nowrap: true, hideBelow: 'md', render: (s) => formatDate(s.createdAt) },
  ]

  return (
    <Stack gap={3}>
      <AccessBanner user={user} latest={data?.[0]} />
      <SectionCard title="История подписок" description="Все покупки пользователя, новые сверху." padding="none">
        <DataTable
          aria-label="История подписок"
          columns={columns}
          rows={data}
          getRowId={(s) => s.id}
          loading={loading}
          error={error}
          onRetry={reload}
          sx={flushTableSx}
          emptyState={
            <EmptyState size="sm" title="Подписок не было" description="Пользователь ещё не покупал Premium в приложении." />
          }
        />
      </SectionCard>
    </Stack>
  )
}
