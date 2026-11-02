import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams, Link as RouterLink } from 'react-router-dom'
import { Button, Stack, Tab, Tabs } from '@mui/material'
import { ContentCopyOutlined, PersonSearchOutlined } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { getUserById, type UserRole } from '../api/adminApi'
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusChip, useShellBreadcrumbs } from '../components/ui'
import { RoleChip, UserAvatar } from './users/UserChips'
import { formatDate, subscriptionStatusInfo } from './users/userLabels'
import { UserOverviewTab } from './users/UserOverviewTab'
import { UserSubscriptionTab } from './users/UserSubscriptionTab'
import { UserLearningTab } from './users/UserLearningTab'
import { UserTestsTab } from './users/UserTestsTab'
import { UserWordsTab } from './users/UserWordsTab'
import { UserRoleTab } from './users/UserRoleTab'

const TABS = [
  { value: 'overview', label: 'Обзор' },
  { value: 'subscription', label: 'Подписка' },
  { value: 'learning', label: 'Обучение' },
  { value: 'tests', label: 'Тесты' },
  { value: 'words', label: 'Слова' },
  { value: 'role', label: 'Роль' },
] as const

type TabValue = (typeof TABS)[number]['value']

export default function UserDetailPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const tabParam = searchParams.get('tab')
  const tab: TabValue = TABS.some((t) => t.value === tabParam) ? (tabParam as TabValue) : 'overview'
  const setTab = (value: TabValue) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'overview') next.delete('tab')
    else next.set('tab', value)
    setSearchParams(next, { replace: true })
  }

  const fetchUser = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const response = await getUserById(id)
      setUser(response.data)
    } catch (e) {
      console.error('Error fetching user:', e)
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const displayName = user ? user.name || user.email : null
  useShellBreadcrumbs([{ label: 'Пользователи', to: '/users' }, { label: displayName || 'Пользователь' }])

  if (loading && !user) return <LoadingState variant="page" label="Загружаем профиль пользователя" />

  if (!user) {
    const notFound = (error as { response?: { status?: number } } | null)?.response?.status === 404 || !error
    return notFound ? (
      <EmptyState
        icon={<PersonSearchOutlined />}
        title="Пользователь не найден"
        description="Возможно, аккаунт удалён или ссылка устарела."
        action={
          <Button variant="contained" component={RouterLink} to="/users">
            К списку пользователей
          </Button>
        }
      />
    ) : (
      <ErrorState title="Не удалось загрузить пользователя" error={error} onRetry={fetchUser} />
    )
  }

  const copyId = () => {
    navigator.clipboard
      ?.writeText(user.id)
      .then(() => toast.success('ID пользователя скопирован'))
      .catch(() => toast.error('Не удалось скопировать ID'))
  }

  return (
    <>
      <PageHeader
        backTo="/users"
        backLabel="К списку пользователей"
        title={
          <Stack direction="row" alignItems="center" gap={1.5} component="span">
            <UserAvatar name={user.name} email={user.email} src={user.avatarUrl} size={40} />
            <span>{displayName}</span>
          </Stack>
        }
        status={
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <StatusChip status={user.isPremium ? 'premium' : 'free'} />
            {user.subscriptionStatus && !['free', 'active'].includes(user.subscriptionStatus) && (
              <StatusChip {...subscriptionStatusInfo(user.subscriptionStatus)} />
            )}
            <RoleChip role={user.role} />
          </Stack>
        }
        subtitle={`${user.name ? `${user.email}. ` : ''}Зарегистрирован ${formatDate(user.createdAt)}`}
        actions={
          <Button variant="outlined" startIcon={<ContentCopyOutlined />} onClick={copyId}>
            Скопировать ID
          </Button>
        }
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Разделы профиля пользователя"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} id={`user-tab-${t.value}`} aria-controls={`user-tabpanel-${t.value}`} />
          ))}
        </Tabs>
      </PageHeader>

      <div role="tabpanel" id={`user-tabpanel-${tab}`} aria-labelledby={`user-tab-${tab}`}>
        {tab === 'overview' && <UserOverviewTab user={user} />}
        {tab === 'subscription' && <UserSubscriptionTab user={user} />}
        {tab === 'learning' && <UserLearningTab userId={user.id} />}
        {tab === 'tests' && <UserTestsTab userId={user.id} />}
        {tab === 'words' && <UserWordsTab userId={user.id} />}
        {tab === 'role' && (
          <UserRoleTab user={user} onRoleChanged={(role: UserRole) => setUser((u: any) => ({ ...u, role }))} />
        )}
      </div>
    </>
  )
}
