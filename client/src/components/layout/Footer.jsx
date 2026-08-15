import { Box, Typography } from '@mui/material'
import { GOLD } from '../../styles/themeConstants'

export default function Footer() {
  return (
    <Box sx={{
      py: 4, px: { xs: 2, md: 6 },
      borderTop: `1px solid rgba(201,168,76,0.1)`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    }}>
      <Typography sx={{ color: GOLD, fontWeight: 700, letterSpacing: 3, fontSize: 14 }}>
        ARENAX
      </Typography>

      <Typography sx={{ color: '#555', fontSize: 12 }}>
        © 2026 ArenaX. All rights reserved.
      </Typography>
    </Box>
  )
}