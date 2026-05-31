import { Box, Typography } from '@mui/material'
import { GOLD, DARK2, BEBAS } from './constants'

export default function BlackjackLeaderboard({ entries, playerNames, currentUserId, disconnectedPlayers = {} }) {
  return (
    <Box sx={{ bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.15)', borderRadius: 2, p: 3, height: '100%' }}>
      <Typography sx={{ fontFamily: BEBAS, fontSize: 20, letterSpacing: 3, mb: 2, color: GOLD }}>
        LEADERBOARD
      </Typography>
      {entries.map((entry, i) => {
        const playerId = entry.playerId || entry.id
        const name = playerNames[playerId] || 'Player'
        const isMe = playerId === currentUserId
        const disconnected = disconnectedPlayers[playerId]
        return (
          <Box key={i} sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            py: 1.2, borderBottom: '1px solid rgba(255,255,255,0.05)',
            opacity: disconnected && !disconnected.expired ? 0.6 : 1,
          }}>
            <Typography sx={{ color: i === 0 ? GOLD : '#555', fontFamily: BEBAS, fontSize: 18, width: 20 }}>
              {entry.rank || i + 1}
            </Typography>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Typography sx={{ fontSize: 13, color: isMe ? GOLD : '#ccc', fontWeight: isMe ? 700 : 400 }}>
                {name}{isMe ? ' (You)' : ''}
              </Typography>
              {disconnected && !disconnected.expired && (
                <Typography sx={{ fontSize: 10, color: '#f57c00', bgcolor: 'rgba(245,124,0,0.12)', px: 0.8, py: 0.2, borderRadius: 0.5 }}>
                  AWAY
                </Typography>
              )}
              {disconnected?.forfeited && (
                <Typography sx={{ fontSize: 10, color: '#ef5350', bgcolor: 'rgba(239,83,80,0.12)', px: 0.8, py: 0.2, borderRadius: 0.5 }}>
                  FORFEITED
                </Typography>
              )}
              {disconnected?.expired && !disconnected?.forfeited && (
                <Typography sx={{ fontSize: 10, color: '#ef5350', bgcolor: 'rgba(239,83,80,0.12)', px: 0.8, py: 0.2, borderRadius: 0.5 }}>
                  OUT
                </Typography>
              )}
            </Box>
            <Typography sx={{ color: GOLD, fontSize: 13, fontWeight: 600 }}>
              ⬡ {entry.tokens}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
