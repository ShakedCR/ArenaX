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
      <Typography sx={{ color: '#888', fontSize: 13, mb: 1 }}>
        Token Balance
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
        <Typography sx={{ color: GOLD, fontSize: 36 }}>⬡</Typography>
        <Typography sx={{ fontFamily: BEBAS, fontSize: 56, color: GOLD, letterSpacing: 2 }}>
          {balance.toLocaleString()}
        </Typography>
      </Box>

      <Typography sx={{ color: '#666', fontSize: 13 }}>
        Tokens
      </Typography>
    </Box>
  )
}