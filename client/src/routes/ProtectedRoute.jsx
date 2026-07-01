import { Navigate, useLocation } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'

import { useAuth } from '../contexts/useAuth'
import { GOLD, DARK } from '../styles/themeConstants'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

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
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  return children
}