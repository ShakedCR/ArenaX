import { Box, Button, Typography } from '@mui/material'
import { GOLD, DARK, DARK2, BEBAS } from './constants'

export default function StageOverScreen({ stageData, playerNames, currentUserId, onBack }) {
  const isAdvancing = stageData?.advancingPlayers?.includes(currentUserId)

  return (
    <Box sx={{
      bgcolor: DARK, minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
    }}>
      <Typography sx={{ fontFamily: BEBAS, fontSize: 20, color: GOLD, letterSpacing: 3 }}>
        STAGE {stageData?.stage} COMPLETE
      </Typography>

      <Typography sx={{ fontSize: 50 }}>{isAdvancing ? '✅' : '❌'}</Typography>

      <Typography sx={{
        fontFamily: BEBAS, fontSize: 32,
        color: isAdvancing ? '#4caf50' : '#ef5350',
        letterSpacing: 3,
      }}>
        {isAdvancing ? 'YOU ADVANCE!' : 'ELIMINATED'}
      </Typography>

      <Box sx={{ bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 2, p: 3, minWidth: 300 }}>
        <Typography sx={{ color: '#888', fontSize: 12, mb: 2, fontFamily: BEBAS, letterSpacing: 2 }}>
          STAGE RESULTS
        </Typography>
        {(stageData?.leaderboard || []).map((e, i) => {
          const advancing = stageData?.advancingPlayers?.includes(e.playerId)
          return (
            <Box key={e.playerId} sx={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              py: 1, borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ color: advancing ? '#4caf50' : '#ef5350', fontSize: 12 }}>
                  {advancing ? '↑' : '✗'}
                </Typography>
                <Typography sx={{ color: e.playerId === currentUserId ? GOLD : '#888', fontSize: 14 }}>
                  #{i + 1} {playerNames[e.playerId] || 'Player'}
                </Typography>
              </Box>
              <Typography sx={{ color: GOLD, fontSize: 14 }}>⬡ {e.tokens}</Typography>
            </Box>
          )
        })}
      </Box>

      <Typography sx={{ color: '#555', fontSize: 13 }}>
        {isAdvancing ? 'Next stage starting soon…' : 'Better luck next time!'}
      </Typography>

      {!isAdvancing && (
        <Button
          onClick={onBack}
          sx={{ bgcolor: GOLD, color: DARK, px: 4, py: 1.5, fontFamily: BEBAS, fontSize: 18, '&:hover': { bgcolor: '#E8C97A' } }}
        >
          BACK TO LOBBY
        </Button>
      )}
    </Box>
  )
}
