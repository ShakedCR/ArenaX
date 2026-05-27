import { Box, Typography } from '@mui/material'
import { GOLD, BEBAS } from './constants'

export default function TurnIndicator({ currentPlayerId, phase, isMyTurn, playerNames, turnTimeLeft }) {
  if (!currentPlayerId || phase !== 'playing') return null

  return (
    <Box sx={{ my: 2, textAlign: 'center' }}>
      <Typography sx={{ color: isMyTurn ? GOLD : '#666', fontSize: 13, letterSpacing: 2, fontFamily: BEBAS }}>
        {isMyTurn ? '⭐ YOUR TURN' : `${playerNames[currentPlayerId] || 'Player'}'S TURN`}
      </Typography>

      {turnTimeLeft !== null && (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Box sx={{ width: 200, height: 4, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{
              height: '100%',
              width: `${(turnTimeLeft / 60) * 100}%`,
              bgcolor: turnTimeLeft <= 10 ? '#ef5350' : turnTimeLeft <= 20 ? '#ff9800' : GOLD,
              borderRadius: 2,
              transition: 'width 1s linear, background-color 0.3s'
            }} />
          </Box>
          <Typography sx={{
            fontSize: 12,
            color: turnTimeLeft <= 10 ? '#ef5350' : turnTimeLeft <= 20 ? '#ff9800' : '#888',
            minWidth: 24
          }}>
            {turnTimeLeft}s
          </Typography>
        </Box>
      )}
    </Box>
  )
}
