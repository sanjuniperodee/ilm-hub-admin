import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Button } from '@mui/material'
import { TestEditorShared } from '../components/TestEditorShared'
import { getCourses } from '../api/adminApi'
import { ErrorState, LoadingState, PageHeader, getErrorMessage, useShellBreadcrumbs } from '../components/ui'

export default function OnboardingPlacementTestPage() {
  const { slot } = useParams<{ slot: string }>()
  const navigate = useNavigate()
  const [courseId, setCourseId] = useState<string | null>(null)
  const [courseTitle, setCourseTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      if (!slot) return
      setLoading(true)
      setError('')
      if (slot === 'diagnostic') {
        setCourseId(null)
        setLoading(false)
        return
      }
      const code = slot.toLowerCase()
      if (!['mahraj', 'a1', 'a2'].includes(code)) {
        setError(`Неизвестный слот: ${slot}. Допустимо: mahraj, a1, a2, diagnostic`)
        setLoading(false)
        return
      }
      try {
        const { data } = await getCourses()
        const list = Array.isArray(data) ? data : []
        const c = list.find((x: any) => String(x.code || '').toLowerCase() === code)
        if (!c?.id) {
          setError(`Курс с кодом ${code} не найден`)
        } else {
          setCourseId(c.id)
          setCourseTitle(c.titleRu || null)
        }
      } catch (e: any) {
        setError(getErrorMessage(e, 'Не удалось загрузить курсы'))
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [slot])

  const isDiagnostic = slot === 'diagnostic'
  const title = isDiagnostic ? 'Диагностический входной тест' : `Входной тест: ${slot}`

  useShellBreadcrumbs(
    !!slot && [
      { label: 'Курсы и уроки', to: '/content' },
      ...(!isDiagnostic && courseId ? [{ label: courseTitle || String(slot), to: `/content/courses/${courseId}` }] : []),
      { label: isDiagnostic ? 'Диагностический тест' : 'Входной тест' },
    ],
  )

  if (!slot) return null

  if (loading) {
    return (
      <Box>
        <PageHeader title={title} backTo="/content" backLabel="К курсам" />
        <LoadingState variant="form" rows={4} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <PageHeader title={title} backTo="/content" backLabel="К курсам" />
        <ErrorState
          title="Не удалось открыть входной тест"
          error={error}
          action={<Button variant="outlined" onClick={() => navigate('/content')}>К списку курсов</Button>}
        />
      </Box>
    )
  }

  if (isDiagnostic) {
    return (
      <TestEditorShared
        testType="placement"
        placementProfile="diagnostic"
        title="Диагностический входной тест"
        subtitle="Общий тест при первом запуске приложения: помогает определить, с какого курса начать."
        backTo="/content"
        onBack={() => navigate('/content')}
      />
    )
  }

  if (!courseId) {
    return (
      <Box>
        <PageHeader title={title} backTo="/content" backLabel="К курсам" />
        <ErrorState title="Курс не найден" error="Курс не найден" />
      </Box>
    )
  }

  return (
    <TestEditorShared
      testType="placement"
      courseId={courseId}
      title={`Входной тест: ${courseTitle || slot}`}
      subtitle={`Тест определения уровня для курса ${slot}. Показывается в онбординге.`}
      backTo={`/content/courses/${courseId}`}
      onBack={() => navigate('/content')}
    />
  )
}
