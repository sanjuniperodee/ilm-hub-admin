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
  Stack,
  Divider,
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
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    )
  }

  return (
    <Box className="animate-fade-in">
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/modules')}
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
          {isNew ? 'Create Module' : 'Edit Module'}
        </Typography>
      </Stack>

      <Paper sx={{ p: { xs: 3, md: 4 } }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Basic Information</Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Course"
                {...register('courseId', { required: 'Course is required' })}
                error={!!errors.courseId}
                helperText={errors.courseId?.message}
                SelectProps={{ native: true }}
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
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Titles</Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Title (RU)" {...register('titleRu', { required: 'Title RU is required' })} error={!!errors.titleRu} helperText={errors.titleRu?.message} />
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
          <Stack direction="row" justifyContent="flex-end" spacing={2}>
            <Button variant="outlined" onClick={() => navigate('/modules')} sx={{ borderColor: 'rgba(0,0,0,0.12)', color: 'text.secondary' }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" startIcon={<Save />}>
              {isNew ? 'Create Module' : 'Save Changes'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  )
}
