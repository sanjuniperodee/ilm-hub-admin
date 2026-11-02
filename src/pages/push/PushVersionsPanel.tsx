import { Button, Stack, Typography } from '@mui/material'
import { HistoryOutlined, NoteAddOutlined } from '@mui/icons-material'
import type { PushRuleVersion } from '../../api/adminApi'
import { DataTable, EmptyState, SectionCard, StatusChip, useConfirm, type DataTableColumn } from '../../components/ui'
import { flushTableSx } from '../users/userLabels'
import { formatPushDate } from './pushLabels'
import type { PushRulesState } from './usePushRules'

export function PushVersionsPanel({ rules }: { rules: PushRulesState }) {
  const { versions, savingRules, handleCreateDraft, handleRollback } = rules
  const confirm = useConfirm()

  const onRollback = async () => {
    const ok = await confirm({
      title: 'Откатить правила к прошлой версии?',
      description: 'Рассылки сразу начнут работать по предыдущей опубликованной версии. Текущая опубликованная версия уйдёт в архив.',
      confirmLabel: 'Откатить',
      destructive: true,
    })
    if (ok) await handleRollback()
  }

  const columns: DataTableColumn<PushRuleVersion>[] = [
    { id: 'version', header: 'Версия', nowrap: true, render: (v) => <Typography variant="body2" sx={{ fontWeight: 600 }}>v{v.version}</Typography> },
    {
      id: 'status',
      header: 'Статус',
      render: (v) =>
        v.status === 'published' || v.status === 'draft' || v.status === 'archived' ? <StatusChip status={v.status} /> : <StatusChip label={v.status} />,
    },
    { id: 'name', header: 'Название', render: (v) => v.name || '—' },
    { id: 'publishedAt', header: 'Опубликована', nowrap: true, render: (v) => formatPushDate(v.publishedAt) },
    { id: 'updatedAt', header: 'Изменена', nowrap: true, hideBelow: 'md', render: (v) => formatPushDate(v.updatedAt) },
  ]

  return (
    <Stack gap={3}>
      <SectionCard
        title="Черновик и откат"
        description="Создайте черновик из опубликованной версии, чтобы начать правки заново, или верните предыдущую версию, если новая работает плохо."
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
          <Button variant="outlined" startIcon={<NoteAddOutlined />} onClick={handleCreateDraft} disabled={savingRules}>
            Создать или обновить черновик
          </Button>
          <Button variant="outlined" color="error" startIcon={<HistoryOutlined />} onClick={onRollback} disabled={savingRules}>
            Откатить к прошлой версии
          </Button>
        </Stack>
      </SectionCard>
      <SectionCard title="История версий" padding="none">
        <DataTable
          aria-label="Версии правил push"
          columns={columns}
          rows={versions}
          getRowId={(v) => v.id}
          dense
          sx={flushTableSx}
          emptyState={<EmptyState size="sm" title="Версий пока нет" description="Опубликуйте черновик, чтобы появилась первая версия." />}
        />
      </SectionCard>
    </Stack>
  )
}
