import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'
import { GOLD, DARK, BEBAS } from '../../styles/themeConstants'

const RECONNECT_WINDOW_MS = 60_000

const dismiss = (setActiveGame) => {
  localStorage.removeItem('bj_active_game')
  setActiveGame(null)
}

export default function ActiveGameBanner() {
  const [activeGame, setActiveGame] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bj_active_game')
      if (!raw) return
      const data = JSON.parse(raw)

      // savedAt is written when the player leaves the game page
      const elapsed = data.savedAt ? Date.now() - data.savedAt : 0
      const remaining = RECONNECT_WINDOW_MS - elapsed

      if (remaining <= 0) {
        dismiss(setActiveGame)
        return
      }

      setActiveGame(data)
      setSecondsLeft(Math.ceil(remaining / 1000))
    } catch {
      localStorage.removeItem('bj_active_game')
    }
  }, [])

  // Countdown tick
  useEffect(() => {
    if (!activeGame || secondsLeft === null) return

    if (secondsLeft <= 0) {
      dismiss(setActiveGame)
      return
    }

    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [activeGame, secondsLeft])

  if (!activeGame) return null

  return (
    <Box sx={{
      bgcolor: 'rgba(201,168,76,0.08)',
      border: '1px solid rgba(201,168,76,0.3)',
      borderRadius: 1,
      px: 3, py: 1.5, mb: 3,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
      flexWrap: 'wrap',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ fontSize: 18 }}>♠</Typography>
        <Box>
          <Typography sx={{ fontFamily: BEBAS, fontSize: 16, color: GOLD, letterSpacing: 2 }}>
            ACTIVE GAME IN PROGRESS
          </Typography>
          <Typography sx={{ fontSize: 12, color: secondsLeft <= 10 ? '#ef5350' : '#888' }}>
            You left a blackjack game. Return within{' '}
            <span style={{ fontWeight: 700 }}>{secondsLeft}s</span> or you'll be eliminated.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <Button
          onClick={() => navigate(`/game/blackjack/${activeGame.gameId}`)}
          sx={{
            bgcolor: GOLD, color: DARK,
            px: 2.5, py: 0.8,
            fontFamily: BEBAS, fontSize: 14, letterSpacing: 1,
            '&:hover': { bgcolor: '#E8C97A' },
          }}
        >
          RETURN TO GAME
        </Button>
        <Button
          onClick={() => dismiss(setActiveGame)}
          sx={{ color: '#555', fontSize: 12, '&:hover': { color: '#888' } }}
        >
          Dismiss
        </Button>
      </Box>
    </Box>
  )
}
