import { useMemo, useState } from 'react'
import { Box, Button, IconButton, LinearProgress, Stack, Tooltip, Typography } from '@mui/material'
import { Add, DeleteOutline, EditOutlined } from '@mui/icons-material'
import {
  ArabicText,
  DataTable,
  EmptyState,
  SearchField,
  SectionCard,
  StatusChip,
  Toolbar,
  visuallyHidden,
  type DataTableColumn,
} from '../../../components/ui'
import { MetaLine } from '../../words/shared'
import { REVELATION_LABEL, ayahWord, toArabicDigits, type AyahItem, type CoverageItem, type SurahItem } from './model'

export interface SurahDetailProps {
  surah: SurahItem
  ayahs: AyahItem[] | undefined
  ayahsError: unknown
  coverage?: CoverageItem
  onRetry: () => void
  onCreateAyah: () => void
  onEditAyah: (a: AyahItem) => void
  onDeleteAyah: (a: AyahItem) => void
}

/** Ornamental ayah-end marker with Arabic-Indic digits, as in a printed mushaf. */
function AyahMarker({ n }: { n: number }) {
  return (
    <Box
      component="span"
      aria-label={`аят ${n}`}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '1.9em',
        height: '1.9em',
        px: 0.5,
        mx: 0.75,
        verticalAlign: 'middle',
        borderRadius: '50%',
        border: 1.5,
        borderColor: 'primary.light',
        color: 'primary.dark',
        fontSize: '0.6em',
        lineHeight: 1,
        fontWeight: 600,
      }}
    >
      {toArabicDigits(n)}
    </Box>
  )
}

export function SurahDetail({
  surah,
  ayahs,
  ayahsError,
  coverage,
  onRetry,
  onCreateAyah,
  onEditAyah,
  onDeleteAyah,
}: SurahDetailProps) {
  const [q, setQ] = useState('')
  const visible = useMemo(() => {
    const list = ayahs ?? []
    const needle = q.toLowerCase()
    if (!needle) return list
    return list.filter(
      (a) =>
        String(a.number) === needle ||
        a.textAr.includes(q) ||
        (a.translationRu ?? '').toLowerCase().includes(needle) ||
        (a.translationKz ?? '').toLowerCase().includes(needle),
    )
  }, [ayahs, q])

  const missingKz = (ayahs ?? []).filter((a) => !a.translationKz?.trim()).length
  const missingRu = (ayahs ?? []).filter((a) => !a.translationRu?.trim()).length

  const columns: DataTableColumn<AyahItem>[] = [
    {
      id: 'textAr',
      header: 'Текст аята',
      minWidth: 320,
      width: '50%',
      render: (a) => (
        <ArabicText size="lg" component="p" sx={{ m: 0, py: 0.5 }}>
          {a.textAr}
          <AyahMarker n={a.number} />
        </ArabicText>
      ),
    },
    {
      id: 'translation',
      header: 'Перевод',
      minWidth: 240,
      render: (a) => (
        <Stack gap={0.75}>
          {a.translationRu?.trim() ? (
            <Typography variant="body2">{a.translationRu}</Typography>
          ) : (
            <Typography variant="caption" sx={{ color: 'warning.dark' }}>
              Нет перевода RU
            </Typography>
          )}
          {a.translationKz?.trim() ? (
            <Typography variant="body2" color="text.secondary">
              {a.translationKz}
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ color: 'warning.dark' }}>
              Нет перевода KZ
            </Typography>
          )}
        </Stack>
      ),
    },
    { id: 'number', header: '№', align: 'right', sortable: true, width: 64 },
    {
      id: 'actions',
      header: <Box component="span" sx={visuallyHidden}>Действия</Box>,
      align: 'right',
      width: 96,
      render: (a) => (
        <Stack direction="row" justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Изменить">
            <IconButton size="small" aria-label={`Изменить аят ${a.number}`} onClick={() => onEditAyah(a)}>
              <EditOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Удалить">
            <IconButton size="small" aria-label={`Удалить аят ${a.number}`} onClick={() => onDeleteAyah(a)} sx={{ color: 'error.main' }}>
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  return (
    <Stack gap={2.5}>
      <SectionCard>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={3} alignItems={{ md: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
              <StatusChip tone={surah.revelationType === 'meccan' ? 'brand' : 'info'} label={REVELATION_LABEL[surah.revelationType]} hideDot />
              <StatusChip status={surah.isActive ? 'active' : 'inactive'} label={surah.isActive ? 'Показывается' : 'Скрыта'} />
            </Stack>
            <MetaLine
              items={[
                { label: 'Транслитерация', value: surah.transliteration },
                surah.nameKz ? { label: 'KZ', value: surah.nameKz } : null,
                { label: 'Аятов', value: surah.ayahCount },
                { label: 'Джуз', value: surah.juzNumber },
                surah.pageNumber ? { label: 'Страница', value: surah.pageNumber } : null,
              ]}
            />
            {coverage && (
              <Box sx={{ mt: 1.5, maxWidth: 360 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Аудио аятов
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {coverage.audioCount} из {coverage.ayahCount}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, coverage.percent)}
                  color={coverage.percent >= 100 ? 'success' : 'primary'}
                  aria-label={`Покрытие аудио ${coverage.percent}%`}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            )}
          </Box>
          <ArabicText size="display" weight={500} sx={{ display: 'block', textAlign: { xs: 'start', md: 'end' } }}>
            {surah.nameAr}
          </ArabicText>
        </Stack>
      </SectionCard>

      <Box>
        <Toolbar
          hasActiveFilters={!!q}
          onReset={() => setQ('')}
          summary={
            ayahs && ayahs.length > 0
              ? q
                ? `Найдено ${visible.length} из ${ayahs.length}`
                : `${ayahs.length} ${ayahWord(ayahs.length)}, без RU ${missingRu}, без KZ ${missingKz}`
              : undefined
          }
          actions={
            <Button variant="outlined" startIcon={<Add />} onClick={onCreateAyah}>
              Добавить аят
            </Button>
          }
        >
          <SearchField value={q} onChange={setQ} placeholder="Номер, текст или перевод" label="Поиск аятов" />
        </Toolbar>
        <DataTable
          aria-label={`Аяты суры ${surah.nameRu}`}
          columns={columns}
          rows={ayahs ? visible : undefined}
          getRowId={(a) => a.id}
          loading={!ayahs && !ayahsError}
          error={ayahsError}
          onRetry={onRetry}
          onRowClick={onEditAyah}
          defaultSort={{ by: 'number', direction: 'asc' }}
          pagination
          initialRowsPerPage={50}
          rowsPerPageOptions={[25, 50, 100, 300]}
          emptyState={
            q ? (
              <EmptyState size="sm" title="Ничего не найдено" description="Измените запрос." action={<Button onClick={() => setQ('')}>Сбросить поиск</Button>} />
            ) : (
              <EmptyState
                size="sm"
                title="В суре пока нет аятов"
                description="Добавьте аяты вручную или импортируйте их скриптом import:quran-ru-kuliev."
                action={
                  <Button variant="contained" startIcon={<Add />} onClick={onCreateAyah}>
                    Добавить аят
                  </Button>
                }
              />
            )
          }
        />
      </Box>
    </Stack>
  )
}

