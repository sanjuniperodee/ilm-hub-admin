import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from '@mui/material'
import { ArrowBack, Save } from '@mui/icons-material'
import { getLessonById, createLesson, updateLesson, getCourses, getModules } from '../api/adminApi'

interface LessonFormData {
  courseId: string
  moduleId?: string
  titleRu: string
  titleKz?: string
  titleAr?: string
  descriptionRu?: string
  descriptionKz?: string
  descriptionAr?: string
  orderIndex: number
  isPremium: boolean
  isTest: boolean
  estimatedMinutes?: number
}

export default function LessonEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const [loading, setLoading] = useState(!isNew)
  const [courses, setCourses] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<LessonFormData>({
    defaultValues: {
      orderIndex: 0,
      isPremium: false,
      isTest: false,
    },
  })

  const selectedCourseId = watch('courseId')

  useEffect(() => {
    fetchCourses()
    if (!isNew) {
      fetchLesson()
    }
  }, [id])

  useEffect(() => {
    if (selectedCourseId) {
      fetchModules(selectedCourseId)
    } else {
      setModules([])
    }
  }, [selectedCourseId])

  const fetchCourses = async () => {
    try {
      const response = await getCourses()
      setCourses(response.data)
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchModules = async (courseId: string) => {
    try {
      const response = await getModules(courseId)
      setModules(response.data)
    } catch (error) {
      console.error('Error fetching modules:', error)
    }
  }

  const fetchLesson = async () => {
    try {
      const response = await getLessonById(id!)
      const lesson = response.data
      Object.keys(lesson).forEach((key) => {
        setValue(key as keyof LessonFormData, lesson[key])
      })
      if (lesson.courseId) {
        fetchModules(lesson.courseId)
      }
    } catch (error) {
      console.error('Error fetching lesson:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: LessonFormData) => {
    try {
      if (isNew) {
        await createLesson(data)
      } else {
        await updateLesson(id!, data)
      }
      navigate('/lessons')
    } catch (error: any) {
      console.error('Error saving lesson:', error)
      alert(error.response?.data?.message || 'Failed to save lesson')
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
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/lessons')}
        sx={{ mb: 2 }}
      >
        Back to Lessons
      </Button>
      <Typography variant="h4" gutterBottom>
        {isNew ? 'Create Lesson' : 'Edit Lesson'}
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Course"
                {...register('courseId', { required: 'Course is required' })}
                error={!!errors.courseId}
                helperText={errors.courseId?.message}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="">Select Course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.titleRu} ({course.code})
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Module (Optional)"
                {...register('moduleId')}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="">None</option>
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.titleRu}
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Order Index"
                type="number"
                {...register('orderIndex', { required: 'Order index is required', valueAsNumber: true })}
                error={!!errors.orderIndex}
                helperText={errors.orderIndex?.message}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Estimated Minutes"
                type="number"
                {...register('estimatedMinutes', { valueAsNumber: true })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Title (RU)"
                {...register('titleRu', { required: 'Title RU is required' })}
                error={!!errors.titleRu}
                helperText={errors.titleRu?.message}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Title (KZ)"
                {...register('titleKz')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Title (AR)"
                {...register('titleAr')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description (RU)"
                {...register('descriptionRu')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description (KZ)"
                {...register('descriptionKz')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description (AR)"
                {...register('descriptionAr')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={watch('isPremium')}
                    {...register('isPremium')}
                  />
                }
                label="Premium"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={watch('isTest')}
                    {...register('isTest')}
                  />
                }
                label="Is Test"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
              >
                Save
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  )
}
