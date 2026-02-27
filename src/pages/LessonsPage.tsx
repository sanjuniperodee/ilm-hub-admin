import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Chip,
  Stack,
  Tooltip,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material'
import { getLessons, deleteLesson } from '../api/adminApi'

interface Lesson {
  id: string
  courseId: string
  moduleId?: string
  titleRu: string
  titleAr?: string
  isPremium: boolean
  isTest: boolean
  orderIndex: number
  estimatedMinutes?: number
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchLessons()
  }, [])

  const fetchLessons = async () => {
    try {
      const response = await getLessons()
      setLessons(response.data)
    } catch (error) {
      console.error('Error fetching lessons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      try {
        await deleteLesson(id)
        fetchLessons()
      } catch (error) {
        console.error('Error deleting lesson:', error)
        alert('Failed to delete lesson')
      }
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    )
  }

  return (
    <Box className="animate-fade-in">
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Lessons
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {lessons.length} lessons total
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/lessons/new')}
        >
          New Lesson
        </Button>
      </Stack>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title (RU)</TableCell>
              <TableCell>Title (AR)</TableCell>
              <TableCell>Course ID</TableCell>
              <TableCell>Module ID</TableCell>
              <TableCell>Premium</TableCell>
              <TableCell>Test</TableCell>
              <TableCell>Minutes</TableCell>
              <TableCell>Order</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lessons.map((lesson) => (
              <TableRow key={lesson.id}>
                <TableCell>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {lesson.titleRu}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {lesson.titleAr || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {lesson.courseId.slice(0, 8)}…
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {lesson.moduleId ? lesson.moduleId.slice(0, 8) + '…' : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={lesson.isPremium ? 'Premium' : 'Free'}
                    size="small"
                    sx={{
                      ...(lesson.isPremium
                        ? { background: 'rgba(245,158,11,0.1)', color: '#D97706' }
                        : { background: 'rgba(100,116,139,0.08)', color: '#64748B' }),
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={lesson.isTest ? 'Test' : '—'}
                    size="small"
                    sx={{
                      ...(lesson.isTest
                        ? { background: 'rgba(99,102,241,0.1)', color: '#4F46E5' }
                        : { background: 'transparent', color: '#94A3B8' }),
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {lesson.estimatedMinutes ? `${lesson.estimatedMinutes}m` : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {lesson.orderIndex}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/lessons/${lesson.id}`)}
                        sx={{
                          width: 34,
                          height: 34,
                          '&:hover': { background: 'rgba(99,102,241,0.08)', color: '#6366F1' },
                        }}
                      >
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(lesson.id)}
                        sx={{
                          width: 34,
                          height: 34,
                          '&:hover': { background: 'rgba(239,68,68,0.08)', color: '#EF4444' },
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {lessons.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', py: 6 }}>
                  <Typography color="text.secondary">No lessons found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
