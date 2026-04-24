import { Box, Typography } from '@mui/material'
import { GOLD, BEBAS } from './constants'

export default function RoundResultOverlay({ result, currentUserId, round }) {
  if (!result) return null

  const myResult     = result.results?.find(r => r.id === currentUserId)
  const outcomeColor = myResult?.outcome === 'win' ? '#4caf50' : myResult?.outcome === 'loss' ? '#ef5350' : GOLD
  const outcomeLabel = myResult?.outcome === 'win' ? 'WIN'      : myResult?.outcome === 'loss' ? 'LOSS'    : 'DRAW'

  return (
    <Box sx={{
      position: 'absolute', inset: 0,
      bgcolor: 'rgba(10,10,15,0.88)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 10, gap: 2,
    }}>
      <Typography sx={{ fontFamily: BEBAS, fontSize: 18, letterSpacing: 4, color: '#666' }}>
        ROUND {round} RESULT
      </Typography>
      {myResult && (
        <>
          <Typography sx={{ fontFamily: BEBAS, fontSize: 64, color: outcomeColor, lineHeight: 1 }}>
            {outcomeLabel}
          </Typography>
          <Typography sx={{ color: outcomeColor, fontSize: 20, fontWeight: 700 }}>
            {myResult.delta > 0 ? '+' : ''}{myResult.delta} tokens
          </Typography>
        </>
      )}
      <Typography sx={{ color: '#555', fontSize: 13, mt: 1 }}>Next round starting…</Typography>
    </Box>
  )
}
