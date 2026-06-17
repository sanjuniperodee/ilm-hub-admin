import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
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

export function useContentHub() {
  const queryClient = useQueryClient();

  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [exportingCourseId, setExportingCourseId] = useState<string | null>(null);
  
  // Queries
  const { data: coursesData, isLoading: loadingCourses } = useQuery({
    queryKey: ['hub', 'courses'],
    queryFn: getCourses,
  });

  const { data: modulesData, isLoading: loadingModules } = useQuery({
    queryKey: ['hub', 'modules'],
    queryFn: () => getModules(),
  });

  const { data: lessonsData, isLoading: loadingLessons } = useQuery({
    queryKey: ['hub', 'lessons'],
    queryFn: () => getLessons(),
  });

  const loading = loadingCourses || loadingModules || loadingLessons;

  // Computed state
  const courses = useMemo(() => {
    const arr = Array.isArray(coursesData?.data) ? coursesData.data : [];
    return arr.map((c: any) => ({
      id: c.id,
      code: c.code,
      titleRu: c.titleRu,
      orderIndex: c.orderIndex ?? 0,
    })).sort((a: HubCourse, b: HubCourse) => a.orderIndex - b.orderIndex);
  }, [coursesData]);

  const { sortedModulesByCourse } = useMemo(() => {
    const map: Record<string, HubModule[]> = {};
    const sortedMap: Record<string, HubModule[]> = {};
    courses.forEach((c: HubCourse) => { map[c.id] = []; sortedMap[c.id] = []; });
    
    const arr = Array.isArray(modulesData?.data) ? modulesData.data : [];
    arr.forEach((m: any) => {
      if (!map[m.courseId]) {
        map[m.courseId] = [];
        sortedMap[m.courseId] = [];
      }
      map[m.courseId].push({
        id: m.id,
        courseId: m.courseId,
        titleRu: m.titleRu,
        orderIndex: m.orderIndex ?? 0,
      });
    });

    Object.keys(map).forEach(cid => {
      sortedMap[cid] = [...map[cid]].sort((a, b) => a.orderIndex - b.orderIndex);
    });

    return { sortedModulesByCourse: sortedMap };
  }, [courses, modulesData]);

  const { sortedLessonsByCourse, lessonGroupsByCourse } = useMemo(() => {
    const map: Record<string, HubLesson[]> = {};
    const sortedMap: Record<string, HubLesson[]> = {};
    courses.forEach((c: HubCourse) => { map[c.id] = []; sortedMap[c.id] = []; });

    const arr = Array.isArray(lessonsData?.data) ? lessonsData.data : [];
    arr.forEach((l: any) => {
      if (!map[l.courseId]) {
        map[l.courseId] = [];
        sortedMap[l.courseId] = [];
      }
      map[l.courseId].push({
        id: l.id,
        courseId: l.courseId,
        moduleId: l.moduleId ?? undefined,
        titleRu: l.titleRu,
        orderIndex: l.orderIndex ?? 0,
      });
    });

    const groups: Record<string, { byModule: Record<string, HubLesson[]>; loose: HubLesson[] }> = {};

    Object.keys(map).forEach(cid => {
      const sorted = [...map[cid]].sort((a, b) => a.orderIndex - b.orderIndex);
      sortedMap[cid] = sorted;

      const byModule: Record<string, HubLesson[]> = {};
      const loose: HubLesson[] = [];
      sorted.forEach((lesson) => {
        if (!lesson.moduleId) {
          loose.push(lesson);
          return;
        }
        if (!byModule[lesson.moduleId]) byModule[lesson.moduleId] = [];
        byModule[lesson.moduleId].push(lesson);
      });
      groups[cid] = { byModule, loose };
    });

    return { sortedLessonsByCourse: sortedMap, lessonGroupsByCourse: groups };
  }, [courses, lessonsData]);

  // Expand logic
  const toggleCourse = (cid: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  };

  const toggleModule = (mid: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(mid)) next.delete(mid);
      else next.add(mid);
      return next;
    });
  };

  // Mutations
  const reorderModulesMutation = useMutation({
    mutationFn: ({ courseId, moduleIds }: { courseId: string; moduleIds: string[] }) => reorderModules(courseId, moduleIds),
    onSuccess: () => {
      toast.success('Порядок модулей обновлён');
      queryClient.invalidateQueries({ queryKey: ['hub', 'modules'] });
    },
    onError: () => toast.error('Не удалось изменить порядок модулей'),
  });

  const handleDragModule = async (courseId: string, activeId: string, overId: string) => {
    const mods = sortedModulesByCourse[courseId] || [];
    const oldIndex = mods.findIndex((m) => m.id === activeId);
    const newIndex = mods.findIndex((m) => m.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Optimistic UI could be implemented here via queryClient.setQueryData, but refetching is fine for admin
    const reordered = arrayMove(mods, oldIndex, newIndex);
    reorderModulesMutation.mutate({ courseId, moduleIds: reordered.map(m => m.id) });
  };

  const reorderLessonsMutation = useMutation({
    mutationFn: ({ moduleId, lessonIds }: { moduleId: string; lessonIds: string[] }) => reorderLessons(moduleId, lessonIds),
    onSuccess: () => {
      toast.success('Порядок уроков обновлён');
      queryClient.invalidateQueries({ queryKey: ['hub', 'lessons'] });
    },
    onError: () => toast.error('Не удалось изменить порядок уроков'),
  });

  const handleDragLesson = async (courseId: string, moduleId: string, activeId: string, overId: string) => {
    const les = lessonGroupsByCourse[courseId]?.byModule[moduleId] || [];
    const oldIndex = les.findIndex((l) => l.id === activeId);
    const newIndex = les.findIndex((l) => l.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(les, oldIndex, newIndex);
    reorderLessonsMutation.mutate({ moduleId, lessonIds: reordered.map(l => l.id) });
  };

  const deleteLessonMutation = useMutation({
    mutationFn: deleteLesson,
    onSuccess: () => {
      toast.success('Урок удалён');
      queryClient.invalidateQueries({ queryKey: ['hub', 'lessons'] });
      setDeletingLessonId(null);
    },
    onError: () => {
      toast.error('Не удалось удалить урок');
      setDeletingLessonId(null);
    },
  });

  const handleDeleteLesson = async (lesson: HubLesson) => {
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
        
      const userInput = window.prompt(`Введите слово DELETE для удаления урока «${lesson.titleRu}». Действие нельзя отменить.${progressHint}`);
      
      if (userInput !== 'DELETE') {
        if (userInput !== null) toast.error('Удаление отменено: неверное слово подтверждения');
        return;
      }

      setDeletingLessonId(lesson.id);
      deleteLessonMutation.mutate(lesson.id);
    } catch (e) {
      toast.error('Не удалось получить информацию об уроке');
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
      toast.success(`Экспорт «${course.titleRu}» готов`);
    } catch (e) {
      toast.error('Не удалось выгрузить контент курса');
    } finally {
      setExportingCourseId(null);
    }
  };

  return {
    courses,
    loading,
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
    setExpandedCourses,
    setExpandedModules
  };
}
