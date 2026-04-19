import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, CircularProgress, Typography } from '@mui/material'
import { TestEditorShared } from '../components/TestEditorShared'
import { getCourses } from '../api/adminApi'

export default function OnboardingPlacementTestPage() {
  const { slot } = useParams<{ slot: string }>()
  const navigate = useNavigate()
  const [courseId, setCourseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      if (!slot) return
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
        }
      } catch (e: any) {
        setError(e?.message || 'Не удалось загрузить курсы')
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [slot])

  if (!slot) return null

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  if (slot === 'diagnostic') {
    return (
      <TestEditorShared
        testType="placement"
        placementProfile="diagnostic"
        title="Онбординг: диагностический тест"
        onBack={() => navigate('/content')}
      />
    )
  }

  if (!courseId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Курс не найден</Typography>
      </Box>
    )
  }

  return (
    <TestEditorShared
      testType="placement"
      courseId={courseId}
      title={`Онбординг: тест определения уровня (${slot})`}
      onBack={() => navigate('/content')}
    />
  )
}
