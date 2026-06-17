import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  LinearProgress,
  Breadcrumbs,
  Link,
} from '@mui/material';
import { Add, ChevronRight, SchoolOutlined } from '@mui/icons-material';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useContentHub } from './content-hub/useContentHub';
import { CourseCard } from './content-hub/CourseCard';
import { CreateCourseModal, CreateModuleModal, CreateLessonModal } from './content-hub/CreateModals';
import { createCourse, createModule, createLesson } from '../api/adminApi';

export default function ContentHubPage() {
  const navigate = useNavigate();
  const { courseId: urlCourseId, moduleId: urlModuleId } = useParams<{ courseId?: string; moduleId?: string }>();

  const hub = useContentHub(urlCourseId, urlModuleId);

  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [createModuleOpen, setCreateModuleOpen] = useState(false);
  const [createLessonOpen, setCreateLessonOpen] = useState(false);

  const [contextCourseId, setContextCourseId] = useState('');
  const [contextModuleId, setContextModuleId] = useState('');

  const [newCourse, setNewCourse] = useState({ code: '', titleRu: '', orderIndex: 0, descriptionRu: '' });
  const [newModule, setNewModule] = useState({ titleRu: '', orderIndex: 0, descriptionRu: '' });
  const [newLesson, setNewLesson] = useState({ titleRu: '', orderIndex: 0, descriptionRu: '', estimatedMinutes: 10 });

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

  const createCourseHandler = async () => {
    if (!newCourse.code.trim() || !newCourse.titleRu.trim()) {
      hub.setError('Заполните code и название курса');
      return;
    }
    try {
      await createCourse({ ...newCourse, orderIndex: Number(newCourse.orderIndex) || 0 });
      setCreateCourseOpen(false);
      setNewCourse({ code: '', titleRu: '', orderIndex: 0, descriptionRu: '' });
      await hub.loadCourses();
      hub.notifySuccess('Курс создан');
    } catch (e) {
      hub.notifyError(e, 'Не удалось создать курс');
    }
  };

  const createModuleHandler = async () => {
    if (!contextCourseId) return;
    if (!newModule.titleRu.trim()) {
      hub.setError('Введите название модуля');
      return;
    }
    try {
      await createModule({
        courseId: contextCourseId,
        titleRu: newModule.titleRu,
        descriptionRu: newModule.descriptionRu || undefined,
        orderIndex: Number(newModule.orderIndex) || 0,
      });
      setCreateModuleOpen(false);
      setNewModule({ titleRu: '', orderIndex: 0, descriptionRu: '' });
      await hub.loadHierarchy(contextCourseId);
      hub.notifySuccess('Модуль создан');
    } catch (e) {
      hub.notifyError(e, 'Не удалось создать модуль');
    }
  };

  const createLessonHandler = async () => {
    if (!contextCourseId) return;
    if (!newLesson.titleRu.trim()) {
      hub.setError('Введите название урока');
      return;
    }
    try {
      await createLesson({
        courseId: contextCourseId,
        moduleId: contextModuleId || undefined,
        titleRu: newLesson.titleRu,
        descriptionRu: newLesson.descriptionRu || undefined,
        estimatedMinutes: Number(newLesson.estimatedMinutes) || 10,
        orderIndex: Number(newLesson.orderIndex) || 0,
        isPremium: false,
        isTest: false,
      });
      setCreateLessonOpen(false);
      setNewLesson({ titleRu: '', orderIndex: 0, descriptionRu: '', estimatedMinutes: 10 });
      setContextModuleId('');
      await hub.loadHierarchy(contextCourseId);
      hub.notifySuccess('Урок создан');
    } catch (e) {
      hub.notifyError(e, 'Не удалось создать урок');
    }
  };

  const urlCourse = hub.courses.find((c) => c.id === urlCourseId);
  const urlModule = urlCourseId && urlModuleId ? (hub.sortedModulesByCourse[urlCourseId] || []).find((m) => m.id === urlModuleId) : null;

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
              Онбординг: Диагностика
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

        {hub.error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{hub.error}</Alert>}
        {hub.success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{hub.success}</Alert>}

        <Box sx={{ mb: 4 }}>
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
        </Box>

        <Stack spacing={3}>
          {hub.courses.length === 0 && !hub.loading ? (
            <Box sx={{ textAlign: 'center', py: 8, px: 2, border: '1px dashed grey', borderRadius: 3, bgcolor: 'background.paper' }}>
              <SchoolOutlined sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>Нет курсов</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>Создайте свой первый курс, чтобы начать.</Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => setCreateCourseOpen(true)} sx={{ borderRadius: 2 }}>
                Создать курс
              </Button>
            </Box>
          ) : (
            hub.courses.map((course) => (
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
          newCourse={newCourse}
          setNewCourse={setNewCourse}
          onSubmit={createCourseHandler}
        />

        <CreateModuleModal
          open={createModuleOpen}
          onClose={() => setCreateModuleOpen(false)}
          newModule={newModule}
          setNewModule={setNewModule}
          onSubmit={createModuleHandler}
        />

        <CreateLessonModal
          open={createLessonOpen}
          onClose={() => setCreateLessonOpen(false)}
          newLesson={newLesson}
          setNewLesson={setNewLesson}
          contextModuleId={contextModuleId}
          setContextModuleId={setContextModuleId}
          moduleListForContextCourse={hub.sortedModulesByCourse[contextCourseId] || []}
          onSubmit={createLessonHandler}
        />
      </Box>
    </DndContext>
  );
}
