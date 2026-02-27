import { useParams, useNavigate } from 'react-router-dom'
import { TestEditorShared } from '../components/TestEditorShared'

export default function ModuleTestPage() {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>()
  const navigate = useNavigate()

  if (!courseId || !moduleId) {
    return null
  }

  return (
    <TestEditorShared
      testType="module"
      moduleId={moduleId}
      title="Тест модуля"
      onBack={() => navigate(`/content/courses/${courseId}/modules/${moduleId}`)}
    />
  )
}
