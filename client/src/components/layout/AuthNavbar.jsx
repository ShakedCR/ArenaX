import { memo, useState } from 'react'
import { Box, Button, Drawer, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../contexts/useAuth'
import { GOLD, DARK2 } from '../../styles/themeConstants'

const NAV_ITEMS = [
  { label: 'Lobby', path: '/lobby' },
  { label: 'Tournaments', path: '/tournaments' },
  { label: 'Profile', path: '/profile' },
  { label: 'Wallet', path: '/wallet' }
]

function AuthNavbar({ username = 'Player', tokens = 0 }) {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const eloBlackjack = user?.elo?.blackjack ?? 1200
  const eloTrivia = user?.elo?.trivia ?? 1200

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
    setDrawerOpen(false)
  }

  const handleNav = (path) => {
    navigate(path)
    setDrawerOpen(false)
  }

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      px: { xs: 2, md: 6 },
      py: 2,
      borderBottom: '1px solid rgba(201,168,76,0.15)'
    }}>
      {/* Logo — always visible */}
      <Typography
        onClick={() => navigate('/lobby')}
        sx={{ fontWeight: 700, fontSize: 22, letterSpacing: 4, color: GOLD, cursor: 'pointer' }}
      >
        ARENA<span style={{ color: 'white' }}>X</span>
      </Typography>

      {/* Desktop nav links — hidden on mobile */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 4 }}>
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

      {/* Desktop user info + logout — hidden on mobile */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 3 }}>
        <Typography sx={{ color: '#aaa', fontSize: 13 }}>
          Player: <span style={{ color: 'white' }}>{username}</span>
        </Typography>

        <Typography sx={{ color: '#aaa', fontSize: 13 }}>
          <span style={{ color: GOLD }}>⬡</span> {tokens}
        </Typography>

        <Typography sx={{ color: '#aaa', fontSize: 13 }}>
          ♠ <span style={{ color: GOLD }}>{eloBlackjack}</span>
        </Typography>

        <Typography sx={{ color: '#aaa', fontSize: 13 }}>
          ❓ <span style={{ color: GOLD }}>{eloTrivia}</span>
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

      {/* Mobile hamburger — hidden on desktop */}
      <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
        <Button
          onClick={() => setDrawerOpen(true)}
          sx={{ color: GOLD, fontSize: 20, minWidth: 'auto', p: 0.5, lineHeight: 1 }}
        >
          ☰
        </Button>
      </Box>

      {/* Mobile drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: DARK2,
            width: 260,
            borderLeft: '1px solid rgba(201,168,76,0.15)',
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 20, letterSpacing: 4, color: GOLD, mb: 3 }}>
            ARENA<span style={{ color: 'white' }}>X</span>
          </Typography>

          {/* User info section */}
          <Box sx={{ mb: 3, pb: 3, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography sx={{ color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>
              Signed in as
            </Typography>
            <Typography sx={{ color: 'white', fontSize: 14, fontWeight: 600 }}>
              {username}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Typography sx={{ color: '#aaa', fontSize: 12 }}>
                <span style={{ color: GOLD }}>⬡</span> {tokens}
              </Typography>
              <Typography sx={{ color: '#aaa', fontSize: 12 }}>
                ♠ <span style={{ color: GOLD }}>{eloBlackjack}</span>
              </Typography>
              <Typography sx={{ color: '#aaa', fontSize: 12 }}>
                ❓ <span style={{ color: GOLD }}>{eloTrivia}</span>
              </Typography>
            </Box>
          </Box>

          {/* Nav items */}
          {NAV_ITEMS.map(item => (
            <Box
              key={item.path}
              onClick={() => handleNav(item.path)}
              sx={{
                py: 1.5,
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                '&:hover': { '& .nav-label': { color: 'white' } }
              }}
            >
              <Typography className="nav-label" sx={{ fontSize: 14, color: '#aaa', transition: 'color 0.15s' }}>
                {item.label}
              </Typography>
            </Box>
          ))}

          <Button
            fullWidth
            onClick={handleLogout}
            sx={{
              mt: 3,
              color: '#aaa',
              border: '1px solid rgba(255,255,255,0.1)',
              '&:hover': { borderColor: 'white', color: 'white' }
            }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>
    </Box>
  )
}

export default memo(AuthNavbar)
