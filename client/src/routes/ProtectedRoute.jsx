import { Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'

import { useAuth } from '../contexts/useAuth'
import { GOLD, DARK } from '../styles/themeConstants'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <Box sx={{
        bgcolor: DARK,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CircularProgress sx={{ color: GOLD }} />
      </Box>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}