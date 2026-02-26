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
import { getLessonBlocks, deleteLessonBlock } from '../api/adminApi'

interface LessonBlock {
  id: string
  lessonId: string
  type: string
  orderIndex: number
}

export default function LessonBlocksPage() {
  const [blocks, setBlocks] = useState<LessonBlock[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchBlocks()
  }, [])

  const fetchBlocks = async () => {
    try {
      const response = await getLessonBlocks()
      setBlocks(response.data)
    } catch (error) {
      console.error('Error fetching lesson blocks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this lesson block?')) {
      try {
        await deleteLessonBlock(id)
        fetchBlocks()
      } catch (error) {
        console.error('Error deleting lesson block:', error)
        alert('Failed to delete lesson block')
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
        <Typography variant="h4">Lesson Blocks</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/lesson-blocks/new')}
        >
          New Lesson Block
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lesson ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Order</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {blocks.map((block) => (
              <TableRow key={block.id}>
                <TableCell>{block.lessonId}</TableCell>
                <TableCell>
                  <Chip label={block.type} size="small" />
                </TableCell>
                <TableCell>{block.orderIndex}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/lesson-blocks/${block.id}`)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(block.id)}
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
