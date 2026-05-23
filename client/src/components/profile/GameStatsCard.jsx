import { Box, Typography } from '@mui/material'
import { GOLD, DARK2 } from '../../styles/themeConstants'

export default function GameStatsCard({ game, icon, stats }) {
  return (
    <Box sx={{
      bgcolor: DARK2,
      border: '1px solid rgba(201,168,76,0.1)',
      borderRadius: 2,
      p: 3
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{
          width: 32,
          height: 32,
          bgcolor: 'rgba(201,168,76,0.1)',
          border: '1px solid rgba(201,168,76,0.3)',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14
        }}>
          {icon}
        </Box>

        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
          {game}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={{ color: '#666', fontSize: 12 }}>
          Win Rate
        </Typography>

        <Typography sx={{ color: GOLD, fontSize: 12 }}>
          {stats.winRate !== null ? `${stats.winRate}%` : '-'}
        </Typography>
      </Box>

      {stats.winRate !== null && (
        <Box sx={{ bgcolor: '#333', borderRadius: 1, height: 4, mb: 1 }}>
          <Box sx={{
            bgcolor: GOLD,
            borderRadius: 1,
            height: 4,
            width: `${stats.winRate}%`,
            transition: 'width 0.5s'
          }} />
        </Box>
      )}

      <Typography sx={{ color: '#555', fontSize: 11 }}>
        {stats.total} {stats.total === 1 ? 'tournament' : 'tournaments'} played
      </Typography>
    </Box>
  )
}