import { useCallback } from 'react'
import { Stack } from '@mui/material'
import { getUserWordsSummary } from '../../api/adminApi'
import { DataTable, EmptyState, ErrorState, SectionCard, StatCard, StatGroup, type DataTableColumn } from '../../components/ui'
import { useLoad } from './useLoad'
import { flushTableSx, formatDateTime } from './userLabels'

export function UserWordsTab({ userId }: { userId: string }) {
  const load = useCallback(() => getUserWordsSummary(userId).then((r) => r.data ?? null), [userId])
  const { data, loading, error, reload } = useLoad<any>(load)

  if (error) return <ErrorState title="Не удалось загрузить слова пользователя" error={error} onRetry={reload} />

  const cardProgress = data?.cardProgress || {}
  const byTheme: any[] = cardProgress.byTheme || []
  const quizAttempts: any[] = data?.quizAttempts || []

  const themeColumns: DataTableColumn<any>[] = [
    { id: 'themeTitle', header: 'Тема', sortable: true },
    { id: 'learned', header: 'Выучено', align: 'right', sortable: true },
    { id: 'learning', header: 'В процессе', align: 'right', sortable: true },
  ]
  const quizColumns: DataTableColumn<any>[] = [
    { id: 'themeTitle', header: 'Тема' },
    { id: 'totalQuestions', header: 'Вопросов', align: 'right' },
    { id: 'correctCount', header: 'Верно', align: 'right' },
    { id: 'incorrectCount', header: 'Ошибок', align: 'right' },
    {
      id: 'createdAt',
      header: 'Дата',
      nowrap: true,
      sortable: true,
      sortValue: (a) => new Date(a.createdAt || 0),
      render: (a) => formatDateTime(a.createdAt),
    },
  ]

  return (
    <Stack gap={3}>
      <StatGroup title="Карточки слов" columns={{ xs: 1, sm: 3, lg: 3 }}>
        <StatCard variant="plain" loading={loading} label="Выучено карточек" value={cardProgress.totalLearned ?? 0} />
        <StatCard variant="plain" loading={loading} label="В процессе" value={cardProgress.totalLearning ?? 0} />
        <StatCard variant="plain" loading={loading} label="В избранном словаря" value={data?.dictionaryFavoritesCount ?? 0} />
      </StatGroup>

      <SectionCard title="Прогресс по темам" padding="none">
        <DataTable
          aria-label="Прогресс по темам карточек"
          columns={themeColumns}
          rows={byTheme}
          getRowId={(t) => t.themeId}
          loading={loading}
          dense
          sx={flushTableSx}
          emptyState={<EmptyState size="sm" title="Карточки ещё не изучались" />}
        />
      </SectionCard>

      <SectionCard title="Квизы по карточкам" padding="none">
        <DataTable
          aria-label="Попытки квиза по карточкам"
          columns={quizColumns}
          rows={quizAttempts}
          getRowId={(a) => a.id}
          loading={loading}
          dense
          pagination
          initialRowsPerPage={10}
          defaultSort={{ by: 'createdAt', direction: 'desc' }}
          sx={flushTableSx}
          emptyState={<EmptyState size="sm" title="Квизов ещё не было" />}
        />
      </SectionCard>
    </Stack>
  )
}
