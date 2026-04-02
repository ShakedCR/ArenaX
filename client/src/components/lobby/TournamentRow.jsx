import { Box, Button, Typography } from '@mui/material'
import { useAuth } from '../../contexts/useAuth'

const GOLD = '#C9A84C'
const DARK2 = '#12121A'
const DARK3 = '#1C1C28'

const gameIcons = {
  Blackjack: '♠',
  Chess: '♟',
  Checkers: '⬤'
}

const statusColors = {
  draft: '#3a3a3a',
  open: '#2d5a27',
  ongoing: '#1a3a5c',
  completed: '#3a3a3a',
  cancelled: '#3a1a1a'
}

const statusTextColors = {
  draft: '#888',
  open: '#4caf50',
  ongoing: '#2196f3',
  completed: '#888',
  cancelled: '#f44336'
}

export default function TournamentRow({ tournament, onJoin, onOpen }) {
  const { user } = useAuth()
  const { title, gameTitle, entryFee, participants, maxParticipants, status, createdBy } = tournament

  const isCreator = user?.id === createdBy?._id || user?.id === createdBy

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.1)',
      borderRadius: 1, px: 3, py: 2, mb: 1.5,
      '&:hover': { bgcolor: DARK3, borderColor: 'rgba(201,168,76,0.3)' },
      transition: 'all 0.2s'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
        <Box sx={{
          width: 36, height: 36,
          bgcolor: 'rgba(201,168,76,0.1)',
          border: '1px solid rgba(201,168,76,0.3)',
          borderRadius: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 16
        }}>
          {gameIcons[gameTitle]}
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{title}</Typography>
          <Typography sx={{ color: '#666', fontSize: 12 }}>{gameTitle}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: '#666', fontSize: 11 }}>Entry</Typography>
          <Typography sx={{ color: GOLD, fontSize: 13 }}>⬡ {entryFee}</Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: '#666', fontSize: 11 }}>Players</Typography>
          <Typography sx={{ fontSize: 13 }}>👥 {participants?.length || 0}/{maxParticipants}</Typography>
        </Box>
        <Box sx={{
          px: 2, py: 0.5, borderRadius: 1,
          bgcolor: statusColors[status] || '#3a3a3a',
        }}>
          <Typography sx={{ fontSize: 12, color: statusTextColors[status] || '#888' }}>
            {status}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        {isCreator && status === 'draft' && (
          <Button
            onClick={() => onOpen(tournament)}
            sx={{
              border: '1px solid rgba(76,175,80,0.4)',
              color: '#4caf50', px: 2, fontSize: 12,
              '&:hover': { borderColor: '#4caf50', bgcolor: 'rgba(76,175,80,0.1)' }
            }}>
            Open
          </Button>
        )}
        <Button
          onClick={() => onJoin(tournament)}
          disabled={status !== 'open'}
          sx={{
            border: `1px solid ${status === 'open' ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.1)'}`,
            color: status === 'open' ? GOLD : '#555',
            px: 3, fontSize: 13,
            '&:hover': { borderColor: GOLD, bgcolor: 'rgba(201,168,76,0.1)' },
            '&.Mui-disabled': { color: '#555', border: '1px solid rgba(255,255,255,0.1)' }
          }}>
          {status === 'completed' ? 'View' : status === 'ongoing' ? 'View' : 'Join'}
        </Button>
      </Box>
    </Box>
  )
}