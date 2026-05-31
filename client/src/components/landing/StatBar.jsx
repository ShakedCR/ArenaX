import { Box, Typography } from '@mui/material'

const GOLD = '#C9A84C'

const stats = [
  { num: '1', label: 'GAME', sub: 'Blackjack' },
  { num: '1K', label: 'TOKENS', sub: 'Starting balance' },
  { num: 'ELO', label: 'SYSTEM', sub: 'Competitive ranking' },
  { num: 'AI', label: 'INSIGHTS', sub: 'Post-game analysis' },
]

export default function StatBar() {
  return (
    <Box sx={{ display: 'flex', borderBottom: `1px solid rgba(201,168,76,0.1)` }}>
      {stats.map((s, i) => (
        <Box key={i} sx={{
          flex: 1, py: 3, px: 4, textAlign: 'center',
          borderRight: i < stats.length - 1
            ? `1px solid rgba(201,168,76,0.1)`
            : 'none'
        }}>
          <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: 28, letterSpacing: 2 }}>
            {s.num} <span style={{ fontSize: 14 }}>{s.label}</span>
          </Typography>
          <Typography sx={{ color: '#666', fontSize: 12, mt: 0.5 }}>
            {s.sub}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}