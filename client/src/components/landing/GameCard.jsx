import { Box, Typography } from '@mui/material'
import { GOLD, DARK2, DARK3, BEBAS } from '../../styles/themeConstants'

export default function GameCard({ game, onPlay }) {
  return (
    <Box sx={{
      bgcolor: DARK2,
      border: `1px solid rgba(201,168,76,0.15)`,
      borderRadius: 2, p: 4, textAlign: 'left', cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': { bgcolor: DARK3, borderColor: GOLD }
    }}>
      <Box sx={{
        width: 48, height: 48,
        bgcolor: 'rgba(201,168,76,0.1)',
        border: `1px solid rgba(201,168,76,0.3)`,
        borderRadius: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 22, mb: 3
      }}>
        {game.icon}
      </Box>
      <Typography sx={{ fontFamily: BEBAS, fontSize: 28, letterSpacing: 3, mb: 1 }}>
        {game.name}
      </Typography>
      <Typography sx={{ color: '#888', fontSize: 14, lineHeight: 1.7, mb: 3 }}>
        {game.desc}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ color: '#555', fontSize: 12 }}>
          {game.tag}
        </Typography>
        <Typography onClick={onPlay} sx={{ color: GOLD, fontSize: 13, cursor: 'pointer', '&:hover': { color: '#E8C97A' } }}>
          Play Now →
        </Typography>
      </Box>
    </Box>
  )
}