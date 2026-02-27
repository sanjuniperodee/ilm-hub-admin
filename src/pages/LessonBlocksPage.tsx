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
  Stack,
  Tooltip,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material'
import { getLessonBlocks, deleteLessonBlock } from '../api/adminApi'

interface LessonBlock {
  id: string
  lessonId: string
  type: string
  orderIndex: number
}

const typeColorMap: Record<string, { bg: string; color: string }> = {
  text: { bg: 'rgba(59,130,246,0.1)', color: '#2563EB' },
  image: { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  video: { bg: 'rgba(139,92,246,0.1)', color: '#7C3AED' },
  audio: { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
  exercise: { bg: 'rgba(239,68,68,0.1)', color: '#DC2626' },
  quiz: { bg: 'rgba(99,102,241,0.1)', color: '#4F46E5' },
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
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    )
  }

  return (
    <Box className="animate-fade-in">
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Lesson Blocks
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {blocks.length} blocks total
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/lesson-blocks/new')}
        >
          New Block
        </Button>
      </Stack>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lesson ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Order</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {blocks.map((block) => {
              const typeStyle = typeColorMap[block.type] || { bg: 'rgba(100,116,139,0.08)', color: '#64748B' }
              return (
                <TableRow key={block.id}>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {block.lessonId.slice(0, 8)}…
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={block.type}
                      size="small"
                      sx={{
                        background: typeStyle.bg,
                        color: typeStyle.color,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {block.orderIndex}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/lesson-blocks/${block.id}`)}
                          sx={{
                            width: 34,
                            height: 34,
                            '&:hover': { background: 'rgba(99,102,241,0.08)', color: '#6366F1' },
                          }}
                        >
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(block.id)}
                          sx={{
                            width: 34,
                            height: 34,
                            '&:hover': { background: 'rgba(239,68,68,0.08)', color: '#EF4444' },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              )
            })}
            {blocks.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ textAlign: 'center', py: 6 }}>
                  <Typography color="text.secondary">No lesson blocks found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
