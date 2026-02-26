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
  CircularProgress,
} from '@mui/material'
import { ArrowBack, Save } from '@mui/icons-material'
import { getModuleById, createModule, updateModule, getCourses } from '../api/adminApi'

interface ModuleFormData {
  courseId: string
  titleRu: string
  titleKz?: string
  titleAr?: string
  descriptionRu?: string
  descriptionKz?: string
  descriptionAr?: string
  orderIndex: number
}

export default function ModuleEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const [loading, setLoading] = useState(!isNew)
  const [courses, setCourses] = useState<any[]>([])
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ModuleFormData>({
    defaultValues: {
      orderIndex: 0,
    },
  })

  useEffect(() => {
    fetchCourses()
    if (!isNew) {
      fetchModule()
    }
  }, [id])

  const fetchCourses = async () => {
    try {
      const response = await getCourses()
      setCourses(response.data)
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchModule = async () => {
    try {
      const response = await getModuleById(id!)
      const module = response.data
      Object.keys(module).forEach((key) => {
        setValue(key as keyof ModuleFormData, module[key])
      })
    } catch (error) {
      console.error('Error fetching module:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ModuleFormData) => {
    try {
      if (isNew) {
        await createModule(data)
      } else {
        await updateModule(id!, data)
      }
      navigate('/modules')
    } catch (error: any) {
      console.error('Error saving module:', error)
      alert(error.response?.data?.message || 'Failed to save module')
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
        onClick={() => navigate('/modules')}
        sx={{ mb: 2 }}
      >
        Back to Modules
      </Button>
      <Typography variant="h4" gutterBottom>
        {isNew ? 'Create Module' : 'Edit Module'}
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
                label="Order Index"
                type="number"
                {...register('orderIndex', { required: 'Order index is required', valueAsNumber: true })}
                error={!!errors.orderIndex}
                helperText={errors.orderIndex?.message}
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
