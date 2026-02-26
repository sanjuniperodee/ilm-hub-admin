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
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { getModules, deleteModule } from '../api/adminApi'

interface Module {
  id: string
  courseId: string
  titleRu: string
  titleAr?: string
  orderIndex: number
}

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchModules()
  }, [])

  const fetchModules = async () => {
    try {
      const response = await getModules()
      setModules(response.data)
    } catch (error) {
      console.error('Error fetching modules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this module?')) {
      try {
        await deleteModule(id)
        fetchModules()
      } catch (error) {
        console.error('Error deleting module:', error)
        alert('Failed to delete module')
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
        <Typography variant="h4">Modules</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/modules/new')}
        >
          New Module
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title (RU)</TableCell>
              <TableCell>Title (AR)</TableCell>
              <TableCell>Course ID</TableCell>
              <TableCell>Order</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {modules.map((module) => (
              <TableRow key={module.id}>
                <TableCell>{module.titleRu}</TableCell>
                <TableCell>{module.titleAr || '-'}</TableCell>
                <TableCell>{module.courseId}</TableCell>
                <TableCell>{module.orderIndex}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/modules/${module.id}`)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(module.id)}
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
