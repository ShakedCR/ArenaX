import { Box, Typography } from '@mui/material'

import { DARK2, DARK3 } from '../../styles/themeConstants'
import { gameIcons } from '../../styles/gameConstants'

const getPlacementLabel = (placement) => {
  if (!placement) return '-'

  const lastTwoDigits = placement % 100
  const lastDigit = placement % 10

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${placement}th`
  }

  if (lastDigit === 1) return `${placement}st`
  if (lastDigit === 2) return `${placement}nd`
  if (lastDigit === 3) return `${placement}rd`

  return `${placement}th`
}

const getOutcome = (tournament, userId) => {
  const winner = tournament.result?.winner
  if (!winner || !userId) return null
  const winnerId = winner._id ?? winner
  return winnerId.toString() === userId.toString() ? 'winner' : 'loser'
}

export default function TournamentHistoryRow({ tournament, userId }) {
  const earnings = tournament.result?.earnings || 0
  const outcome = getOutcome(tournament, userId)

  return (
    <Box
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
        transition: 'all 0.2s',
        '&:hover': {
          bgcolor: DARK3
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography sx={{ fontSize: 20 }}>
          {gameIcons[tournament.gameTitle]}
        </Typography>

        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
            {tournament.title}
          </Typography>

          <Typography sx={{ color: '#666', fontSize: 12 }}>
            {tournament.gameTitle}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Typography sx={{ color: '#666', fontSize: 12 }}>
          {new Date(tournament.createdAt).toLocaleDateString()}
        </Typography>

        {tournament.result?.placement && (
          <Typography sx={{ color: '#888', fontSize: 13, minWidth: 40, textAlign: 'center' }}>
            {getPlacementLabel(tournament.result.placement)}
          </Typography>
        )}

        {earnings !== 0 && (
          <Typography sx={{
            color: earnings > 0 ? '#4caf50' : '#f44336',
            fontSize: 13, minWidth: 50, textAlign: 'right'
          }}>
            {earnings > 0 ? `+${earnings}` : `${earnings}`}
          </Typography>
        )}

        {outcome && (
          <Box sx={{
            px: 1.5, py: 0.4, borderRadius: 1,
            bgcolor: outcome === 'winner'
              ? 'rgba(201,168,76,0.15)'
              : 'rgba(244,67,54,0.12)',
            border: `1px solid ${outcome === 'winner' ? 'rgba(201,168,76,0.4)' : 'rgba(244,67,54,0.3)'}`,
          }}>
            <Typography sx={{
              fontSize: 11, fontWeight: 700,
              color: outcome === 'winner' ? '#C9A84C' : '#f44336',
              letterSpacing: 0.5
            }}>
              {outcome === 'winner' ? 'Winner' : 'Loser'}
            </Typography>
          </Box>
        )}

      </Box>
    </Box>
  )
}