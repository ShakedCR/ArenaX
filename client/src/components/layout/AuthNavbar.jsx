import { memo } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../contexts/useAuth'
import { GOLD } from '../../styles/themeConstants'

const NAV_ITEMS = [
  { label: 'Lobby', path: '/lobby' },
  { label: 'Tournaments', path: '/tournaments' },
  { label: 'Profile', path: '/profile' },
  { label: 'Wallet', path: '/wallet' }
]

function AuthNavbar({ username = 'Player', tokens = 0, elo = 1200 }) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      px: 6,
      py: 2,
      borderBottom: '1px solid rgba(201,168,76,0.15)'
    }}>
      <Typography
        onClick={() => navigate('/lobby')}
        sx={{ fontWeight: 700, fontSize: 22, letterSpacing: 4, color: GOLD, cursor: 'pointer' }}
      >
        ARENA<span style={{ color: 'white' }}>X</span>
      </Typography>

      <Box sx={{ display: 'flex', gap: 4 }}>
        {NAV_ITEMS.map(item => (
          <Typography
            key={item.path}
            onClick={() => navigate(item.path)}
            sx={{ color: '#aaa', cursor: 'pointer', fontSize: 14, '&:hover': { color: 'white' } }}
          >
            {item.label}
          </Typography>
        ))}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Typography sx={{ color: '#aaa', fontSize: 13 }}>
          Player: <span style={{ color: 'white' }}>{username}</span>
        </Typography>

        <Typography sx={{ color: '#aaa', fontSize: 13 }}>
          <span style={{ color: GOLD }}>⬡</span> {tokens}
        </Typography>

        <Typography sx={{ color: '#aaa', fontSize: 13 }}>
          Elo: <span style={{ color: GOLD }}>{elo}</span>
        </Typography>

        <Button
          onClick={handleLogout}
          sx={{
            color: '#aaa',
            border: '1px solid rgba(255,255,255,0.1)',
            px: 2,
            fontSize: 12,
            '&:hover': { borderColor: 'white', color: 'white' }
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  )
}

export default memo(AuthNavbar)