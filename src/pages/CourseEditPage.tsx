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
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    )
  }

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/courses')}
          variant="outlined"
          size="small"
          sx={{
            borderColor: 'rgba(0,0,0,0.12)',
            color: 'text.secondary',
            '&:hover': {
              borderColor: '#6366F1',
              color: '#6366F1',
              background: 'rgba(99,102,241,0.04)',
            },
          }}
        >
          Back
        </Button>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            {isNew ? 'Create Course' : 'Edit Course'}
          </Typography>
        </Box>
      </Stack>

      <Paper sx={{ p: { xs: 3, md: 4 } }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Section: Basic */}
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Basic Information
          </Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Code"
                {...register('code', { required: 'Code is required' })}
                error={!!errors.code}
                helperText={errors.code?.message}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Order Index"
                type="number"
                {...register('orderIndex', { required: 'Order index is required', valueAsNumber: true })}
                error={!!errors.orderIndex}
                helperText={errors.orderIndex?.message}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Level"
                {...register('level')}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Section: Titles */}
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Titles
          </Typography>
          <Grid container spacing={2.5}>
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
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Section: Descriptions */}
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Descriptions
          </Typography>
          <Grid container spacing={2.5}>
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
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Section: Media & Settings */}
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Media & Settings
          </Typography>
          <Grid container spacing={2.5}>
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
              <FormControlLabel
                control={
                  <Checkbox
                    checked={watch('isPremium')}
                    {...register('isPremium')}
                    sx={{
                      '&.Mui-checked': {
                        color: '#6366F1',
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                    Premium Course
                  </Typography>
                }
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Actions */}
          <Stack direction="row" justifyContent="flex-end" spacing={2}>
            <Button
              variant="outlined"
              onClick={() => navigate('/courses')}
              sx={{
                borderColor: 'rgba(0,0,0,0.12)',
                color: 'text.secondary',
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
            >
              {isNew ? 'Create Course' : 'Save Changes'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  )
}
