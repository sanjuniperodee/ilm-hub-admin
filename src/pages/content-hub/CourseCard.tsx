import { useMemo } from 'react';
import { Stack, Typography, IconButton, Button, Tooltip, Box, Collapse, CircularProgress, Paper, Divider } from '@mui/material';
import {
  KeyboardArrowRight,
  FileDownloadOutlined,
  QuizOutlined,
  Add,
  EditOutlined,
  LayersOutlined,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from '../../theme';
import { EmptyState } from '../../components/ui';
import { HubCourse, HubModule, HubLesson } from './types';
import { ModuleItem } from './ModuleItem';
import { LessonItem } from './LessonItem';
import { AccessSummary, CourseMonogram, Highlight } from './HubParts';
import { computeLessonAccess, getCourseAccessRule, LESSON_FORMS, MODULE_FORMS, plural } from './accessRules';

interface CourseCardProps {
  course: HubCourse;
  /** All modules of the course in order. */
  modules: HubModule[];
  looseLessons: HubLesson[];
  lessonsByModule: Record<string, HubLesson[]>;
  expanded: boolean;
  toggleCourse: (id: string) => void;
  downloadCourseContent: (c: HubCourse) => void;
  exportingCourseId: string | null;
  onAddModule: (courseId: string) => void;
  onAddLesson: (courseId: string, moduleId: string) => void;
  expandedModules: Set<string>;
  toggleModule: (id: string) => void;
  onRequestDeleteLesson: (lesson: HubLesson, courseId: string) => void;
  deletingLessonId: string | null;
  /** Search text (for highlighting). */
  query?: string;
  /** Search filter: when set, only matching modules / lessons are shown and modules are expanded. */
  filter?: HubCourseFilter | null;
}

export interface HubCourseFilter {
  /** Modules to show. */
  modules: Set<string>;
  /** Modules whose own title matched: all their lessons are shown. */
  fullModules: Set<string>;
  /** Lessons that matched. */
  lessons: Set<string>;
}

export function levelCodeFromCourseCode(code: string | undefined): string | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  const match = normalized.match(/^[A-C][0-9]$/);
  return match ? match[0] : null;
}

