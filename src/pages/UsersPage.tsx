import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Chip,
  Avatar,
} from '@mui/material'
import { getUsers } from '../api/adminApi'
import { format } from 'date-fns'

interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  isPremium: boolean
  createdAt: string
  lastActiveAt?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await getUsers()
      setUsers(response.data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
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
      <Typography variant="h4" gutterBottom>
        Users
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Last Active</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar src={user.avatarUrl} alt={user.name}>
                      {user.name?.[0]?.toUpperCase()}
                    </Avatar>
                    <Typography>{user.name || 'N/A'}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={user.isPremium ? 'Premium' : 'Free'}
                    color={user.isPremium ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  {user.lastActiveAt
                    ? format(new Date(user.lastActiveAt), 'MMM dd, yyyy')
                    : 'Never'}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    onClick={() => navigate(`/users/${user.id}`)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
