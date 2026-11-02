import { useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { Add, CloudDownloadOutlined, MonitorHeartOutlined, SyncOutlined } from '@mui/icons-material'
import {
  DataTable,
  EmptyState,
  SearchField,
  SectionCard,
  StatCard,
  StatGroup,
  StatusChip,
  type DataTableColumn,
  type StatusPreset,
} from '../../../components/ui'
import { dialogActionsSafeAreaSx, useNarrowDialogProps } from '../../../hooks/useNarrowDialogProps'
import { FieldPair } from '../../words/shared'
import type { CoverageItem, EveryAyahReciterItem, ReciterForm, ReciterItem } from './model'

const SYNC_STATUS: Record<string, { preset?: StatusPreset; label: string; tone?: 'info' | 'warning' }> = {
  completed: { preset: 'sent', label: 'Завершена' },
  failed: { preset: 'failed', label: 'Ошибка' },
  running: { label: 'Выполняется', tone: 'info' },
  active: { label: 'Выполняется', tone: 'info' },
  queued: { label: 'В очереди', tone: 'warning' },
  waiting: { label: 'В очереди', tone: 'warning' },
  pending: { label: 'В очереди', tone: 'warning' },
}

export function SyncStatusChip({ status }: { status?: string }) {
  if (!status) return null
  const s = SYNC_STATUS[status]
  if (!s) return <StatusChip label={status} tone="neutral" />
  return <StatusChip status={s.preset} label={s.label} tone={s.tone} />
}

export interface AudioPanelProps {
  surahsCount: number
  reciters: ReciterItem[]
  coverage: CoverageItem[]
  coverageReadyCount: number
  loading: boolean
  syncStatus: any | null
  syncStarting: boolean
  onSync: () => void
  onOpenMonitor: () => void

  everyAyahSearch: string
  onEveryAyahSearch: (v: string) => void
  showOnlyNotAdded: boolean
  onShowOnlyNotAdded: (v: boolean) => void
  filteredEveryAyahReciters: EveryAyahReciterItem[]
  totalEveryAyah: number
  selectedSlugs: string[]
  onSelectedSlugs: (slugs: string[]) => void
  onImportSelected: () => Promise<void>

  reciterForm: ReciterForm
  onReciterForm: (f: ReciterForm) => void
  onCreateReciter: () => Promise<void>
  onToggleReciter: (r: ReciterItem) => void
  togglingReciterId: string | null
}

export function AudioPanel(p: AudioPanelProps) {
  const [importing, setImporting] = useState(false)
  const [creating, setCreating] = useState(false)
  const running = p.syncStatus && p.syncStatus.status !== 'completed' && p.syncStatus.status !== 'failed'

  const reciterColumns: DataTableColumn<ReciterItem>[] = [
    {
      id: 'displayName',
      header: 'Чтец',
      sortable: true,
      render: (r) => (
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {r.displayName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {r.slug}
          </Typography>
        </Box>
      ),
    },
    { id: 'source', header: 'Источник', hideBelow: 'sm', render: (r) => r.source || '—' },
    { id: 'bitrate', header: 'Качество', hideBelow: 'md', render: (r) => r.bitrate || '—' },
    { id: 'sortOrder', header: 'Порядок', align: 'right', sortable: true, hideBelow: 'md', width: 96 },
    {
      id: 'isActive',
      header: 'В приложении',
      sortable: true,
      nowrap: true,
      render: (r) => (
        <FormControlLabel
          sx={{ m: 0 }}
          control={
            <Switch
              size="small"
              checked={r.isActive}
              disabled={p.togglingReciterId === r.id}
              onChange={() => p.onToggleReciter(r)}
            />
          }
          label={<Typography variant="body2">{r.isActive ? 'Активен' : 'Отключён'}</Typography>}
        />
      ),
    },
  ]

  const coverageColumns: DataTableColumn<CoverageItem>[] = [
    { id: 'surahNumber', header: '№', align: 'right', sortable: true, width: 64 },
    { id: 'surahNameRu', header: 'Сура', sortable: true },
    {
      id: 'audioCount',
      header: 'Аудио',
      align: 'right',
      nowrap: true,
      render: (c) => `${c.audioCount} из ${c.ayahCount}`,
    },
    {
      id: 'percent',
      header: 'Покрытие',
      sortable: true,
      minWidth: 180,
      render: (c) => (
        <Stack direction="row" alignItems="center" gap={1}>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, c.percent)}
            color={c.percent >= 100 ? 'success' : 'primary'}
            aria-label={`Покрытие ${c.percent}%`}
            sx={{ flex: 1, height: 6, borderRadius: 3 }}
          />
          <Typography variant="body2" sx={{ width: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(c.percent)}%
          </Typography>
        </Stack>
      ),
    },
  ]

  const allFilteredSelected =
    p.filteredEveryAyahReciters.length > 0 && p.filteredEveryAyahReciters.every((r) => p.selectedSlugs.includes(r.slug))

  return (
    <Stack gap={2.5}>
      <SectionCard
        title="Аудио аятов"
        description="Синхронизация скачивает недостающие файлы для всех активных чтецов, суры 1–114. Уже загруженные файлы не перезаписываются."
        actions={
          <>
            <Button variant="outlined" startIcon={<MonitorHeartOutlined />} onClick={p.onOpenMonitor}>
              Мониторинг
            </Button>
            <Button
              variant="contained"
              startIcon={p.syncStarting ? <CircularProgress size={16} color="inherit" /> : <SyncOutlined />}
              onClick={p.onSync}
              disabled={p.syncStarting}
            >
              Синхронизировать аудио
            </Button>
          </>
        }
      >
        {running && (
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }} role="status">
            <SyncStatusChip status={p.syncStatus.status} />
            <Typography variant="body2" color="text.secondary">
              {typeof p.syncStatus.processed === 'number'
                ? `Обработано ${p.syncStatus.processed}, успешно ${p.syncStatus.success}, ошибок ${p.syncStatus.failed}`
                : 'Синхронизация запущена'}
            </Typography>
          </Stack>
        )}
        <StatGroup columns={{ xs: 1, sm: 3 }}>
          <StatCard variant="plain" label="Сур" value={p.surahsCount} loading={p.loading && !p.surahsCount} />
          <StatCard variant="plain" label="Чтецов" value={p.reciters.length} hint={`активных ${p.reciters.filter((r) => r.isActive).length}`} />
          <StatCard
            variant="plain"
            label="Сур с полным аудио"
            value={`${p.coverageReadyCount} из ${p.coverage.length}`}
            hint="покрытие 100%"
          />
        </StatGroup>
      </SectionCard>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 3fr) minmax(0, 2fr)' }, alignItems: 'start' }}>
        <SectionCard title="Чтецы в приложении" description="Отключённые чтецы не показываются пользователям." padding="none">
          <Box sx={{ px: 2.5, pb: 2.5 }}>
            <DataTable
              aria-label="Чтецы"
              columns={reciterColumns}
              rows={p.reciters}
              getRowId={(r) => r.id}
              loading={p.loading && p.reciters.length === 0}
              defaultSort={{ by: 'sortOrder', direction: 'asc' }}
              dense
              emptyState={<EmptyState size="sm" title="Чтецов пока нет" description="Импортируйте их из каталога EveryAyah или добавьте вручную." />}
            />
          </Box>
        </SectionCard>

        <Stack gap={2.5}>
          <SectionCard
            title="Импорт из EveryAyah"
            description={`В каталоге ${p.totalEveryAyah} чтецов. Импортированные сразу активируются.`}
            footer={
              <Button
                variant="outlined"
                startIcon={importing ? <CircularProgress size={16} /> : <CloudDownloadOutlined />}
                disabled={p.selectedSlugs.length === 0 || importing}
                onClick={async () => {
                  setImporting(true)
                  try {
                    await p.onImportSelected()
                  } finally {
                    setImporting(false)
                  }
                }}
              >
                Импортировать{p.selectedSlugs.length ? ` (${p.selectedSlugs.length})` : ''}
              </Button>
            }
          >
            <Stack gap={1.5}>
              <SearchField value={p.everyAyahSearch} onChange={p.onEveryAyahSearch} placeholder="Имя или slug чтеца" label="Поиск в каталоге EveryAyah" fullWidth debounceMs={150} />
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                <FormControlLabel
                  control={<Switch size="small" checked={p.showOnlyNotAdded} onChange={(e) => p.onShowOnlyNotAdded(e.target.checked)} />}
                  label={<Typography variant="body2">Только не добавленные</Typography>}
                />
                <Stack direction="row" gap={0.5}>
                  <Button size="small" onClick={() => p.onSelectedSlugs(p.filteredEveryAyahReciters.map((r) => r.slug))} disabled={allFilteredSelected}>
                    Выбрать все
                  </Button>
                  <Button size="small" onClick={() => p.onSelectedSlugs([])} disabled={p.selectedSlugs.length === 0}>
                    Очистить
                  </Button>
                </Stack>
              </Stack>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, maxHeight: 300, overflowY: 'auto' }}>
                {p.filteredEveryAyahReciters.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    {p.totalEveryAyah === 0 ? 'Каталог пуст или не загрузился' : 'Ничего не найдено'}
                  </Typography>
                ) : (
                  <List dense disablePadding aria-label="Каталог чтецов EveryAyah">
                    {p.filteredEveryAyahReciters.map((item) => {
                      const checked = p.selectedSlugs.includes(item.slug)
                      return (
                        <ListItem key={item.slug} disablePadding divider>
                          <ListItemButton
                            onClick={() =>
                              p.onSelectedSlugs(checked ? p.selectedSlugs.filter((s) => s !== item.slug) : [...p.selectedSlugs, item.slug])
                            }
                            dense
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Checkbox edge="start" size="small" checked={checked} tabIndex={-1} disableRipple inputProps={{ 'aria-label': item.displayName }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={item.displayName}
                              secondary={`${item.slug}${item.bitrate ? `, ${item.bitrate}` : ''}`}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                            {item.exists && <StatusChip label="Уже добавлен" tone="neutral" hideDot />}
                          </ListItemButton>
                        </ListItem>
                      )
                    })}
                  </List>
                )}
              </Box>
            </Stack>
          </SectionCard>

          <SectionCard
            title="Добавить чтеца вручную"
            description="Slug — имя папки чтеца в источнике аудио."
            footer={
              <Button
                variant="outlined"
                startIcon={creating ? <CircularProgress size={16} /> : <Add />}
                disabled={creating || !p.reciterForm.slug.trim() || !p.reciterForm.displayName.trim()}
                onClick={async () => {
                  setCreating(true)
                  try {
                    await p.onCreateReciter()
                  } finally {
                    setCreating(false)
                  }
                }}
              >
                Добавить чтеца
              </Button>
            }
          >
            <Stack gap={2}>
              <FieldPair>
                <TextField size="small" label="Slug" required value={p.reciterForm.slug} onChange={(e) => p.onReciterForm({ ...p.reciterForm, slug: e.target.value })} />
                <TextField size="small" label="Имя" required value={p.reciterForm.displayName} onChange={(e) => p.onReciterForm({ ...p.reciterForm, displayName: e.target.value })} />
              </FieldPair>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' } }}>
                <TextField size="small" label="Источник" value={p.reciterForm.source} onChange={(e) => p.onReciterForm({ ...p.reciterForm, source: e.target.value })} />
                <TextField size="small" label="Качество" value={p.reciterForm.bitrate} onChange={(e) => p.onReciterForm({ ...p.reciterForm, bitrate: e.target.value })} />
                <TextField size="small" label="Порядок" type="number" value={p.reciterForm.sortOrder} onChange={(e) => p.onReciterForm({ ...p.reciterForm, sortOrder: Number(e.target.value) || 0 })} />
              </Box>
            </Stack>
          </SectionCard>
        </Stack>
      </Box>

      <SectionCard title="Покрытие аудио по сурам" description="Сколько аятов каждой суры уже имеют аудио." padding="none">
        <Box sx={{ px: 2.5, pb: 2.5 }}>
          <DataTable
            aria-label="Покрытие аудио по сурам"
            columns={coverageColumns}
            rows={p.coverage}
            getRowId={(c) => c.surahId}
            loading={p.loading && p.coverage.length === 0}
            defaultSort={{ by: 'surahNumber', direction: 'asc' }}
            pagination
            initialRowsPerPage={25}
            dense
            emptyState={<EmptyState size="sm" title="Нет данных о покрытии" description="Запустите синхронизацию аудио." />}
          />
        </Box>
      </SectionCard>
    </Stack>
  )
}

