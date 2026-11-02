export interface HubCourse {
  id: string;
  code: string;
  titleRu: string;
  orderIndex: number;
  /** Optional extras used for display only (not sent anywhere). */
  titleKz?: string;
  level?: string;
  isPremium?: boolean;
}

export interface HubModule {
  id: string;
  courseId: string;
  titleRu: string;
  orderIndex: number;
  titleKz?: string;
}

export interface HubLesson {
  id: string;
  courseId: string;
  moduleId?: string;
  titleRu: string;
  orderIndex: number;
  isPremium?: boolean;
  isTest?: boolean;
  estimatedMinutes?: number;
}

/** Informational access tier of a lesson, computed client-side (the backend enforces it). */
export type LessonAccess = 'free' | 'premium';
