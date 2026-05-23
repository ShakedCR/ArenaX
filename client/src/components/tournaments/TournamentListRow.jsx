import { memo } from 'react'
import { Box, Typography } from '@mui/material'

import { GOLD, DARK2, DARK3 } from '../../styles/themeConstants'
import { gameIcons } from '../../styles/gameConstants'
import { TOURNAMENT_STATUS_COLORS } from '../../styles/statusConstants'

function TournamentListRow({ tournament, onClick }) {
  const colors =
    TOURNAMENT_STATUS_COLORS[tournament.status]
    || TOURNAMENT_STATUS_COLORS.draft

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: DARK2,
        border: '1px solid rgba(201,168,76,0.1)',
        borderRadius: 1,
        px: 3,
        py: 2,
        mb: 1.5,
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          bgcolor: DARK3,
          borderColor: 'rgba(201,168,76,0.3)'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 220 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16
          }}
        >
          {gameIcons[tournament.gameTitle] ?? '🎮'}
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
            {tournament.title}
          </Typography>

          <Typography sx={{ color: '#666', fontSize: 12 }}>
            {tournament.gameTitle}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: '#666', fontSize: 11 }}>
            Prize
          </Typography>

          <Typography sx={{ color: GOLD, fontSize: 13 }}>
            ⬡ {tournament.prizePool}
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: '#666', fontSize: 11 }}>
            Players
          </Typography>

          <Typography sx={{ fontSize: 13 }}>
            👥 {tournament.participants?.length || 0}/{tournament.maxParticipants}
          </Typography>
        </Box>

        {tournament.status === 'ongoing' && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ color: '#666', fontSize: 11 }}>
              Stage
            </Typography>

            <Typography sx={{ color: GOLD, fontSize: 13 }}>
              {tournament.matchData?.currentStage ?? 1}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: 1,
            bgcolor: colors.bg
          }}
        >
          <Typography sx={{ fontSize: 12, color: colors.text }}>
            {tournament.status}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default memo(TournamentListRow)