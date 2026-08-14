import { Box, Button, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'

const GOLD = '#C9A84C'
const DARK = '#0A0A0F'

export default function Navbar() {
  const navigate = useNavigate()

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      px: { xs: 2, md: 6 }, py: 2, borderBottom: `1px solid rgba(201,168,76,0.15)`
    }}>
      <Typography sx={{ fontWeight: 700, fontSize: 22, letterSpacing: 4, color: GOLD, cursor: 'pointer' }}
        onClick={() => navigate('/')}>
        ARENA<span style={{ color: 'white' }}>X</span>
      </Typography>

      <Box sx={{ display: 'flex', gap: { xs: 1, md: 2 } }}>
        <Button onClick={() => navigate('/login')}
          sx={{ color: 'white', border: '1px solid rgba(255,255,255,0.2)',
            px: { xs: 1.5, md: 3 }, '&:hover': { borderColor: 'white' } }}>
          Login
        </Button>
        <Button onClick={() => navigate('/register')}
          sx={{ bgcolor: GOLD, color: DARK, px: { xs: 1.5, md: 3 }, fontWeight: 600,
            '&:hover': { bgcolor: '#E8C97A' } }}>
          Sign Up
        </Button>
      </Box>
    </Box>
  )
}