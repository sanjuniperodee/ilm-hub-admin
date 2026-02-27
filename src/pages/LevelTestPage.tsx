import { useParams, useNavigate } from 'react-router-dom'
import { TestEditorShared } from '../components/TestEditorShared'

export default function LevelTestPage() {
  const { levelCode } = useParams<{ levelCode: string }>()
  const navigate = useNavigate()

  if (!levelCode) {
    return null
  }

  return (
    <TestEditorShared
      testType="level"
      levelCode={levelCode}
      title={`Тест уровня ${levelCode}`}
      onBack={() => navigate('/content')}
    />
  )
}
