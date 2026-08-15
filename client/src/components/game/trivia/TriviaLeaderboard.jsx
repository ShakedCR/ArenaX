import { Box, Typography } from '@mui/material'
import { GOLD, BEBAS } from '../../../styles/themeConstants'
import { rankMedal } from './triviaHelpers'

// ── Leaderboard sidebar ────────────────────────────────────────────────────────
export default function TriviaLeaderboard({ entries, currentUserId }) {
  if (!entries?.length) return (
    <Box sx={{ color: '#444', fontSize: 13, textAlign: 'center', mt: 4 }}>
      Waiting for first answers…
    </Box>
  )

  return (
    <Box>
      <Typography sx={{ fontFamily: BEBAS, fontSize: 18, letterSpacing: 2, mb: 2, color: GOLD }}>
        LEADERBOARD
      </Typography>
      {entries.map((entry) => {
        const uid = entry.user?._id || entry.user?.id || entry.user
        const isMe = uid?.toString() === currentUserId?.toString()
        return (
          <Box key={uid} sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            py: 1.2, px: 1.5, mb: 0.5, borderRadius: 1,
            bgcolor: isMe ? 'rgba(201,168,76,0.08)' : 'transparent',
            border: isMe ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
            transition: 'all 0.3s'
          }}>
            <Typography sx={{ fontSize: 14, minWidth: 28 }}>
              {rankMedal(entry.rank)}
            </Typography>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{
                fontSize: 13, color: isMe ? GOLD : 'white',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {entry.user?.username || entry.user?.fullName || 'Player'}
                {isMe && <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>(you)</span>}
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#555' }}>
                {entry.correctAnswers}✓ {entry.wrongAnswers}✗
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 14, color: GOLD, fontWeight: 700, flexShrink: 0 }}>
              {entry.totalScore}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
