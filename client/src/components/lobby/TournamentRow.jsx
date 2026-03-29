import { Box, Button, Typography } from '@mui/material'

const GOLD = '#C9A84C'
const DARK2 = '#12121A'
const DARK3 = '#1C1C28'

const gameIcons = {
  Blackjack: '♠',
  Chess: '♟',
  Checkers: '⬤'
}

const statusColors = {
  Filling: '#2d5a27',
  'In Progress': '#1a3a5c',
  Completed: '#3a3a3a'
}

const statusTextColors = {
  Filling: '#4caf50',
  'In Progress': '#2196f3',
  Completed: '#888'
}

export default function TournamentRow({ tournament, onJoin }) {
  const { name, gameType, entryFee, players, maxPlayers, status } = tournament

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
          {gameIcons[gameType]}
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{name}</Typography>
          <Typography sx={{ color: '#666', fontSize: 12 }}>{gameType}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: '#666', fontSize: 11 }}>Entry</Typography>
          <Typography sx={{ color: GOLD, fontSize: 13 }}>⬡ {entryFee}</Typography>
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: '#666', fontSize: 11 }}>Players</Typography>
          <Typography sx={{ fontSize: 13 }}>👥 {players}/{maxPlayers}</Typography>
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

      <Button
        onClick={() => onJoin(tournament)}
        sx={{
          border: '1px solid rgba(201,168,76,0.3)',
          color: status === 'Completed' ? '#888' : GOLD,
          px: 3, fontSize: 13,
          '&:hover': { borderColor: GOLD, bgcolor: 'rgba(201,168,76,0.1)' }
        }}>
        {status === 'Completed' ? 'View' : status === 'In Progress' ? 'View' : 'Join'}
      </Button>
    </Box>
  )
}