import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Button, Stack, LinearProgress, Tooltip } from '@mui/material';
import { Add, SchoolOutlined, UnfoldLess, UnfoldMore, QuizOutlined } from '@mui/icons-material';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useContentHub } from './content-hub/useContentHub';
import { CourseCard, type HubCourseFilter } from './content-hub/CourseCard';
import { CreateCourseModal, CreateModuleModal, CreateLessonModal } from './content-hub/CreateModals';
import { COURSE_FORMS, LESSON_FORMS, MODULE_FORMS, plural } from './content-hub/accessRules';
import { createCourse, createModule, createLesson } from '../api/adminApi';
import RichTextMigrationButton from '../components/RichTextMigrationButton';
import { useAuth } from '../contexts/AuthContext';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SearchField,
  Toolbar,
  getErrorMessage,
  useShellBreadcrumbs,
} from '../components/ui';

const nextOrder = (items: { orderIndex: number }[]) =>
  items.length ? Math.max(...items.map((i) => i.orderIndex ?? 0)) + 1 : 0;

export default function ContentHubPage() {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const { courseId: urlCourseId, moduleId: urlModuleId } = useParams<{ courseId?: string; moduleId?: string }>();

  const hub = useContentHub();
  const { setExpandedCourses, setExpandedModules } = hub;

  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [createModuleOpen, setCreateModuleOpen] = useState(false);
  const [createLessonOpen, setCreateLessonOpen] = useState(false);

  const [contextCourseId, setContextCourseId] = useState('');
  const [contextModuleId, setContextModuleId] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const query = searchQuery.trim().toLowerCase();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeData = active.data.current as { type?: string; courseId?: string; moduleId?: string } | undefined;
    const overData = over.data.current as { type?: string } | undefined;
    if (!activeData?.type || activeData.type !== overData?.type) return;

    if (activeData.type === 'module' && activeData.courseId) {
      await hub.handleDragModule(activeData.courseId, String(active.id), String(over.id));
    } else if (activeData.type === 'lesson' && activeData.moduleId && activeData.courseId) {
      await hub.handleDragLesson(activeData.courseId, activeData.moduleId, String(active.id), String(over.id));
    }
  };

  const createCourseMutation = useMutation({
    mutationFn: createCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub', 'courses'] });
      setCreateCourseOpen(false);
      toast.success('Курс создан');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Не удалось создать курс')),
  });

  const createModuleMutation = useMutation({
    mutationFn: createModule,
    onSuccess: (_res, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ['hub', 'modules'] });
      setCreateModuleOpen(false);
      if (vars?.courseId) setExpandedCourses((prev) => new Set(prev).add(vars.courseId));
      toast.success('Модуль создан');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Не удалось создать модуль')),
  });

  const createLessonMutation = useMutation({
    mutationFn: createLesson,
    onSuccess: (_res, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ['hub', 'lessons'] });
      setCreateLessonOpen(false);
      if (vars?.courseId) setExpandedCourses((prev) => new Set(prev).add(vars.courseId));
      if (vars?.moduleId) setExpandedModules((prev) => new Set(prev).add(vars.moduleId));
      toast.success('Урок создан');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Не удалось создать урок')),
  });

  // Search: which courses / modules / lessons to show. Derived — no state writes during render.
  const filters = useMemo(() => {
    if (!query) return null;
    const result: Record<string, HubCourseFilter | null> = {};
    const includes = (s: string | undefined) => !!s && s.toLowerCase().includes(query);
    for (const c of hub.courses) {
      if (includes(c.titleRu) || includes(c.code)) {
        result[c.id] = null; // whole course matches — show everything
        continue;
      }
      const modules = hub.sortedModulesByCourse[c.id] || [];
      const groups = hub.lessonGroupsByCourse[c.id];
      const lessons = hub.sortedLessonsByCourse[c.id] || [];
      const lessonIds = new Set(lessons.filter((l) => includes(l.titleRu)).map((l) => l.id));
      const fullModules = new Set(modules.filter((m) => includes(m.titleRu)).map((m) => m.id));
      const moduleIds = new Set(fullModules);
      modules.forEach((m) => {
        if ((groups?.byModule[m.id] || []).some((l) => lessonIds.has(l.id))) moduleIds.add(m.id);
      });
      if (moduleIds.size === 0 && lessonIds.size === 0) continue;
      result[c.id] = { modules: moduleIds, fullModules, lessons: lessonIds };
    }
    return result;
  }, [query, hub.courses, hub.sortedModulesByCourse, hub.sortedLessonsByCourse, hub.lessonGroupsByCourse]);

  const visibleCourses = filters ? hub.courses.filter((c) => c.id in filters) : hub.courses;

  // Open the course / module from the URL (editors navigate back to /content/courses/:id).
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!urlCourseId || hub.loading) return;
    setExpandedCourses((prev) => (prev.has(urlCourseId) ? prev : new Set(prev).add(urlCourseId)));
    if (urlModuleId) setExpandedModules((prev) => (prev.has(urlModuleId) ? prev : new Set(prev).add(urlModuleId)));
    const key = `${urlCourseId}/${urlModuleId ?? ''}`;
    if (scrolledFor.current === key) return;
    scrolledFor.current = key;
    requestAnimationFrame(() => {
      document.getElementById(`course-${urlCourseId}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }, [urlCourseId, urlModuleId, hub.loading, setExpandedCourses, setExpandedModules]);

  const urlCourse = hub.courses.find((c) => c.id === urlCourseId);
  const urlModule = urlCourseId && urlModuleId ? (hub.sortedModulesByCourse[urlCourseId] || []).find((m) => m.id === urlModuleId) : null;

  useShellBreadcrumbs(
    urlCourse && [
      { label: 'Курсы и уроки', to: '/content' },
      urlModule
        ? { label: urlCourse.titleRu, to: `/content/courses/${urlCourse.id}` }
        : { label: urlCourse.titleRu },
      ...(urlModule ? [{ label: urlModule.titleRu }] : []),
    ],
  );

  const totals = useMemo(() => {
    const modules = Object.values(hub.sortedModulesByCourse).reduce((n, list) => n + list.length, 0);
    const lessons = Object.values(hub.sortedLessonsByCourse).reduce((n, list) => n + list.length, 0);
    return { courses: hub.courses.length, modules, lessons };
  }, [hub.courses, hub.sortedModulesByCourse, hub.sortedLessonsByCourse]);

  const allExpanded = hub.courses.length > 0 && hub.courses.every((c) => hub.expandedCourses.has(c.id));
  const toggleAll = () => {
    if (allExpanded) {
      setExpandedCourses(new Set());
      setExpandedModules(new Set());
    } else {
      setExpandedCourses(new Set(hub.courses.map((c) => c.id)));
      setExpandedModules(new Set(Object.values(hub.sortedModulesByCourse).flat().map((m) => m.id)));
    }
  };

  const contextCourse = hub.courses.find((c) => c.id === contextCourseId);
  const contextModules = hub.sortedModulesByCourse[contextCourseId] || [];

  const summary = query
    ? `Найдено ${visibleCourses.length} ${plural(visibleCourses.length, COURSE_FORMS)}`
    : `${totals.courses} ${plural(totals.courses, COURSE_FORMS)}, ${totals.modules} ${plural(totals.modules, MODULE_FORMS)}, ${totals.lessons} ${plural(totals.lessons, LESSON_FORMS)}`;

  const renderBody = () => {
    if (hub.loading) return <LoadingState variant="cards" rows={4} label="Загружаем курсы…" />;
    if (hub.error && hub.courses.length === 0) {
      return <ErrorState title="Не удалось загрузить курсы" error={hub.error} onRetry={hub.refetch} retrying={hub.fetching} />;
    }
    if (hub.courses.length === 0) {
      return (
        <Box sx={{ border: '1px dashed', borderColor: 'surface.borderStrong', borderRadius: 3, bgcolor: 'background.paper' }}>
          <EmptyState
            icon={<SchoolOutlined />}
            title="Курсов пока нет"
            description="Создайте первый курс, затем добавьте в него модули и уроки. Для курсов с кодами a1, a2, mahraj и tajweed автоматически действуют правила бесплатных уроков."
            action={
              <Button variant="contained" startIcon={<Add />} onClick={() => setCreateCourseOpen(true)}>
                Создать курс
              </Button>
            }
          />
        </Box>
      );
    }
    if (visibleCourses.length === 0) {
      return (
        <EmptyState
          size="sm"
          title="Ничего не найдено"
          description={`Нет курсов, модулей или уроков с «${searchQuery}» в названии.`}
          action={<Button onClick={() => setSearchQuery('')}>Сбросить поиск</Button>}
        />
      );
    }
    return (
      <Stack spacing={1.5}>
        {visibleCourses.map((course) => {
          const filter = filters ? filters[course.id] : null;
          return (
            <CourseCard
              key={course.id}
              course={course}
              modules={hub.sortedModulesByCourse[course.id] || []}
              looseLessons={hub.lessonGroupsByCourse[course.id]?.loose || []}
              lessonsByModule={hub.lessonGroupsByCourse[course.id]?.byModule || {}}
              expanded={!!filters || hub.expandedCourses.has(course.id)}
              toggleCourse={hub.toggleCourse}
              downloadCourseContent={hub.handleExportCourse}
              exportingCourseId={hub.exportingCourseId}
              onAddModule={(cid) => {
                setContextCourseId(cid);
                setCreateModuleOpen(true);
              }}
              onAddLesson={(cid, mid) => {
                setContextCourseId(cid);
                setContextModuleId(mid);
                setCreateLessonOpen(true);
              }}
              expandedModules={hub.expandedModules}
              toggleModule={hub.toggleModule}
              onRequestDeleteLesson={hub.handleDeleteLesson}
              deletingLessonId={hub.deletingLessonId}
              query={query}
              filter={filter}
            />
          );
        })}
      </Stack>
    );
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <Box>
        <PageHeader
          title="Курсы и уроки"
          subtitle="Курсы, модули и уроки в порядке показа в приложении. Перетаскивайте модули и уроки, чтобы изменить порядок."
          actions={
            <>
              {userRole === 'admin' && <RichTextMigrationButton />}
              <Button
                variant="outlined"
                component={RouterLink}
                to="/content/onboarding-placement/diagnostic"
                startIcon={<QuizOutlined fontSize="small" />}
              >
                Диагностический тест
              </Button>
              <Button variant="contained" startIcon={<Add />} onClick={() => setCreateCourseOpen(true)}>
                Создать курс
              </Button>
            </>
          }
        />

        {hub.courses.length > 0 && (
          <Toolbar
            hasActiveFilters={!!query}
            onReset={() => setSearchQuery('')}
            summary={summary}
            actions={
              <Tooltip title={allExpanded ? 'Свернуть все курсы и модули' : 'Развернуть все курсы и модули'}>
                <span>
                  <Button
                    variant="text"
                    size="small"
                    disabled={!!query}
                    startIcon={allExpanded ? <UnfoldLess /> : <UnfoldMore />}
                    onClick={toggleAll}
                  >
                    {allExpanded ? 'Свернуть всё' : 'Развернуть всё'}
                  </Button>
                </span>
              </Tooltip>
            }
          >
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Курс, модуль или урок"
              label="Поиск по курсам, модулям и урокам"
              enableSlashShortcut
            />
          </Toolbar>
        )}

        <Box sx={{ position: 'relative' }}>
          {(hub.reordering || (hub.fetching && !hub.loading)) && (
            <LinearProgress
              aria-label="Обновление"
              sx={{ position: 'absolute', top: -8, left: 0, right: 0, height: 2, borderRadius: 1 }}
            />
          )}
          {renderBody()}
        </Box>

        <CreateCourseModal
          open={createCourseOpen}
          onClose={() => setCreateCourseOpen(false)}
          onSubmit={(data: any) => createCourseMutation.mutate(data)}
          submitting={createCourseMutation.isPending}
          existingCodes={hub.courses.map((c) => c.code || '')}
          suggestedOrderIndex={nextOrder(hub.courses)}
        />

        <CreateModuleModal
          open={createModuleOpen}
          onClose={() => setCreateModuleOpen(false)}
          onSubmit={(data: any) => createModuleMutation.mutate({ courseId: contextCourseId, ...data })}
          submitting={createModuleMutation.isPending}
          courseTitle={contextCourse?.titleRu}
          suggestedOrderIndex={nextOrder(contextModules)}
        />

        <CreateLessonModal
          open={createLessonOpen}
          onClose={() => setCreateLessonOpen(false)}
          contextModuleId={contextModuleId}
          moduleListForContextCourse={contextModules}
          onSubmit={(data: any) => createLessonMutation.mutate({ courseId: contextCourseId, isPremium: false, isTest: false, ...data })}
          submitting={createLessonMutation.isPending}
          courseTitle={contextCourse?.titleRu}
          suggestOrderIndex={(mid) => {
            const groups = hub.lessonGroupsByCourse[contextCourseId];
            return nextOrder((mid ? groups?.byModule[mid] : groups?.loose) || []);
          }}
        />
      </Box>
    </DndContext>
  );
}