export function CourseCard({
  course,
  modules,
  looseLessons,
  lessonsByModule,
  expanded,
  toggleCourse,
  downloadCourseContent,
  exportingCourseId,
  onAddModule,
  onAddLesson,
  expandedModules,
  toggleModule,
  onRequestDeleteLesson,
  deletingLessonId,
  query = '',
  filter,
}: CourseCardProps) {
  const levelCode = levelCodeFromCourseCode(course.code);
  const onboardingSlot = String(course.code || '').toLowerCase();
  const showOnboarding = ['mahraj', 'a1', 'a2'].includes(onboardingSlot);
  const searching = !!filter;

  const rule = getCourseAccessRule(course.code);
  const lessonAccess = useMemo(
    () => computeLessonAccess(course.code, looseLessons, modules, lessonsByModule),
    [course.code, looseLessons, modules, lessonsByModule],
  );
  const totalLessons = lessonAccess.size;
  const freeLessons = Array.from(lessonAccess.values()).filter((a) => a === 'free').length;

  const shownModules = modules
    .map((m, idx) => ({ module: m, position: idx + 1 }))
    .filter(({ module }) => !filter || filter.modules.has(module.id));
  const shownLoose = looseLessons
    .map((l, idx) => ({ lesson: l, position: idx + 1 }))
    .filter(({ lesson }) => !filter || filter.lessons.has(lesson.id));

  const bodyId = `course-body-${course.id}`;
  const isEmpty = modules.length === 0 && looseLessons.length === 0;

  return (
    <Paper
      component="section"
      aria-label={`Курс «${course.titleRu}»`}
      id={`course-${course.id}`}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: expanded ? 'surface.borderStrong' : 'divider',
        transition: `border-color ${motion.fast}`,
        scrollMarginTop: 72,
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        spacing={{ xs: 1.5, md: 2 }}
        sx={{ p: { xs: 1.5, sm: 2 } }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
          <IconButton
            size="small"
            onClick={() => toggleCourse(course.id)}
            aria-expanded={expanded}
            aria-controls={bodyId}
            aria-label={expanded ? `Свернуть курс «${course.titleRu}»` : `Развернуть курс «${course.titleRu}»`}
            sx={{ ml: -0.5 }}
          >
            <KeyboardArrowRight
              sx={{ transition: `transform ${motion.base}`, transform: expanded ? 'rotate(90deg)' : 'none' }}
            />
          </IconButton>

          <CourseMonogram code={course.code} />

          <Box
            sx={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
            onClick={() => toggleCourse(course.id)}
          >
            <Typography
              variant="h6"
              component="h2"
              sx={{ fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              <Highlight text={course.titleRu || 'Без названия'} query={query} />
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              Код <Highlight text={course.code || '—'} query={query} />
              {course.level ? `, уровень ${course.level}` : ''}
              {`, ${modules.length} ${plural(modules.length, MODULE_FORMS)}, ${totalLessons} ${plural(totalLessons, LESSON_FORMS)}`}
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          justifyContent={{ xs: 'space-between', md: 'flex-end' }}
          sx={{ flexShrink: 0, pl: { xs: 0, md: 0 } }}
        >
          <AccessSummary rule={rule} free={freeLessons} total={totalLessons} />
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Button
              component={RouterLink}
              to={`/content/courses/${course.id}/edit`}
              variant="outlined"
              size="small"
              startIcon={<EditOutlined fontSize="small" />}
            >
              Настройки
            </Button>
            <Tooltip title="Выгрузить контент курса в Excel">
              <span>
                <IconButton
                  onClick={() => downloadCourseContent(course)}
                  disabled={exportingCourseId === course.id}
                  aria-label={`Выгрузить контент курса «${course.titleRu}»`}
                  size="small"
                >
                  {exportingCourseId === course.id ? <CircularProgress size={18} /> : <FileDownloadOutlined fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box
          id={bodyId}
          sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: 'surface.sunken', p: { xs: 1.5, sm: 2 } }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            spacing={1}
            sx={{ mb: 1.5 }}
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {levelCode && (
                <Button
                  component={RouterLink}
                  to={`/content/level-tests/${levelCode}`}
                  variant="outlined"
                  size="small"
                  startIcon={<QuizOutlined fontSize="small" />}
                  sx={{ bgcolor: 'background.paper' }}
                >
                  Тест уровня {levelCode}
                </Button>
              )}
              {showOnboarding && (
                <Button
                  component={RouterLink}
                  to={`/content/onboarding-placement/${onboardingSlot}`}
                  variant="outlined"
                  size="small"
                  startIcon={<QuizOutlined fontSize="small" />}
                  sx={{ bgcolor: 'background.paper' }}
                >
                  Входной тест ({course.code})
                </Button>
              )}
            </Stack>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
              <Button size="small" variant="text" startIcon={<Add />} onClick={() => onAddLesson(course.id, '')}>
                Урок вне модуля
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Add />}
                onClick={() => onAddModule(course.id)}
                sx={{ bgcolor: 'background.paper' }}
              >
                Модуль
              </Button>
            </Stack>
          </Stack>

          {isEmpty ? (
            <Box sx={{ border: '1px dashed', borderColor: 'surface.borderStrong', borderRadius: 2, bgcolor: 'background.paper' }}>
              <EmptyState
                size="sm"
                icon={<LayersOutlined />}
                title="В курсе пока нет модулей"
                description="Курс состоит из модулей, а модули — из уроков. Начните с первого модуля."
                action={
                  <Button variant="outlined" startIcon={<Add />} onClick={() => onAddModule(course.id)}>
                    Добавить модуль
                  </Button>
                }
              />
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {shownLoose.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.75, px: 0.5 }}>
                    Уроки вне модулей
                  </Typography>
                  <Box
                    component="ul"
                    sx={{ m: 0, p: 0, listStyle: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden' }}
                  >
                    {shownLoose.map(({ lesson, position }, idx) => (
                      <LessonItem
                        key={lesson.id}
                        lesson={lesson}
                        position={position}
                        courseId={course.id}
                        access={lessonAccess.get(lesson.id)}
                        onRequestDelete={() => onRequestDeleteLesson(lesson, course.id)}
                        isDeleting={deletingLessonId === lesson.id}
                        isLast={idx === shownLoose.length - 1}
                        query={query}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {(shownModules.length > 0 || !searching) && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.75, px: 0.5 }}>
                    Модули
                  </Typography>
                  <Box
                    component="ul"
                    sx={{ m: 0, p: 0, listStyle: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden' }}
                  >
                    <SortableContext items={shownModules.map(({ module }) => module.id)} strategy={verticalListSortingStrategy}>
                      {shownModules.map(({ module, position }, idx) => (
                        <ModuleItem
                          key={module.id}
                          module={module}
                          position={position}
                          courseId={course.id}
                          expanded={searching || expandedModules.has(module.id)}
                          toggleModule={toggleModule}
                          onAddLesson={onAddLesson}
                          moduleLessons={lessonsByModule[module.id] || []}
                          visibleLessonIds={filter && !filter.fullModules.has(module.id) ? filter.lessons : null}
                          lessonAccess={lessonAccess}
                          onRequestDeleteLesson={(lesson) => onRequestDeleteLesson(lesson, course.id)}
                          deletingLessonId={deletingLessonId}
                          isLast={idx === shownModules.length - 1}
                          dragDisabled={!!query.trim()}
                          query={query}
                        />
                      ))}
                    </SortableContext>
                    {shownModules.length === 0 && (
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">Модулей пока нет.</Typography>
                        <Button size="small" onClick={() => onAddModule(course.id)}>Добавить модуль</Button>
                      </Stack>
                    )}
                  </Box>
                </Box>
              )}
            </Stack>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}
