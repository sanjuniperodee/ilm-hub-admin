import type { HubLesson, HubModule, LessonAccess } from './types';

/**
 * Client-side mirror of `backend copy/src/modules/courses/course-access-policy.ts`.
 * Used only to show informational Free / Premium badges in the content hub —
 * the backend is the source of truth and enforces access on its own.
 */
export const FREE_TIER_LESSONS_PER_SECTION = 3;
export const MAHRAJ_FREE_LESSONS = 5;

export type AccessRuleKind = 'mahraj' | 'perSection' | 'premiumOnly' | 'lessonFlag';

export interface CourseAccessRule {
  kind: AccessRuleKind;
  /** Short sentence for the course header. */
  summary: string;
  /** Longer explanation for a tooltip. */
  details: string;
}

export function getCourseAccessRule(courseCode: string | undefined | null): CourseAccessRule {
  const code = String(courseCode ?? '').trim().toLowerCase();
  if (code === 'mahraj') {
    return {
      kind: 'mahraj',
      summary: `Первые ${MAHRAJ_FREE_LESSONS} уроков курса бесплатны`,
      details: `Бесплатны первые ${MAHRAJ_FREE_LESSONS} уроков в порядке курса: сначала уроки вне модулей, затем модули по порядку. Остальные — Premium.`,
    };
  }
  if (code === 'tajweed') {
    return {
      kind: 'premiumOnly',
      summary: 'Весь курс доступен только с Premium',
      details: 'Все уроки курса таджвида закрыты для пользователей без Premium.',
    };
  }
  if (code === 'a1' || code === 'a2') {
    return {
      kind: 'perSection',
      summary: `Первые ${FREE_TIER_LESSONS_PER_SECTION} урока каждого раздела бесплатны`,
      details: `В каждом модуле (и в блоке уроков вне модулей) бесплатны первые ${FREE_TIER_LESSONS_PER_SECTION} урока. Остальные — Premium.`,
    };
  }
  return {
    kind: 'lessonFlag',
    summary: 'Доступ задаётся флагом Premium у урока',
    details: 'Для этого курса нет общего правила: урок платный, если у него включён флаг Premium.',
  };
}

/**
 * Computes the informational access tier for every lesson in a course.
 * Order matches the backend: lessons outside modules first, then modules by order,
 * lessons inside each section by order.
 */
export function computeLessonAccess(
  courseCode: string | undefined | null,
  looseLessons: HubLesson[],
  modules: HubModule[],
  lessonsByModule: Record<string, HubLesson[]>,
): Map<string, LessonAccess> {
  const rule = getCourseAccessRule(courseCode);
  const result = new Map<string, LessonAccess>();
  const sections: HubLesson[][] = [looseLessons, ...modules.map((m) => lessonsByModule[m.id] || [])];
  let indexInCourse = 0;
  for (const section of sections) {
    section.forEach((lesson, indexInSection) => {
      let premium: boolean;
      switch (rule.kind) {
        case 'mahraj':
          premium = indexInCourse >= MAHRAJ_FREE_LESSONS;
          break;
        case 'premiumOnly':
          premium = true;
          break;
        case 'perSection':
          premium = indexInSection >= FREE_TIER_LESSONS_PER_SECTION;
          break;
        default:
          premium = !!lesson.isPremium;
      }
      result.set(lesson.id, premium ? 'premium' : 'free');
      indexInCourse += 1;
    });
  }
  return result;
}

/** Russian plural helper: plural(5, ['урок', 'урока', 'уроков']). */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

export const LESSON_FORMS: [string, string, string] = ['урок', 'урока', 'уроков'];
export const MODULE_FORMS: [string, string, string] = ['модуль', 'модуля', 'модулей'];
export const COURSE_FORMS: [string, string, string] = ['курс', 'курса', 'курсов'];
export const USER_FORMS: [string, string, string] = ['пользователь', 'пользователя', 'пользователей'];
export const QUESTION_FORMS: [string, string, string] = ['вопрос', 'вопроса', 'вопросов'];
