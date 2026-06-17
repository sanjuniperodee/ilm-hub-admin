import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Stack,
  LinearProgress,
  Breadcrumbs,
  Link,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Add, ChevronRight, SchoolOutlined, Search } from '@mui/icons-material';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useContentHub } from './content-hub/useContentHub';
import { CourseCard } from './content-hub/CourseCard';
import { CreateCourseModal, CreateModuleModal, CreateLessonModal } from './content-hub/CreateModals';
import { createCourse, createModule, createLesson } from '../api/adminApi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function ContentHubPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { courseId: urlCourseId, moduleId: urlModuleId } = useParams<{ courseId?: string; moduleId?: string }>();

  const hub = useContentHub();

  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [createModuleOpen, setCreateModuleOpen] = useState(false);
  const [createLessonOpen, setCreateLessonOpen] = useState(false);

  const [contextCourseId, setContextCourseId] = useState('');
  const [contextModuleId, setContextModuleId] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeData = active.data.current;
    const overData = over.data.current;
    if (!activeData?.type || activeData.type !== overData?.type) return;

    if (activeData.type === 'module' && activeData.courseId) {
      await hub.handleDragModule(activeData.courseId, active.id, over.id);
    } else if (activeData.type === 'lesson' && activeData.moduleId && activeData.courseId) {
      await hub.handleDragLesson(activeData.courseId, activeData.moduleId, active.id, over.id);
    }
  };

  const createCourseMutation = useMutation({
    mutationFn: createCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub', 'courses'] });
      setCreateCourseOpen(false);
      toast.success('Курс создан');
    },
    onError: () => toast.error('Не удалось создать курс'),
  });

  const createModuleMutation = useMutation({
    mutationFn: createModule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub', 'modules'] });
      setCreateModuleOpen(false);
      toast.success('Модуль создан');
    },
    onError: () => toast.error('Не удалось создать модуль'),
  });

  const createLessonMutation = useMutation({
    mutationFn: createLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub', 'lessons'] });
      setCreateLessonOpen(false);
      toast.success('Урок создан');
    },
    onError: () => toast.error('Не удалось создать урок'),
  });

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return hub.courses;
    const lowerQuery = searchQuery.toLowerCase();
    
    return hub.courses.filter(c => {
      const courseMatch = c.titleRu.toLowerCase().includes(lowerQuery) || c.code.toLowerCase().includes(lowerQuery);
      const modules = hub.sortedModulesByCourse[c.id] || [];
      const moduleMatch = modules.some(m => m.titleRu.toLowerCase().includes(lowerQuery));
      const lessons = hub.sortedLessonsByCourse[c.id] || [];
      const lessonMatch = lessons.some(l => l.titleRu.toLowerCase().includes(lowerQuery));
      
      // Auto-expand if child matched
      if (!courseMatch && (moduleMatch || lessonMatch)) {
        hub.setExpandedCourses(prev => new Set(prev).add(c.id));
      }
      
      return courseMatch || moduleMatch || lessonMatch;
    });
  }, [hub.courses, hub.sortedModulesByCourse, hub.sortedLessonsByCourse, searchQuery, hub.setExpandedCourses]);

  const urlCourse = hub.courses.find((c: any) => c.id === urlCourseId);
  const urlModule = urlCourseId && urlModuleId ? (hub.sortedModulesByCourse[urlCourseId] || []).find((m: any) => m.id === urlModuleId) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <Box sx={{ maxWidth: '1200px', mx: 'auto', py: 4, px: { xs: 2, md: 4 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>Контент HUB</Typography>
            <Typography variant="body1" color="text.secondary">
              Управление курсами, модулями и уроками. Перетаскивайте элементы для изменения порядка.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/content/onboarding-placement/diagnostic`)}
              sx={{ borderRadius: 2 }}
            >
              Онбординг
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateCourseOpen(true)}
              sx={{ borderRadius: 2 }}
            >
              Создать курс
            </Button>
          </Stack>
        </Stack>

        {hub.loading && (
          <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />
        )}

        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Breadcrumbs separator={<ChevronRight fontSize="small" />}>
            <Link
              component="button"
              onClick={() => navigate('/content')}
              sx={{ color: urlCourseId ? 'text.secondary' : 'text.primary', fontWeight: urlCourseId ? 400 : 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Контент
            </Link>
            {urlCourse && (
              <Link
                component="button"
                onClick={() => navigate(`/content/courses/${urlCourse.id}`)}
                sx={{ color: urlModuleId ? 'text.secondary' : 'text.primary', fontWeight: urlModuleId ? 400 : 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {urlCourse.code}
              </Link>
            )}
            {urlModule && (
              <Typography color="text.primary" fontWeight="600">{urlModule.titleRu}</Typography>
            )}
          </Breadcrumbs>

          <TextField
            placeholder="Поиск по курсам, модулям, урокам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: { xs: '100%', md: '300px' }, mt: { xs: 2, md: 0 } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
            }}
          />
        </Stack>

        <Stack spacing={3}>
          {filteredCourses.length === 0 && !hub.loading ? (
            <Box sx={{ textAlign: 'center', py: 8, px: 2, border: '1px dashed grey', borderRadius: 3, bgcolor: 'background.paper' }}>
              <SchoolOutlined sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>Нет курсов</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>{searchQuery ? 'По вашему запросу ничего не найдено.' : 'Создайте свой первый курс, чтобы начать.'}</Typography>
              {!searchQuery && (
                <Button variant="contained" startIcon={<Add />} onClick={() => setCreateCourseOpen(true)} sx={{ borderRadius: 2 }}>
                  Создать курс
                </Button>
              )}
            </Box>
          ) : (
            filteredCourses.map((course: any) => (
              <CourseCard
                key={course.id}
                course={course}
                modules={hub.sortedModulesByCourse[course.id] || []}
                totalLessons={hub.sortedLessonsByCourse[course.id]?.length || 0}
                looseLessons={hub.lessonGroupsByCourse[course.id]?.loose || []}
                lessonsByModule={hub.lessonGroupsByCourse[course.id]?.byModule || {}}
                expanded={hub.expandedCourses.has(course.id)}
                toggleCourse={hub.toggleCourse}
                openCourseEdit={(cid) => navigate(`/content/courses/${cid}/edit`)}
                openLevelTest={(level) => navigate(`/content/level-tests/${level}`)}
                openOnboardingPlacement={(slot) => navigate(`/content/onboarding-placement/${slot}`)}
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
                openModuleEdit={(cid, mid) => navigate(`/content/courses/${cid}/modules/${mid}/edit`)}
                openModuleTest={(cid, mid) => navigate(`/content/courses/${cid}/modules/${mid}/test`)}
                navigate={navigate}
                onRequestDeleteLesson={hub.handleDeleteLesson}
                deletingLessonId={hub.deletingLessonId}
              />
            ))
          )}
        </Stack>

        <CreateCourseModal
          open={createCourseOpen}
          onClose={() => setCreateCourseOpen(false)}
          onSubmit={(data: any) => createCourseMutation.mutate(data)}
        />

        <CreateModuleModal
          open={createModuleOpen}
          onClose={() => setCreateModuleOpen(false)}
          onSubmit={(data: any) => createModuleMutation.mutate({ courseId: contextCourseId, ...data })}
        />

        <CreateLessonModal
          open={createLessonOpen}
          onClose={() => setCreateLessonOpen(false)}
          contextModuleId={contextModuleId}
          moduleListForContextCourse={hub.sortedModulesByCourse[contextCourseId] || []}
          onSubmit={(data: any) => createLessonMutation.mutate({ courseId: contextCourseId, isPremium: false, isTest: false, ...data })}
        />
      </Box>
    </DndContext>
  );
}
