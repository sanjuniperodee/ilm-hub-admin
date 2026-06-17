export interface HubCourse {
  id: string;
  code: string;
  titleRu: string;
  orderIndex: number;
}

export interface HubModule {
  id: string;
  courseId: string;
  titleRu: string;
  orderIndex: number;
}

export interface HubLesson {
  id: string;
  courseId: string;
  moduleId?: string;
  titleRu: string;
  orderIndex: number;
}
