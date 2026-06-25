import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'
import { GOLD, DARK, BEBAS } from '../../styles/themeConstants'

const RECONNECT_WINDOW_MS = 60_000

const GAME_CONFIG = {
  blackjack: {
    storageKey: 'bj_active_game',
    icon: '♠',
    label: 'BLACKJACK GAME IN PROGRESS',
    description: 'You left a blackjack game. Return within',
    getPath: (data) => `/game/blackjack/${data.gameId}`,
  },
  trivia: {
    storageKey: 'trivia_active_game',
    icon: '❓',
    label: 'TRIVIA GAME IN PROGRESS',
    description: 'You left a trivia game. Return within',
    getPath: (data) => `/game/trivia/${data.triviaGameId}`,
  },
}

const readActiveGame = () => {
  for (const [type, config] of Object.entries(GAME_CONFIG)) {
    try {
      const raw = localStorage.getItem(config.storageKey)
      if (!raw) continue

      const data = JSON.parse(raw)
      const elapsed = data.savedAt ? Date.now() - data.savedAt : 0
      const remaining = RECONNECT_WINDOW_MS - elapsed

      if (remaining <= 0) {
        localStorage.removeItem(config.storageKey)
        continue
      }

      return { type, data, remaining, config }
    } catch {
      localStorage.removeItem(config.storageKey)
    }
  }
  return null
}

const dismiss = (type) => {
  localStorage.removeItem(GAME_CONFIG[type].storageKey)
}

export default function ActiveGameBanner() {
  const [activeGame, setActiveGame] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const found = readActiveGame()
    if (!found) return
    setActiveGame(found)
    setSecondsLeft(Math.ceil(found.remaining / 1000))
  }, [])

  useEffect(() => {
    if (!activeGame || secondsLeft === null) return

    if (secondsLeft <= 0) {
      dismiss(activeGame.type)
      setActiveGame(null)
      return
    }

    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [activeGame, secondsLeft])

  if (!activeGame) return null

  const { type, data, config } = activeGame

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
        <Typography sx={{ fontSize: 18 }}>{config.icon}</Typography>
        <Box>
          <Typography sx={{ fontFamily: BEBAS, fontSize: 16, color: GOLD, letterSpacing: 2 }}>
            {config.label}
          </Typography>
          <Typography sx={{ fontSize: 12, color: secondsLeft <= 10 ? '#ef5350' : '#888' }}>
            {config.description}{' '}
            <span style={{ fontWeight: 700 }}>{secondsLeft}s</span> or you'll be eliminated.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <Button
          onClick={() => navigate(config.getPath(data))}
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
          onClick={() => { dismiss(type); setActiveGame(null) }}
          sx={{ color: '#555', fontSize: 12, '&:hover': { color: '#888' } }}
        >
          Dismiss
        </Button>
      </Box>
    </Box>
  )
}
