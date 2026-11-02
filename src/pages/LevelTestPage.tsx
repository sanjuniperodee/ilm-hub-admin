import { useParams, useNavigate } from 'react-router-dom'
import { TestEditorShared } from '../components/TestEditorShared'
import { useShellBreadcrumbs } from '../components/ui'

export default function LevelTestPage() {
  const { levelCode } = useParams<{ levelCode: string }>()
  const navigate = useNavigate()

  useShellBreadcrumbs(
    !!levelCode && [
      { label: 'Курсы и уроки', to: '/content' },
      { label: `Тест уровня ${levelCode}` },
    ],
  )

  if (!levelCode) {
    return null
  }

  return (
    <TestEditorShared
      testType="level"
      levelCode={levelCode}
      title={`Тест уровня ${levelCode}`}
      subtitle={`Итоговая проверка уровня ${levelCode}.`}
      backTo="/content"
      onBack={() => navigate('/content')}
    />
  )
}
