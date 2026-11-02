import { useCallback, useState } from 'react'
import { Box, Button, Collapse, LinearProgress, Stack, Tooltip, Typography } from '@mui/material'
import { EmojiEventsOutlined, ExpandLess, ExpandMore, SchoolOutlined } from '@mui/icons-material'
import { getUserAchievements, getUserCoursesProgress, getUserStreaks, getUserStudyPlan } from '../../api/adminApi'
import { EmptyState, ErrorState, LoadingState, SectionCard, StatusChip } from '../../components/ui'
import { color, radius } from '../../theme/tokens'
import { InfoList } from './InfoList'
import { useLoad } from './useLoad'
import { formatDate } from './userLabels'

function CourseRow({ course }: { course: any }) {
  const [open, setOpen] = useState(false)
  const modules: any[] = Array.isArray(course.modules) ? course.modules : []
  const pct = Number(course.progressPercent) || 0
  return (
    <Box sx={{ py: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" component="h3">
            {course.titleRu}
            {course.code && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {course.code}
              </Typography>
            )}
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          {course.levelTestPassed !== null && course.levelTestPassed !== undefined && (
            <StatusChip
              status={course.levelTestPassed ? 'passed' : 'notPassed'}
              label={course.levelTestPassed ? 'Тест уровня сдан' : 'Тест уровня не сдан'}
            />
          )}
          <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {course.completedLessons}/{course.totalLessons} уроков
          </Typography>
        </Stack>
      </Stack>
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ mt: 1 }}>
        <LinearProgress variant="determinate" value={pct} sx={{ flex: 1 }} aria-label={`Курс ${course.titleRu}: ${pct}%`} />
        <Typography variant="body2" color="text.secondary" sx={{ width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {pct}%
        </Typography>
      </Stack>
      {modules.length > 0 && (
        <>
          <Button
            size="small"
            onClick={() => setOpen((v) => !v)}
            endIcon={open ? <ExpandLess /> : <ExpandMore />}
            aria-expanded={open}
            sx={{ mt: 1, ml: -1, color: 'text.secondary' }}
          >
            {open ? 'Скрыть модули' : `Модули (${modules.length})`}
          </Button>
          <Collapse in={open} unmountOnExit>
            <Box
              component="ul"
              sx={{
                listStyle: 'none',
                m: 0,
                mt: 1,
                p: 0,
                display: 'grid',
                gap: 1,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              }}
            >
              {modules.map((m: any) => {
                const done = m.total > 0 && m.completed >= m.total
                return (
                  <Stack
                    component="li"
                    key={m.id}
                    direction="row"
                    justifyContent="space-between"
                    gap={1}
                    sx={{ px: 1.5, py: 1, borderRadius: `${radius.md}px`, bgcolor: done ? color.success.soft : 'surface.sunken' }}
                  >
                    <Typography variant="body2" sx={{ minWidth: 0 }}>
                      {m.titleRu}
                    </Typography>
                    <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, color: done ? 'success.dark' : 'text.secondary' }}>
                      {m.completed}/{m.total}
                    </Typography>
                  </Stack>
                )
              })}
            </Box>
          </Collapse>
        </>
      )}
    </Box>
  )
}

function CoursesProgress({ userId }: { userId: string }) {
  const load = useCallback(() => getUserCoursesProgress(userId).then((r) => (Array.isArray(r.data) ? r.data : [])), [userId])
  const { data, loading, error, reload } = useLoad<any[]>(load)
  return (
    <SectionCard title="Курсы" description="Сколько уроков пройдено в каждом курсе.">
      {loading && !data ? (
        <LoadingState variant="list" rows={3} minHeight={0} />
      ) : error ? (
        <ErrorState variant="inline" error={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState size="sm" icon={<SchoolOutlined />} title="Прогресса пока нет" description="Пользователь ещё не начинал курсы." />
      ) : (
        <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />} sx={{ my: -2 }}>
          {data.map((c: any) => (
            <CourseRow key={c.id} course={c} />
          ))}
        </Stack>
      )}
    </SectionCard>
  )
}

