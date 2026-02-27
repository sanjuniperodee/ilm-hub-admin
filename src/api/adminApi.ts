import apiClient from './client'

// Auth
export const login = async (email: string, password: string) => {
  const response = await apiClient.post('/auth/login', { email, password })
  if (response.data.accessToken) {
    localStorage.setItem('admin_token', response.data.accessToken)
  }
  return response.data
}

// Users
export const getUsers = () => apiClient.get('/admin/users')
export const getUserById = (id: string) => apiClient.get(`/admin/users/${id}`)

// User dashboard (admin)
export const getUserLearningSummary = (userId: string) =>
  apiClient.get(`/admin/users/${userId}/learning-summary`)
export const getUserCoursesProgress = (userId: string) =>
  apiClient.get(`/admin/users/${userId}/courses-progress`)
export const getUserTestsAttempts = (userId: string, params?: { testType?: string; courseId?: string }) =>
  apiClient.get(`/admin/users/${userId}/tests-attempts`, { params })
export const getUserAchievements = (userId: string) =>
  apiClient.get(`/admin/users/${userId}/achievements`)
export const getUserStreaks = (userId: string) =>
  apiClient.get(`/admin/users/${userId}/streaks`)

// Courses
export const getCourses = () => apiClient.get('/admin/courses')
export const getCourseById = (id: string) => apiClient.get(`/admin/courses/${id}`)
export const createCourse = (data: any) => apiClient.post('/admin/courses', data)
export const updateCourse = (id: string, data: any) => apiClient.patch(`/admin/courses/${id}`, data)
export const deleteCourse = (id: string) => apiClient.delete(`/admin/courses/${id}`)

// Modules
export const getModules = (courseId?: string) => {
  if (courseId) {
    return apiClient.get(`/admin/courses/${courseId}/modules`)
  }
  return apiClient.get('/admin/modules')
}
export const getModuleById = (id: string) => apiClient.get(`/admin/modules/${id}`)
export const createModule = (data: any) => apiClient.post('/admin/modules', data)
export const updateModule = (id: string, data: any) => apiClient.patch(`/admin/modules/${id}`, data)
export const deleteModule = (id: string) => apiClient.delete(`/admin/modules/${id}`)

// Lessons
export const getLessons = (courseId?: string, moduleId?: string) => {
  if (moduleId) {
    return apiClient.get(`/admin/modules/${moduleId}/lessons`)
  }
  if (courseId) {
    return apiClient.get(`/admin/courses/${courseId}/lessons`)
  }
  return apiClient.get('/admin/lessons')
}
export const getLessonById = (id: string) => apiClient.get(`/admin/lessons/${id}`)
export const createLesson = (data: any) => apiClient.post('/admin/lessons', data)
export const updateLesson = (id: string, data: any) => apiClient.patch(`/admin/lessons/${id}`, data)
export const deleteLesson = (id: string) => apiClient.delete(`/admin/lessons/${id}`)

// Lesson Blocks
export const getLessonBlocks = (lessonId?: string) => {
  if (lessonId) {
    return apiClient.get(`/admin/lessons/${lessonId}/blocks`)
  }
  return apiClient.get('/admin/lesson-blocks')
}
export const getLessonBlockById = (id: string) => apiClient.get(`/admin/lesson-blocks/${id}`)
export const createLessonBlock = (data: any) => apiClient.post('/admin/lesson-blocks', data)
export const updateLessonBlock = (id: string, data: any) => apiClient.patch(`/admin/lesson-blocks/${id}`, data)
export const deleteLessonBlock = (id: string) => apiClient.delete(`/admin/lesson-blocks/${id}`)

