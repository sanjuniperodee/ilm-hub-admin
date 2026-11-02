import { useEffect, useState } from 'react'
import { Box, Button, Tab, Tabs } from '@mui/material'
import { Refresh } from '@mui/icons-material'
import { useSearchParams } from 'react-router-dom'
import { getDraftPushRules, getPushRuleVersions, getPushSegments, getUsers } from '../api/adminApi'
import { ErrorState, LoadingState, PageHeader, getErrorMessage } from '../components/ui'
import { PushComposer, type SegmentStats, type UserOption } from './push/PushComposer'
import { PushLogsPanel, usePushLogs } from './push/PushLogsPanel'
import { PushAutomation } from './push/PushAutomation'
import { usePushRules } from './push/usePushRules'

const TABS = [
  { value: 'send', label: 'Отправить сейчас' },
  { value: 'automation', label: 'Автоматизация' },
  { value: 'log', label: 'Журнал' },
] as const
type TabValue = (typeof TABS)[number]['value']

export default function PushNotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: TabValue = TABS.some((t) => t.value === tabParam) ? (tabParam as TabValue) : 'send'
  const setTab = (value: TabValue) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'send') next.delete('tab')
    else next.set('tab', value)
    setSearchParams(next, { replace: true })
  }

  const [segments, setSegments] = useState<SegmentStats | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const rules = usePushRules()
  const logs = usePushLogs()
  const { applyInitial } = rules

  const loadInitialData = async () => {
    setLoading(true)
    setError('')
    try {
      const [segmentsRes, usersRes, draftRes, versionsRes] = await Promise.all([
        getPushSegments(),
        getUsers({ page: 1, limit: 200 }),
        getDraftPushRules(),
        getPushRuleVersions(),
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
      applyInitial(draftRes.data, versionsRes.data)
    } catch (e) {
      setError(getErrorMessage(e, 'Не удалось загрузить данные для push'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSent = async () => {
    await getPushSegments()
      .then((res) => setSegments(res.data))
      .catch(() => {})
    await logs.loadPushLogs()
  }

  return (
    <>
      <PageHeader
        title="Push-уведомления"
        subtitle="Разовая рассылка, автоматические сценарии и журнал доставки."
        actions={
          <Button variant="outlined" startIcon={<Refresh />} onClick={loadInitialData} disabled={loading || rules.savingRules}>
            Обновить
          </Button>
        }
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="Разделы push" variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} id={`push-tab-${t.value}`} aria-controls={`push-panel-${t.value}`} />
          ))}
        </Tabs>
      </PageHeader>

      {loading && !rules.ruleSet ? (
        <LoadingState variant="form" label="Загружаем аудиторию и правила" />
      ) : error && !rules.ruleSet ? (
        <ErrorState title="Не удалось открыть push" error={error} onRetry={loadInitialData} />
      ) : (
        <>
          {error && <ErrorState variant="inline" error={error} onRetry={loadInitialData} sx={{ mb: 2 }} />}
          {/* Panels stay mounted so a half-written message or filters survive tab switches. */}
          <Box role="tabpanel" id="push-panel-send" aria-labelledby="push-tab-send" hidden={tab !== 'send'}>
            <PushComposer segments={segments} users={users} onSent={handleSent} />
          </Box>
          <Box role="tabpanel" id="push-panel-automation" aria-labelledby="push-tab-automation" hidden={tab !== 'automation'}>
            <PushAutomation rules={rules} />
          </Box>
          <Box role="tabpanel" id="push-panel-log" aria-labelledby="push-tab-log" hidden={tab !== 'log'}>
            <PushLogsPanel state={logs} />
          </Box>
        </>
      )}
    </>
  )
}
