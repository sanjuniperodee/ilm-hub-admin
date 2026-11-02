import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TestEditorShared } from '../components/TestEditorShared'
import { getCourses, getModules } from '../api/adminApi'
import { useShellBreadcrumbs } from '../components/ui'

export default function ModuleTestPage() {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>()
  const navigate = useNavigate()

  // Shared with the content hub cache — only used for names in breadcrumbs.
  const { data: coursesRes } = useQuery({ queryKey: ['hub', 'courses'], queryFn: getCourses })
  const { data: modulesRes } = useQuery({ queryKey: ['hub', 'modules'], queryFn: () => getModules() })
  const course = (Array.isArray(coursesRes?.data) ? coursesRes.data : []).find((c: any) => c.id === courseId)
  const module = (Array.isArray(modulesRes?.data) ? modulesRes.data : []).find((m: any) => m.id === moduleId)
  const modulePath = `/content/courses/${courseId}/modules/${moduleId}`

  useShellBreadcrumbs(
    !!courseId && !!moduleId && [
      { label: 'Курсы и уроки', to: '/content' },
      { label: course?.titleRu || 'Курс', to: `/content/courses/${courseId}` },
      { label: module?.titleRu || 'Модуль', to: modulePath },
      { label: 'Тест модуля' },
    ],
  )

  if (!courseId || !moduleId) {
    return null
  }

  return (
    <TestEditorShared
      testType="module"
      moduleId={moduleId}
      title="Тест модуля"
      subtitle={module?.titleRu ? `Проверка знаний после модуля «${module.titleRu}»` : 'Проверка знаний после модуля'}
      backTo={modulePath}
      onBack={() => navigate(modulePath)}
    />
  )
}
