import { useState } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, Tab, Tabs, Typography } from '@mui/material'
import { FactCheckOutlined, PublishOutlined } from '@mui/icons-material'
import { EmptyState, StatusChip, useConfirm } from '../../components/ui'
import { color, radius } from '../../theme/tokens'
import { PushRulesPanel } from './PushRulesPanel'
import { PushTemplatesPanel } from './PushTemplatesPanel'
import { PushVersionsPanel } from './PushVersionsPanel'
import type { PushRulesState } from './usePushRules'

type SubTab = 'rules' | 'texts' | 'versions'

export function PushAutomation({ rules }: { rules: PushRulesState }) {
  const { ruleSet, validation, setValidation, savingRules, validating, handleValidate, handlePublish, setSelectedScenarioKey } = rules
  const [sub, setSub] = useState<SubTab>('rules')
  const confirm = useConfirm()

  if (!ruleSet) {
    return <EmptyState title="Правила не загружены" description="Обновите страницу или создайте черновик во вкладке «Версии»." />
  }

  const onPublish = async () => {
    const ok = await confirm({
      title: `Опубликовать черновик v${ruleSet.version}?`,
      description: 'Автоматические рассылки сразу начнут работать по новым правилам и текстам. Прошлую версию можно будет вернуть откатом.',
      confirmLabel: 'Опубликовать',
    })
    if (ok) await handlePublish()
  }

  return (
    <Stack gap={2.5}>
      <Box
        sx={{
          p: 2,
          borderRadius: `${radius.lg}px`,
          border: 1,
          borderColor: color.warning.light,
          bgcolor: color.warning.soft,
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Box>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="subtitle1" component="h2">
                Черновик v{ruleSet.version}
              </Typography>
              <StatusChip status={ruleSet.status === 'published' ? 'published' : 'draft'} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: '72ch' }}>
              Правки сохраняются в черновик. Рассылки идут по опубликованной версии, пока вы не опубликуете черновик. Нужно право «Управление push».
            </Typography>
          </Box>
          <Stack direction="row" gap={1} flexShrink={0}>
            <Button
              variant="outlined"
              onClick={handleValidate}
              disabled={validating || savingRules}
              startIcon={validating ? <CircularProgress size={16} color="inherit" /> : <FactCheckOutlined />}
              sx={{ bgcolor: 'background.paper' }}
            >
              Проверить
            </Button>
            <Button
              variant="contained"
              onClick={onPublish}
              disabled={savingRules}
              startIcon={savingRules ? <CircularProgress size={16} color="inherit" /> : <PublishOutlined />}
            >
              Опубликовать
            </Button>
          </Stack>
        </Stack>
        {validation && (
          <Alert severity={validation.ok ? 'success' : 'error'} onClose={() => setValidation(null)} sx={{ mt: 1.5 }}>
            {validation.ok ? (
              'Черновик без ошибок, его можно публиковать.'
            ) : validation.errors.length > 1 ? (
              <>
                Исправьте перед публикацией:
                <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                  {validation.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </Box>
              </>
            ) : (
              validation.errors.join('; ')
            )}
          </Alert>
        )}
      </Box>

      <Tabs value={sub} onChange={(_, v) => setSub(v)} aria-label="Разделы автоматизации" sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40 }}>
        <Tab value="rules" label="Сегменты и сценарии" sx={{ minHeight: 40 }} />
        <Tab value="texts" label="Тексты" sx={{ minHeight: 40 }} />
        <Tab value="versions" label="Версии" sx={{ minHeight: 40 }} />
      </Tabs>

      {sub === 'rules' && (
        <PushRulesPanel
          rules={rules}
          onOpenTexts={(key) => {
            setSelectedScenarioKey(key)
            setSub('texts')
          }}
        />
      )}
      {sub === 'texts' && <PushTemplatesPanel rules={rules} />}
      {sub === 'versions' && <PushVersionsPanel rules={rules} />}
    </Stack>
  )
}
