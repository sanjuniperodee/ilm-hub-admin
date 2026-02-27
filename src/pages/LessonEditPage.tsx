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
  Stack,
  Divider,
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
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    )
  }

  return (
    <Box className="animate-fade-in">
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/lessons')}
          variant="outlined"
          size="small"
          sx={{
            borderColor: 'rgba(0,0,0,0.12)',
            color: 'text.secondary',
            '&:hover': { borderColor: '#6366F1', color: '#6366F1', background: 'rgba(99,102,241,0.04)' },
          }}
        >
          Back
        </Button>
        <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          {isNew ? 'Create Lesson' : 'Edit Lesson'}
        </Typography>
      </Stack>

      <Paper sx={{ p: { xs: 3, md: 4 } }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Assignment</Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth select label="Course"
                {...register('courseId', { required: 'Course is required' })}
                error={!!errors.courseId} helperText={errors.courseId?.message}
                SelectProps={{ native: true }}
              >
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.titleRu} ({c.code})</option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth select label="Module (Optional)"
                {...register('moduleId')}
                SelectProps={{ native: true }}
              >
                <option value="">None</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.titleRu}</option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Order Index" type="number"
                {...register('orderIndex', { required: 'Required', valueAsNumber: true })}
                error={!!errors.orderIndex} helperText={errors.orderIndex?.message}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Estimated Minutes" type="number"
                {...register('estimatedMinutes', { valueAsNumber: true })}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Titles</Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Title (RU)" {...register('titleRu', { required: 'Required' })} error={!!errors.titleRu} helperText={errors.titleRu?.message} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Title (KZ)" {...register('titleKz')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Title (AR)" {...register('titleAr')} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Descriptions</Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="Description (RU)" {...register('descriptionRu')} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth multiline rows={3} label="Description (KZ)" {...register('descriptionKz')} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth multiline rows={3} label="Description (AR)" {...register('descriptionAr')} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Settings</Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox checked={watch('isPremium')} {...register('isPremium')}
                    sx={{ '&.Mui-checked': { color: '#6366F1' } }}
                  />
                }
                label={<Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>Premium Lesson</Typography>}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox checked={watch('isTest')} {...register('isTest')}
                    sx={{ '&.Mui-checked': { color: '#6366F1' } }}
                  />
                }
                label={<Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>Is Test</Typography>}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Stack direction="row" justifyContent="flex-end" spacing={2}>
            <Button variant="outlined" onClick={() => navigate('/lessons')} sx={{ borderColor: 'rgba(0,0,0,0.12)', color: 'text.secondary' }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" startIcon={<Save />}>
              {isNew ? 'Create Lesson' : 'Save Changes'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  )
}
