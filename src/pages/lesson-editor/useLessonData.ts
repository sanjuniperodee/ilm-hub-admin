import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getCourseById,
  getCourses,
  getLessonBlocks,
  getLessonById,
  getModuleById,
  getModules,
  getTestMedia,
  getTests,
} from '../../api/adminApi'
import type { MediaFile, StudioBlock } from './types'

/**
 * Loads the lesson with its context (course, module, course list for re-assignment),
 * ordered blocks and the lesson mini-test. `reload()` re-fetches everything — the same
 * sequence the editor has always used after each mutation.
 */
export function useLessonData(lessonId: string | undefined) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [lesson, setLesson] = useState<any>(null)
  const [course, setCourse] = useState<any>(null)
  const [module, setModule] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [blocks, setBlocks] = useState<StudioBlock[]>([])
  const [lessonTest, setLessonTest] = useState<any | null>(null)
  const [testMediaFiles, setTestMediaFiles] = useState<MediaFile[]>([])
  const loadedOnce = useRef(false)

  const loadTestMedia = useCallback(async (miniTestId: string) => {
    try {
      const { data } = await getTestMedia(miniTestId)
      setTestMediaFiles(Array.isArray(data) ? data : [])
    } catch {
      setTestMediaFiles([])
    }
  }, [])

  /** Resolves to the fresh block list (or null if loading failed). */
  const reload = useCallback(async (): Promise<StudioBlock[] | null> => {
    if (!lessonId) return null
    if (loadedOnce.current) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const [lessonRes, coursesRes] = await Promise.all([getLessonById(lessonId), getCourses()])
      const lessonData = lessonRes.data
      setLesson(lessonData)
      setCourses(coursesRes.data || [])

      if (lessonData?.courseId) {
        const { data: courseData } = await getCourseById(lessonData.courseId)
        setCourse(courseData)
        const { data: mods } = await getModules(lessonData.courseId)
        setModules(mods || [])
      } else {
        setCourse(null)
        setModules([])
      }

      if (lessonData?.moduleId) {
        const { data: moduleData } = await getModuleById(lessonData.moduleId)
        setModule(moduleData)
      } else setModule(null)

      const { data: blocksData } = await getLessonBlocks(lessonId)
      const mapped: StudioBlock[] = (Array.isArray(blocksData) ? blocksData : [])
        .map((b: any) => ({
          id: b.id,
          lessonId: b.lessonId,
          type: b.type,
          orderIndex: b.orderIndex ?? 0,
          contentRu: b.contentRu,
          contentKz: b.contentKz,
        }))
        .sort((a: StudioBlock, b: StudioBlock) => a.orderIndex - b.orderIndex)
      setBlocks(mapped)

      const { data: testsData } = await getTests({ testType: 'lesson', lessonId })
      const list = Array.isArray(testsData) ? testsData : []
      setLessonTest(list[0] ?? null)
      if (list[0]?.id) {
        await loadTestMedia(list[0].id)
      }
      loadedOnce.current = true
      return mapped
    } catch (e) {
      setError(e)
      return null
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [lessonId, loadTestMedia])

  useEffect(() => {
    loadedOnce.current = false
    void reload()
  }, [reload])

  return {
    loading,
    refreshing,
    error,
    lesson,
    setLesson,
    course,
    module,
    courses,
    modules,
    blocks,
    setBlocks,
    lessonTest,
    setLessonTest,
    testMediaFiles,
    loadTestMedia,
    reload,
  }
}
