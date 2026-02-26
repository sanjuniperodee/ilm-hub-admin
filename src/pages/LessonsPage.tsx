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
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
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
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Lessons</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/lessons/new')}
        >
          New Lesson
        </Button>
      </Box>
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
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lessons.map((lesson) => (
              <TableRow key={lesson.id}>
                <TableCell>{lesson.titleRu}</TableCell>
                <TableCell>{lesson.titleAr || '-'}</TableCell>
                <TableCell>{lesson.courseId}</TableCell>
                <TableCell>{lesson.moduleId || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={lesson.isPremium ? 'Yes' : 'No'}
                    color={lesson.isPremium ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={lesson.isTest ? 'Yes' : 'No'}
                    color={lesson.isTest ? 'secondary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{lesson.estimatedMinutes || '-'}</TableCell>
                <TableCell>{lesson.orderIndex}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/lessons/${lesson.id}`)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(lesson.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