export function SyncMonitorDialog({ open, onClose, syncStatus, syncJobId }: { open: boolean; onClose: () => void; syncStatus: any | null; syncJobId: string }) {
  const narrow = useNarrowDialogProps('md')
  const total = typeof syncStatus?.total === 'number' ? syncStatus.total : null
  return (
    <Dialog open={open} onClose={onClose} {...narrow} aria-labelledby="sync-monitor-title">
      <DialogTitle id="sync-monitor-title">Мониторинг синхронизации</DialogTitle>
      <DialogContent>
        {!syncStatus ? (
          <EmptyState size="sm" title="Нет активной синхронизации" description="Запустите синхронизацию аудио — прогресс появится здесь." />
        ) : (
          <Stack gap={2.5} sx={{ pt: 1 }}>
            <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
              <SyncStatusChip status={syncStatus.status} />
              <Typography variant="body2" color="text.secondary">
                Задача {syncStatus.id || syncJobId}
                {syncStatus.type || syncStatus.mode ? `, тип ${syncStatus.type || syncStatus.mode}` : ''}
              </Typography>
            </Stack>
            {typeof syncStatus.processed === 'number' && (
              <Box>
                {total ? (
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (syncStatus.processed / total) * 100)}
                    aria-label="Прогресс синхронизации"
                    sx={{ height: 6, borderRadius: 3, mb: 1.5 }}
                  />
                ) : null}
                <StatGroup columns={{ xs: 2, sm: 4 }}>
                  <StatCard variant="plain" label="Обработано" value={syncStatus.processed} hint={total ? `из ${total}` : undefined} />
                  <StatCard variant="plain" label="Успешно" value={syncStatus.success} />
                  <StatCard variant="plain" label="Пропущено" value={syncStatus.skipped} />
                  <StatCard variant="plain" label="Ошибок" value={syncStatus.failed} />
                </StatGroup>
              </Box>
            )}
            {Array.isArray(syncStatus.reciters) && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Прогресс по чтецам
                </Typography>
                <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
                  {syncStatus.reciters.slice(0, 20).map((r: any) => (
                    <Stack key={r.reciterId || r.reciterSlug} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={0.5} sx={{ py: 0.75 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {r.reciterDisplayName || r.reciterSlug}
                      </Typography>
                      <Stack direction="row" gap={1} alignItems="center">
                        <SyncStatusChip status={r.status} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {r.success}/{r.processed}, ошибок {r.failed}
                        </Typography>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
            {Array.isArray(syncStatus.errors) && syncStatus.errors.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Последние ошибки
                </Typography>
                <Stack gap={0.5} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'error.soft' }}>
                  {syncStatus.errors.slice(0, 20).map((e: any, idx: number) => (
                    <Typography key={idx} variant="body2" sx={{ color: 'error.dark' }}>
                      {e.surahNumber ? `${e.surahNumber}:${e.ayahNumber} ` : ''}
                      {e.message || e.reason}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={dialogActionsSafeAreaSx}>
        <Button variant="outlined" onClick={onClose}>
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  )
}
