import { Box, Typography } from '@mui/material'
import { GOLD, DARK2, BEBAS } from './constants'

export default function BlackjackLeaderboard({ entries, playerNames, currentUserId }) {
  return (
    <Box sx={{ bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.15)', borderRadius: 2, p: 3, height: '100%' }}>
      <Typography sx={{ fontFamily: BEBAS, fontSize: 20, letterSpacing: 3, mb: 2, color: GOLD }}>
        LEADERBOARD
      </Typography>
      {entries.map((entry, i) => {
        const name = playerNames[entry.playerId] || playerNames[entry.id] || 'Player'
        const isMe = (entry.playerId || entry.id) === currentUserId
        return (
          <Box key={i} sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            py: 1.2, borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <Typography sx={{ color: i === 0 ? GOLD : '#555', fontFamily: BEBAS, fontSize: 18, width: 20 }}>
              {entry.rank || i + 1}
            </Typography>
            <Typography sx={{ flex: 1, fontSize: 13, color: isMe ? GOLD : '#ccc', fontWeight: isMe ? 700 : 400 }}>
              {name}{isMe ? ' (You)' : ''}
            </Typography>
            <Typography sx={{ color: GOLD, fontSize: 13, fontWeight: 600 }}>
              ⬡ {entry.tokens}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
