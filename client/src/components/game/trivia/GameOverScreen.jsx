import { Box, Button, Typography } from '@mui/material'
import { GOLD, DARK, DARK2, BEBAS } from '../../../styles/themeConstants'
import { rankMedal } from './triviaHelpers'

// ── Game over screen ──────────────────────────────────────────────────────────
export default function GameOverScreen({ finalLeaderboard, currentUserId, onBack }) {
  const myEntry = finalLeaderboard?.find(e => {
    const uid = e.user?._id || e.user?.id || e.user
    return uid?.toString() === currentUserId?.toString()
  })

  return (
    <Box sx={{
      bgcolor: DARK, minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      px: 4,
      animation: 'fadeIn 0.5s ease',
      '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } }
    }}>
      <Typography sx={{ fontFamily: BEBAS, fontSize: { xs: 40, md: 52 }, letterSpacing: 4, color: GOLD, mb: 1 }}>
        QUIZ COMPLETE
      </Typography>

      {myEntry ? (
        <Box sx={{
          textAlign: 'center', mb: 4,
          animation: 'popIn 0.4s ease 0.15s both',
          '@keyframes popIn': {
            from: { opacity: 0, transform: 'scale(0.85)' },
            to: { opacity: 1, transform: 'scale(1)' }
          }
        }}>
          <Typography sx={{ fontSize: 44, mb: 0.5 }}>{rankMedal(myEntry.rank)}</Typography>
          <Typography sx={{ color: GOLD, fontSize: 26, fontWeight: 700 }}>
            {myEntry.totalScore} pts
          </Typography>
          <Typography sx={{ color: '#666', fontSize: 13, mt: 0.5 }}>
            {myEntry.correctAnswers} correct · {myEntry.wrongAnswers} wrong
          </Typography>
        </Box>
      ) : (
        <Typography sx={{ color: '#555', mb: 4, fontSize: 14 }}>No score recorded</Typography>
      )}

      <Box sx={{
        width: '100%', maxWidth: 480,
        bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.15)', borderRadius: 2, p: 3, mb: 4
      }}>
        <Typography sx={{ fontFamily: BEBAS, fontSize: 18, letterSpacing: 2, mb: 2 }}>
          FINAL STANDINGS
        </Typography>
        {finalLeaderboard?.length ? finalLeaderboard.map((entry) => {
          const uid = entry.user?._id || entry.user?.id || entry.user
          const isMe = uid?.toString() === currentUserId?.toString()
          return (
            <Box key={uid} sx={{
              display: 'flex', alignItems: 'center', gap: 2,
              py: 1.2, px: 1.5, mb: 0.5, borderRadius: 1,
              bgcolor: isMe ? 'rgba(201,168,76,0.08)' : 'transparent',
              border: isMe ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent'
            }}>
              <Typography sx={{ fontSize: 18, minWidth: 36 }}>{rankMedal(entry.rank)}</Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{
                  fontSize: 14, color: isMe ? GOLD : 'white',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {entry.user?.username || entry.user?.fullName || 'Player'}
                  {isMe && <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>(you)</span>}
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#555' }}>
                  {entry.correctAnswers}/{(entry.correctAnswers + entry.wrongAnswers) || 0} correct
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 16, color: GOLD, fontWeight: 700 }}>
                {entry.totalScore}
              </Typography>
            </Box>
          )
        }) : (
          <Typography sx={{ color: '#555', fontSize: 13, textAlign: 'center', py: 2 }}>
            No results available
          </Typography>
        )}
      </Box>

      <Button
        onClick={onBack}
        sx={{
          bgcolor: GOLD, color: DARK, px: 5, py: 1.5,
          fontWeight: 700, fontSize: 15,
          '&:hover': { bgcolor: '#E8C97A' }
        }}
      >
        Back to Lobby
      </Button>
    </Box>
  )
}
