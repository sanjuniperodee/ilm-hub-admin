import { useState, useEffect, useMemo } from 'react';
import {
  getCourses,
  getModules,
  getLessons,
  deleteLesson,
  reorderModules,
  reorderLessons,
  getLessonDeletionImpact,
  exportCourseContent,
} from '../../api/adminApi';
import { HubCourse, HubModule, HubLesson } from './types';
import { arrayMove } from '@dnd-kit/sortable';

export function useContentHub(urlCourseId?: string, urlModuleId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [courses, setCourses] = useState<HubCourse[]>([]);
  const [modulesByCourse, setModulesByCourse] = useState<Record<string, HubModule[]>>({});
  const [lessonsByCourse, setLessonsByCourse] = useState<Record<string, HubLesson[]>>({});
  
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [exportingCourseId, setExportingCourseId] = useState<string | null>(null);

  const notifyError = (e: any, fallback: string) => {
    const msg = e?.response?.data?.message?.[0] || e?.message || fallback;
    setError(msg);
  };

  const notifySuccess = (msg: string) => {
    setSuccess(msg);
    setError('');
  };

  const loadCourses = async () => {
    const [coursesRes, modulesRes, lessonsRes] = await Promise.all([
      getCourses(),
      getModules(),
      getLessons()
    ]);
    const coursesData = Array.isArray(coursesRes.data) ? coursesRes.data : [];
    const modulesData = Array.isArray(modulesRes.data) ? modulesRes.data : [];
    const lessonsData = Array.isArray(lessonsRes.data) ? lessonsRes.data : [];

    const mapped = coursesData.map((c: any) => ({
      id: c.id,
      code: c.code,
      titleRu: c.titleRu,
      orderIndex: c.orderIndex ?? 0,
    }));
    setCourses(mapped.sort((a, b) => a.orderIndex - b.orderIndex));

    const newMods: Record<string, HubModule[]> = {};
    const newLess: Record<string, HubLesson[]> = {};

    mapped.forEach((c: any) => {
      newMods[c.id] = [];
      newLess[c.id] = [];
    });

    modulesData.forEach((m: any) => {
      if (!newMods[m.courseId]) newMods[m.courseId] = [];
      newMods[m.courseId].push({
        id: m.id,
        courseId: m.courseId,
        titleRu: m.titleRu,
        orderIndex: m.orderIndex ?? 0,
      });
    });

    lessonsData.forEach((l: any) => {
      if (!newLess[l.courseId]) newLess[l.courseId] = [];
      newLess[l.courseId].push({
        id: l.id,
        courseId: l.courseId,
        moduleId: l.moduleId ?? undefined,
        titleRu: l.titleRu,
        orderIndex: l.orderIndex ?? 0,
      });
    });

    setModulesByCourse(newMods);
    setLessonsByCourse(newLess);
  };

  const loadHierarchy = async (cid: string) => {
    const [modulesRes, lessonsRes] = await Promise.all([getModules(cid), getLessons(cid)]);
    const modulesData = Array.isArray(modulesRes.data) ? modulesRes.data : [];
    const lessonsData = Array.isArray(lessonsRes.data) ? lessonsRes.data : [];

    setModulesByCourse((prev) => ({
      ...prev,
      [cid]: modulesData.map((m: any) => ({
        id: m.id,
        courseId: m.courseId,
        titleRu: m.titleRu,
        orderIndex: m.orderIndex ?? 0,
      })),
    }));
    setLessonsByCourse((prev) => ({
      ...prev,
      [cid]: lessonsData.map((l: any) => ({
        id: l.id,
        courseId: l.courseId,
        moduleId: l.moduleId ?? undefined,
        titleRu: l.titleRu,
        orderIndex: l.orderIndex ?? 0,
      })),
    }));
  };

  useEffect(() => {
    setLoading(true);
    loadCourses()
      .catch((e) => notifyError(e, 'Не удалось загрузить курсы'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (urlCourseId) {
      setExpandedCourses((prev) => new Set([...prev, urlCourseId]));
      if (!modulesByCourse[urlCourseId]) {
        loadHierarchy(urlCourseId).catch((e) => notifyError(e, 'Не удалось загрузить иерархию'));
      }
    }
    if (urlModuleId) {
      setExpandedModules((prev) => new Set([...prev, urlModuleId]));
    }
  }, [urlCourseId, urlModuleId]);

  const toggleCourse = (cid: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
    if (!modulesByCourse[cid]) loadHierarchy(cid).catch(() => {});
  };

  const toggleModule = (mid: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(mid)) next.delete(mid);
      else next.add(mid);
      return next;
    });
  };

  const sortedModulesByCourse = useMemo(() => {
    return Object.fromEntries(
      Object.entries(modulesByCourse).map(([courseId, modules]) => [
        courseId,
        [...modules].sort((a, b) => a.orderIndex - b.orderIndex),
      ]),
    ) as Record<string, HubModule[]>;
  }, [modulesByCourse]);

  const sortedLessonsByCourse = useMemo(() => {
    return Object.fromEntries(
      Object.entries(lessonsByCourse).map(([courseId, lessons]) => [
        courseId,
        [...lessons].sort((a, b) => a.orderIndex - b.orderIndex),
      ]),
    ) as Record<string, HubLesson[]>;
  }, [lessonsByCourse]);

  const lessonGroupsByCourse = useMemo(() => {
    const grouped: Record<string, { byModule: Record<string, HubLesson[]>; loose: HubLesson[] }> = {};
    Object.entries(sortedLessonsByCourse).forEach(([courseId, lessons]) => {
      const byModule: Record<string, HubLesson[]> = {};
      const loose: HubLesson[] = [];
      lessons.forEach((lesson) => {
        if (!lesson.moduleId) {
          loose.push(lesson);
          return;
        }
        if (!byModule[lesson.moduleId]) byModule[lesson.moduleId] = [];
        byModule[lesson.moduleId].push(lesson);
      });
      grouped[courseId] = { byModule, loose };
    });
    return grouped;
  }, [sortedLessonsByCourse]);

  const handleDragModule = async (courseId: string, activeId: string, overId: string) => {
    const mods = sortedModulesByCourse[courseId] || [];
    const oldIndex = mods.findIndex((m) => m.id === activeId);
    const newIndex = mods.findIndex((m) => m.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    
    const reordered = arrayMove(mods, oldIndex, newIndex);
    try {
      await reorderModules(courseId, reordered.map((m) => m.id));
      setModulesByCourse((prev) => ({
        ...prev,
        [courseId]: reordered.map((m, i) => ({ ...m, orderIndex: i })),
      }));
      notifySuccess('Порядок модулей обновлён');
    } catch (e) {
      notifyError(e, 'Не удалось изменить порядок модулей');
    }
  };

  const handleDragLesson = async (courseId: string, moduleId: string, activeId: string, overId: string) => {
    const les = lessonGroupsByCourse[courseId]?.byModule[moduleId] || [];
    const oldIndex = les.findIndex((l) => l.id === activeId);
    const newIndex = les.findIndex((l) => l.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(les, oldIndex, newIndex);
    try {
      await reorderLessons(moduleId, reordered.map((l) => l.id));
      setLessonsByCourse((prev) => {
        const list = prev[courseId] || [];
        return {
          ...prev,
          [courseId]: list.map((l) => {
            if (l.moduleId !== moduleId) return l;
            const idx = reordered.findIndex((r) => r.id === l.id);
            return idx >= 0 ? { ...l, orderIndex: idx } : l;
          }),
        };
      });
      notifySuccess('Порядок уроков обновлён');
    } catch (e) {
      notifyError(e, 'Не удалось изменить порядок уроков');
    }
  };

  const handleDeleteLesson = async (lesson: HubLesson, courseId: string) => {
    try {
      const { data } = await getLessonDeletionImpact(lesson.id);
      const n = data?.distinctUserCount ?? 0;
      
      const ruUsersWord = (num: number) => {
        if (num % 10 === 1 && num % 100 !== 11) return 'пользователь';
        if (num % 10 >= 2 && num % 10 <= 4 && (num % 100 < 10 || num % 100 >= 20)) return 'пользователя';
        return 'пользователей';
      };

      const progressHint = n > 0 
        ? `\n\nВнимание: у ${n} ${ruUsersWord(n)} есть прогресс по уроку или мини-тесту. Эти данные будут удалены.` 
        : '';
        
      if (!window.confirm(`Удалить урок «${lesson.titleRu}»? Действие нельзя отменить.${progressHint}`)) {
        return;
      }
      setDeletingLessonId(lesson.id);
      await deleteLesson(lesson.id);
      await loadHierarchy(courseId);
      notifySuccess('Урок удалён');
    } catch (e) {
      notifyError(e, 'Не удалось удалить урок');
    } finally {
      setDeletingLessonId(null);
    }
  };

  const handleExportCourse = async (course: HubCourse) => {
    setExportingCourseId(course.id);
    try {
      const response = await exportCourseContent(course.id);
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const disposition = String(response.headers['content-disposition'] || '');
      const encodedFilename = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
      const plainFilename = disposition.match(/filename="([^"]+)"/)?.[1];
      const filename = encodedFilename
        ? decodeURIComponent(encodedFilename)
        : plainFilename || `ilmhub-${course.code || 'course'}-content-export.xlsx`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notifySuccess(`Экспорт «${course.titleRu}» готов`);
    } catch (e) {
      notifyError(e, 'Не удалось выгрузить контент курса');
    } finally {
      setExportingCourseId(null);
    }
  };

  return {
    courses,
    loading,
    error,
    setError,
    success,
    setSuccess,
    expandedCourses,
    expandedModules,
    toggleCourse,
    toggleModule,
    sortedModulesByCourse,
    sortedLessonsByCourse,
    lessonGroupsByCourse,
    handleDragModule,
    handleDragLesson,
    handleDeleteLesson,
    deletingLessonId,
    handleExportCourse,
    exportingCourseId,
    loadCourses,
    loadHierarchy,
    notifySuccess,
    notifyError
  };
}