function StudyPlan({ userId }: { userId: string }) {
  const load = useCallback(() => getUserStudyPlan(userId).then((r) => r.data ?? null), [userId])
  const { data, loading, error, reload } = useLoad<any>(load)
  return (
    <SectionCard title="Учебный план">
      {loading && data === undefined ? (
        <LoadingState variant="list" rows={2} minHeight={0} />
      ) : error ? (
        <ErrorState variant="inline" error={error} onRetry={reload} />
      ) : !data ? (
        <EmptyState size="sm" title="Плана нет" description="Пользователь не составлял учебный план." />
      ) : (
        <InfoList
          items={[
            { label: 'Цель', value: data.goalText, wide: true },
            { label: 'Минут в день', value: data.dailyMinutes },
            { label: 'Дней в неделю', value: data.daysPerWeek },
            { label: 'Целевая дата', value: data.targetDate ? formatDate(data.targetDate) : null },
          ]}
        />
      )}
    </SectionCard>
  )
}

function Streaks({ userId }: { userId: string }) {
  const load = useCallback(() => getUserStreaks(userId).then((r) => r.data ?? null), [userId])
  const { data, loading, error, reload } = useLoad<any>(load)
  const week: any[] = Array.isArray(data?.weeklyActivity) ? data.weeklyActivity : []
  const max = Math.max(1, ...week.map((d) => (d.lessonsCompleted ?? 0) + (d.exercisesCompleted ?? 0)))
  return (
    <SectionCard title="Серия занятий">
      {loading && data === undefined ? (
        <LoadingState variant="list" rows={2} minHeight={0} />
      ) : error ? (
        <ErrorState variant="inline" error={error} onRetry={reload} />
      ) : !data ? (
        <EmptyState size="sm" title="Нет данных о занятиях" />
      ) : (
        <Stack gap={2}>
          <Box>
            <Typography component="p" sx={{ fontSize: '1.625rem', fontWeight: 700, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
              {data.currentStreak ?? 0} дн.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              текущая серия без пропусков
            </Typography>
          </Box>
          {week.length > 0 && (
            <Box>
              <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
                Активность за неделю
              </Typography>
              <Stack direction="row" alignItems="flex-end" gap={0.75} sx={{ height: 88 }} role="list">
                {week.map((d: any) => {
                  const total = (d.lessonsCompleted ?? 0) + (d.exercisesCompleted ?? 0)
                  const label = `${formatDate(d.date, 'EEEEEE, d MMM')}: ${d.lessonsCompleted ?? 0} ур., ${d.exercisesCompleted ?? 0} упр.`
                  return (
                    <Tooltip key={d.date} title={label}>
                      <Stack role="listitem" aria-label={label} alignItems="center" gap={0.5} sx={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                        <Box
                          sx={{
                            width: '100%',
                            maxWidth: 32,
                            height: `${Math.max(6, (total / max) * 64)}px`,
                            borderRadius: `${radius.sm}px`,
                            bgcolor: total > 0 ? 'primary.light' : color.neutral[200],
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(d.date, 'EEEEEE')}
                        </Typography>
                      </Stack>
                    </Tooltip>
                  )
                })}
              </Stack>
            </Box>
          )}
        </Stack>
      )}
    </SectionCard>
  )
}

function Achievements({ userId }: { userId: string }) {
  const load = useCallback(() => getUserAchievements(userId).then((r) => (Array.isArray(r.data) ? r.data : [])), [userId])
  const { data, loading, error, reload } = useLoad<any[]>(load)
  return (
    <SectionCard title="Достижения" description={data?.length ? `Получено: ${data.length}` : undefined}>
      {loading && !data ? (
        <LoadingState variant="list" rows={2} minHeight={0} />
      ) : error ? (
        <ErrorState variant="inline" error={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState size="sm" icon={<EmojiEventsOutlined />} title="Достижений пока нет" />
      ) : (
        <Box
          component="ul"
          sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' } }}
        >
          {data.map((a: any) => (
            <Stack component="li" key={a.id} direction="row" alignItems="center" gap={1.5} sx={{ p: 1.25, border: 1, borderColor: 'divider', borderRadius: `${radius.md}px` }}>
              <Box aria-hidden sx={{ width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: color.gold[100], color: color.gold[800], flexShrink: 0 }}>
                <EmojiEventsOutlined fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                  {a.achievementType || a.id}
                </Typography>
                {a.unlockedAt && (
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(a.unlockedAt)}
                  </Typography>
                )}
              </Box>
            </Stack>
          ))}
        </Box>
      )}
    </SectionCard>
  )
}

export function UserLearningTab({ userId }: { userId: string }) {
  return (
    <Stack gap={3}>
      <CoursesProgress userId={userId} />
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, alignItems: 'start' }}>
        <Streaks userId={userId} />
        <StudyPlan userId={userId} />
      </Box>
      <Achievements userId={userId} />
    </Stack>
  )
}