// Media uploads for lesson blocks
export const uploadBlockMedia = (
  blockId: string,
  file: File,
  type: 'image' | 'audio' | 'video',
  description?: string,
  locale?: string
) => {
  const formData = new FormData()
  formData.append('file', file)
  if (description) formData.append('description', description)
  if (locale) formData.append('locale', locale)
  return apiClient.post(`/admin/lesson-blocks/${blockId}/upload-${type}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const getBlockMedia = (blockId: string) =>
  apiClient.get(`/admin/lesson-blocks/${blockId}/media`)

export const deleteBlockMedia = (blockId: string, mediaFileId: string) =>
  apiClient.delete(`/admin/lesson-blocks/${blockId}/media/${mediaFileId}`)

export const deleteMediaFile = (mediaFileId: string) =>
  apiClient.delete(`/admin/media/${mediaFileId}`)

export const reorderBlockMedia = (blockId: string, mediaFileIds: string[]) =>
  apiClient.patch(`/admin/lesson-blocks/${blockId}/reorder-media`, { mediaFileIds })

// Tests management (backend-copy courses module)
export const getTests = (params?: {
  testType?: 'lesson' | 'module' | 'level'
  lessonId?: string
  moduleId?: string
  levelCode?: string
}) => apiClient.get('/courses/admin/tests', { params })

export const getTestAttempts = (testId: string) =>
  apiClient.get(`/courses/admin/tests/${testId}/attempts`)

export const getTestStats = (testId: string) =>
  apiClient.get(`/courses/admin/tests/${testId}/stats`)

export const createTest = (data: any) => apiClient.post('/courses/admin/tests', data)
export const updateTestMeta = (id: string, data: any) => apiClient.patch(`/courses/admin/tests/${id}`, data)
export const deleteTest = (id: string) => apiClient.delete(`/courses/admin/tests/${id}`)

export const createTestQuestion = (miniTestId: string, data: any) =>
  apiClient.post(`/courses/admin/tests/${miniTestId}/questions`, data)
export const updateTestQuestion = (id: string, data: any) =>
  apiClient.patch(`/courses/admin/tests/questions/${id}`, data)
export const deleteTestQuestion = (id: string) =>
  apiClient.delete(`/courses/admin/tests/questions/${id}`)

export const createTestAnswer = (questionId: string, data: any) =>
  apiClient.post(`/courses/admin/tests/questions/${questionId}/answers`, data)
export const updateTestAnswer = (id: string, data: any) =>
  apiClient.patch(`/courses/admin/tests/answers/${id}`, data)
export const deleteTestAnswer = (id: string) =>
  apiClient.delete(`/courses/admin/tests/answers/${id}`)

// Words / Alphabet (backend-copy words module)
export const getWordsAlphabet = () => apiClient.get('/admin/words/alphabet')

export const getWordLetter = (code: string) => apiClient.get(`/admin/words/alphabet/${code}`)

export const updateWordLetter = (code: string, data: any) =>
  apiClient.patch(`/admin/words/alphabet/${code}`, data)

export const uploadWordLetterAudio = (code: string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post(`/admin/words/alphabet/${code}/upload-audio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// Words / Dictionary (backend-copy words module)
export const getWordsDictionary = () => apiClient.get('/admin/words/dictionary')

export const getWordsDictionaryEntry = (id: string) =>
  apiClient.get(`/admin/words/dictionary/${id}`)

export const createWordsDictionaryEntry = (data: any) =>
  apiClient.post('/admin/words/dictionary', data)

export const updateWordsDictionaryEntry = (id: string, data: any) =>
  apiClient.patch(`/admin/words/dictionary/${id}`, data)

export const deleteWordsDictionaryEntry = (id: string) =>
  apiClient.post(`/admin/words/dictionary/delete/${id}`)

export const uploadWordsDictionaryEntryAudio = (id: string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post(`/admin/words/dictionary/${id}/upload-audio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const createWordsDictionaryExample = (entryId: string, data: any) =>
  apiClient.post(`/admin/words/dictionary/${entryId}/examples`, data)

export const updateWordsDictionaryExample = (id: string, data: any) =>
  apiClient.patch(`/admin/words/dictionary/examples/${id}`, data)

export const deleteWordsDictionaryExample = (id: string) =>
  apiClient.post(`/admin/words/dictionary/examples/delete/${id}`)

export const uploadWordsDictionaryExampleAudio = (id: string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post(`/admin/words/dictionary/examples/${id}/upload-audio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const reorderWordsDictionaryExamples = (entryId: string, exampleIds: string[]) =>
  apiClient.post(`/admin/words/dictionary/${entryId}/examples/reorder`, { exampleIds })

