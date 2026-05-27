import { Box, Typography } from '@mui/material'

const GOLD = '#C9A84C'
const DARK3 = '#1C1C28'

const filters = ['All', 'Blackjack']

export default function FilterBar({ active, onChange }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
      {filters.map(f => (
        <Box key={f}
          onClick={() => onChange(f)}
          sx={{
            px: 2.5, py: 0.8, borderRadius: 1, cursor: 'pointer',
            border: `1px solid ${active === f ? GOLD : 'rgba(255,255,255,0.1)'}`,
            bgcolor: active === f ? 'rgba(201,168,76,0.1)' : DARK3,
            color: active === f ? GOLD : '#aaa',
            fontSize: 13,
            transition: 'all 0.2s',
            '&:hover': { borderColor: GOLD, color: GOLD }
          }}>
          {f}
        </Box>
      ))}
    </Box>
  )
}