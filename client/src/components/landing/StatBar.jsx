import { Box, Typography } from '@mui/material'
import { GOLD } from '../../styles/themeConstants'

const stats = [
  { num: '2', label: 'GAMES', sub: 'Blackjack, Trivia' },
  { num: '1K', label: 'TOKENS', sub: 'Starting balance' },
  { num: 'ELO', label: 'SYSTEM', sub: 'Competitive ranking' },
  { num: 'AI', label: 'INSIGHTS', sub: 'Question generation + RAG' },
]

export default function StatBar() {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', borderBottom: `1px solid rgba(201,168,76,0.1)` }}>
      {stats.map((s, i) => (
        <Box key={i} sx={{
          flex: { xs: '0 0 50%', md: 1 }, py: 3, px: { xs: 1.5, md: 4 }, textAlign: 'center',
          borderRight: i % 2 === 0
            ? `1px solid rgba(201,168,76,0.1)`
            : { xs: 'none', md: i < stats.length - 1 ? `1px solid rgba(201,168,76,0.1)` : 'none' },
          borderBottom: { xs: i < 2 ? `1px solid rgba(201,168,76,0.1)` : 'none', md: 'none' }
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