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
import { getCourseById, createCourse, updateCourse } from '../api/adminApi'

interface CourseFormData {
  code: string
  titleRu: string
  titleKz?: string
  titleAr?: string
  descriptionRu?: string
  descriptionKz?: string
  descriptionAr?: string
  level?: string
  orderIndex: number
  isPremium: boolean
  iconUrl?: string
  coverImageUrl?: string
}

export default function CourseEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const [loading, setLoading] = useState(!isNew)
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CourseFormData>({
    defaultValues: {
      orderIndex: 0,
      isPremium: false,
    },
  })

  useEffect(() => {
    if (!isNew) {
      fetchCourse()
    }
  }, [id])

  const fetchCourse = async () => {
    try {
      const response = await getCourseById(id!)
      const course = response.data
      Object.keys(course).forEach((key) => {
        setValue(key as keyof CourseFormData, course[key])
      })
    } catch (error) {
      console.error('Error fetching course:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: CourseFormData) => {
    try {
      if (isNew) {
        await createCourse(data)
      } else {
        await updateCourse(id!, data)
      }
      navigate('/courses')
    } catch (error: any) {
      console.error('Error saving course:', error)
      alert(error.response?.data?.message || 'Failed to save course')
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
        onClick={() => navigate('/courses')}
        sx={{ mb: 2 }}
      >
        Back to Courses
      </Button>
      <Typography variant="h4" gutterBottom>
        {isNew ? 'Create Course' : 'Edit Course'}
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Code"
                {...register('code', { required: 'Code is required' })}
                error={!!errors.code}
                helperText={errors.code?.message}
              />
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Level"
                {...register('level')}
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
              <TextField
                fullWidth
                label="Icon URL"
                {...register('iconUrl')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cover Image URL"
                {...register('coverImageUrl')}
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
