import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import { getModuleById, updateModule } from '../api/adminApi'

export default function ModuleEditorPage() {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    titleRu: '',
    titleKz: '',
    titleAr: '',
    descriptionRu: '',
    descriptionKz: '',
    descriptionAr: '',
    orderIndex: 0,
  })

  useEffect(() => {
    if (moduleId) fetchModule()
  }, [moduleId])

  const fetchModule = async () => {
    if (!moduleId) return
    try {
      const { data } = await getModuleById(moduleId)
      setForm({
        titleRu: data.titleRu || '',
        titleKz: data.titleKz || '',
        titleAr: data.titleAr || '',
        descriptionRu: data.descriptionRu || '',
        descriptionKz: data.descriptionKz || '',
        descriptionAr: data.descriptionAr || '',
        orderIndex: data.orderIndex ?? 0,
      })
    } catch (error) {
      console.error('Error fetching module:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!moduleId || !courseId) return
    try {
      await updateModule(moduleId, form)
      navigate(`/content/courses/${courseId}/modules/${moduleId}`)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Не удалось сохранить модуль')
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
          onClick={() => navigate(`/content/courses/${courseId}/modules/${moduleId}`)}
          variant="outlined"
          size="small"
        >
          К контенту
        </Button>
        <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Редактировать модуль
        </Typography>
      </Stack>

      <Paper sx={{ p: { xs: 3, md: 4 } }}>
        <form onSubmit={onSubmit}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Основное</Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Порядок"
                type="number"
                value={form.orderIndex}
                onChange={(e) => setForm((p) => ({ ...p, orderIndex: Number(e.target.value) || 0 }))}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Названия</Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Название (RU)" value={form.titleRu} onChange={(e) => setForm((p) => ({ ...p, titleRu: e.target.value }))} required />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Название (KZ)" value={form.titleKz} onChange={(e) => setForm((p) => ({ ...p, titleKz: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Название (AR)" value={form.titleAr} onChange={(e) => setForm((p) => ({ ...p, titleAr: e.target.value }))} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Описания</Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="Описание (RU)" value={form.descriptionRu} onChange={(e) => setForm((p) => ({ ...p, descriptionRu: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth multiline rows={3} label="Описание (KZ)" value={form.descriptionKz} onChange={(e) => setForm((p) => ({ ...p, descriptionKz: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth multiline rows={3} label="Описание (AR)" value={form.descriptionAr} onChange={(e) => setForm((p) => ({ ...p, descriptionAr: e.target.value }))} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Stack direction="row" justifyContent="flex-end" spacing={2}>
            <Button variant="outlined" onClick={() => navigate(`/content/courses/${courseId}/modules/${moduleId}`)}>
              Отмена
            </Button>
            <Button type="submit" variant="contained" startIcon={<Save />}>
              Сохранить
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  )
}
