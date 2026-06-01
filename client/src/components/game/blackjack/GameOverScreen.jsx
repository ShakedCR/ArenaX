import { Box, Typography, Button } from '@mui/material'
import { GOLD, DARK, DARK2, BEBAS } from './constants'

function EloBadge({ eloResult }) {
  if (!eloResult) return null
  const { oldRating, newRating, delta } = eloResult
  const positive = delta >= 0
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 2,
      bgcolor: DARK2, border: `1px solid ${positive ? 'rgba(76,175,80,0.3)' : 'rgba(239,83,80,0.3)'}`,
      borderRadius: 2, px: 3, py: 1.5,
    }}>
      <Box>
        <Typography sx={{ color: '#555', fontSize: 11, fontFamily: BEBAS, letterSpacing: 2 }}>
          BLACKJACK ELO
        </Typography>
        <Typography sx={{ color: '#ccc', fontSize: 18, fontFamily: BEBAS, letterSpacing: 1 }}>
          {oldRating} → {newRating}
        </Typography>
      </Box>
      <Typography sx={{
        fontFamily: BEBAS, fontSize: 28, letterSpacing: 1,
        color: positive ? '#4caf50' : '#ef5350',
      }}>
        {positive ? '+' : ''}{delta}
      </Typography>
    </Box>
  )
}

export default function GameOverScreen({ finalLeaderboard, playerNames, currentUserId, eloResult, onBack }) {
  const myEntry  = finalLeaderboard?.find(e => (e.id || e.playerId) === currentUserId)
  const winner   = finalLeaderboard?.[0]
  const isWinner = winner && (winner.id || winner.playerId) === currentUserId

  return (
    <Box sx={{
      minHeight: '100vh', bgcolor: DARK,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 3,
    }}>
      <Typography sx={{ fontFamily: BEBAS, fontSize: 20, letterSpacing: 4, color: '#666' }}>
        GAME OVER
      </Typography>
      <Typography sx={{ fontFamily: BEBAS, fontSize: 72, color: isWinner ? GOLD : '#fff', lineHeight: 1 }}>
        {isWinner ? 'VICTORY' : 'DEFEATED'}
      </Typography>

      {myEntry && (
        <Typography sx={{ color: GOLD, fontSize: 18 }}>
          Final tokens: ⬡ {myEntry.tokens}
        </Typography>
      )}

      <EloBadge eloResult={eloResult} />

      <Box sx={{ bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.15)', borderRadius: 2, p: 3, minWidth: 320, mt: 1 }}>
        <Typography sx={{ fontFamily: BEBAS, fontSize: 18, letterSpacing: 3, color: GOLD, mb: 2 }}>
          FINAL STANDINGS
        </Typography>
        {finalLeaderboard?.map((entry, i) => {
          const name = playerNames[entry.playerId] || playerNames[entry.id] || 'Player'
          const isMe = (entry.id || entry.playerId) === currentUserId
          return (
            <Box key={i} sx={{ display: 'flex', gap: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography sx={{ color: i === 0 ? GOLD : '#555', fontFamily: BEBAS, fontSize: 18, width: 24 }}>
                {entry.rank || i + 1}
              </Typography>
              <Typography sx={{ flex: 1, fontSize: 14, color: isMe ? GOLD : '#ccc', fontWeight: isMe ? 700 : 400 }}>
                {name}{isMe ? ' (You)' : ''}
              </Typography>
              <Typography sx={{ color: GOLD, fontSize: 14 }}>⬡ {entry.tokens}</Typography>
            </Box>
          )
        })}
      </Box>

      <Button onClick={onBack} sx={{ mt: 2, color: '#666', '&:hover': { color: '#fff' } }}>
        ← Back to Lobby
      </Button>
    </Box>
  )
}
