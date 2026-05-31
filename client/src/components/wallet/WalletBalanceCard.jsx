import { Box, Typography } from '@mui/material'
import { GOLD, DARK2, BEBAS } from '../../styles/themeConstants'

export default function WalletBalanceCard({ balance }) {
  return (
    <Box sx={{
      bgcolor: DARK2,
      border: '1px solid rgba(201,168,76,0.3)',
      borderRadius: 2,
      p: 5,
      mb: 3,
      textAlign: 'center'
    }}>
      <Typography sx={{ color: '#888', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', mb: 3 }}>
        Token Balance
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1, mr: 3 }}>
        <Typography sx={{ color: GOLD, fontFamily: BEBAS, fontSize: 32, lineHeight: 1 }}>⬡</Typography>
        <Typography sx={{ fontFamily: BEBAS, fontSize: 72, color: GOLD, letterSpacing: 2, lineHeight: 1 }}>
          {balance.toLocaleString()}
        </Typography>
      </Box>
    </Box>
  )
}