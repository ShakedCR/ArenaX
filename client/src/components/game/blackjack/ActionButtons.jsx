import { Box, Button } from '@mui/material'
import { GOLD, DARK, DARK3, BEBAS } from './constants'

const BUTTONS = [
  { action: 'hit',    label: 'HIT' },
  { action: 'stand',  label: 'STAND' },
  { action: 'double', label: 'DOUBLE', requires: 'double' },
  { action: 'split',  label: 'SPLIT',  requires: 'split' },
]

export default function ActionButtons({ canAct, availableMoves, acting, onAction }) {
  const visibleButtons = BUTTONS.filter(
    btn => !btn.requires || availableMoves.includes(btn.requires)
  )

  return (
    <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
      {visibleButtons.map(({ action, label }) => (
        <Button
          key={action}
          onClick={() => onAction(action)}
          disabled={!canAct}
          sx={{
            width: 110, py: 1.5,
            fontFamily: BEBAS, fontSize: 18, letterSpacing: 2,
            bgcolor: canAct ? (action === 'hit' ? GOLD : DARK3) : '#1a1a1a',
            color: canAct ? (action === 'hit' ? DARK : GOLD) : '#444',
            border: `1px solid ${canAct ? GOLD : '#2a2a2a'}`,
            borderRadius: 1.5,
            '&:hover': { bgcolor: canAct ? (action === 'hit' ? '#E8C97A' : '#252535') : '#1a1a1a' },
            '&.Mui-disabled': { bgcolor: '#1a1a1a', color: '#333', border: '1px solid #1f1f1f' },
          }}
        >
          {acting ? '...' : label}
        </Button>
      ))}
    </Box>
  )
}
