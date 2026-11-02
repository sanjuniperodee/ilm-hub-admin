import { useCallback, useState } from 'react'
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material'
import { getUserTestsAttempts } from '../../api/adminApi'
import { DataTable, EmptyState, StatusChip, Toolbar, type DataTableColumn } from '../../components/ui'
import { useLoad } from './useLoad'
import { formatDateTime, TEST_TYPE_LABELS } from './userLabels'

export function UserTestsTab({ userId }: { userId: string }) {
  const [testTypeFilter, setTestTypeFilter] = useState('')
  const load = useCallback(
    () =>
      getUserTestsAttempts(userId, testTypeFilter ? { testType: testTypeFilter } : undefined).then((r) =>
        Array.isArray(r.data) ? r.data : [],
      ),
    [userId, testTypeFilter],
  )
  const { data, loading, error, reload } = useLoad<any[]>(load)

  const columns: DataTableColumn<any>[] = [
    {
      id: 'title',
      header: 'Тест',
      minWidth: 220,
      render: (row) => (
        <Typography variant="body1" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
          {row.titleRu || row.miniTestId}
        </Typography>
      ),
    },
    {
      id: 'testType',
      header: 'Тип',
      render: (row) => <StatusChip label={TEST_TYPE_LABELS[row.testType] ?? row.testType} tone="brand" hideDot />,
    },
    {
      id: 'score',
      header: 'Результат',
      sortable: true,
      sortValue: (row) => row.score ?? 0,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 40 }}>
            {row.score ?? 0}%
          </Typography>
          <StatusChip status={row.isPassed ? 'passed' : 'notPassed'} />
        </Box>
      ),
    },
    { id: 'attemptNumber', header: 'Попытка', align: 'right', render: (row) => `№ ${row.attemptNumber}` },
    {
      id: 'date',
      header: 'Дата',
      nowrap: true,
      sortable: true,
      sortValue: (row) => new Date(row.completedAt || row.createdAt || 0),
      render: (row) => formatDateTime(row.completedAt || row.createdAt),
    },
  ]

  return (
    <>
      <Toolbar
        hasActiveFilters={Boolean(testTypeFilter)}
        onReset={() => setTestTypeFilter('')}
        summary={data ? `Попыток: ${data.length}` : undefined}
      >
        <TextField
          select
          size="small"
          label="Тип теста" SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
          value={testTypeFilter}
          onChange={(e) => setTestTypeFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Все</MenuItem>
          <MenuItem value="lesson">Урок</MenuItem>
          <MenuItem value="module">Модуль</MenuItem>
          <MenuItem value="level">Уровень</MenuItem>
        </TextField>
      </Toolbar>
      <DataTable
        aria-label="Попытки тестов"
        columns={columns}
        rows={data}
        getRowId={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={reload}
        pagination
        defaultSort={{ by: 'date', direction: 'desc' }}
        emptyState={
          testTypeFilter ? (
            <EmptyState
              size="sm"
              title="Нет попыток этого типа"
              action={<Button onClick={() => setTestTypeFilter('')}>Показать все тесты</Button>}
            />
          ) : (
            <EmptyState size="sm" title="Тестов ещё не было" description="Попытки появятся, когда пользователь пройдёт тест в уроке, модуле или уровне." />
          )
        }
      />
    </>
  )
}
