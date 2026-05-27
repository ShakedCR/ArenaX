import { Box, Typography } from '@mui/material'
import { GOLD, DARK, BEBAS } from '../../components/game/blackjack/constants'

export default function Chess() {
  return (
    <Box sx={{
      bgcolor: DARK, minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 2,
    }}>
      <Typography sx={{ fontSize: 64 }}>♟️</Typography>
      <Typography sx={{ fontFamily: BEBAS, fontSize: 42, color: GOLD, letterSpacing: 4 }}>
        CHESS
      </Typography>
      <Typography sx={{ fontFamily: BEBAS, fontSize: 20, color: '#555', letterSpacing: 3 }}>
        COMING SOON
      </Typography>
    </Box>
  )
}
