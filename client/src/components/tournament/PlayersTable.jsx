import { Box, Typography } from '@mui/material'
import { GOLD, DARK2, BEBAS } from '../../styles/themeConstants'

const STATUS_STYLE = {
  active:     { label: 'Active',     bg: '#1a3a5c', color: '#2196f3' },
  eliminated: { label: 'Eliminated', bg: '#3a1a1a', color: '#f44336' },
  winner:     { label: 'Winner',     bg: '#2a2000', color: GOLD },
}

export default function PlayersTable({ players, userId, tournamentStatus }) {
  const sorted = [...players].sort((a, b) => {
    const order = { winner: 0, active: 1, eliminated: 2 }
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    if (a.status === 'eliminated' && b.status === 'eliminated') return b.stage - a.stage
    return (b.score ?? 0) - (a.score ?? 0)
  })

  return (
    <Box sx={{ bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.1)', borderRadius: 2, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography sx={{ fontFamily: BEBAS, fontSize: 18, letterSpacing: 2 }}>STANDINGS</Typography>
        {tournamentStatus === 'ongoing' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2196f3', animation: 'pulse 1.5s infinite' }} />
            <Typography sx={{ color: '#2196f3', fontSize: 12 }}>Live</Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        {/* Table header */}
        <Box sx={{
          display: 'grid', gridTemplateColumns: '32px 1fr 80px 80px 100px',
          gap: 1, px: 2, pb: 1, minWidth: 360,
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          {['#', 'Player', 'Stage', 'Score', 'Status'].map(h => (
            <Typography key={h} sx={{ color: '#555', fontSize: 11, textTransform: 'uppercase' }}>
              {h}
            </Typography>
          ))}
        </Box>

        {sorted.map((player, index) => {
          const style = STATUS_STYLE[player.status] || STATUS_STYLE.eliminated
          const isMe = player._id === userId

          return (
            <Box key={player._id} sx={{
              display: 'grid', gridTemplateColumns: '32px 1fr 80px 80px 100px',
              gap: 1, alignItems: 'center',
              px: 2, py: 1.5, minWidth: 360,
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              bgcolor: isMe ? 'rgba(201,168,76,0.04)' : 'transparent',
              '&:last-child': { borderBottom: 'none' }
            }}>
              <Typography sx={{ color: '#555', fontSize: 13 }}>{index + 1}</Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{
                  width: 28, height: 28, borderRadius: '50%',
                  bgcolor: 'rgba(201,168,76,0.1)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: GOLD
                }}>
                  {(player.username || player.fullName || 'P')[0].toUpperCase()}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14, color: isMe ? GOLD : 'white' }}>
                    {player.username || player.fullName || 'Player'}
                    {isMe && <span style={{ color: GOLD, fontSize: 11, marginLeft: 6 }}>You</span>}
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{ fontSize: 13, color: '#aaa' }}>
                {player.stage > 0 ? `Stage ${player.stage}` : '—'}
              </Typography>

              <Typography sx={{ fontSize: 13, color: player.score != null ? GOLD : '#555' }}>
                {player.score != null ? `⬡ ${player.score}` : '—'}
              </Typography>

              <Box sx={{ px: 1.5, py: 0.4, borderRadius: 1, bgcolor: style.bg, display: 'inline-flex', width: 'fit-content' }}>
                <Typography sx={{ fontSize: 11, color: style.color }}>{style.label}</Typography>
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
