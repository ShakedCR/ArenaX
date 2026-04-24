import { Box, Typography } from '@mui/material'
import { GOLD, SUIT_SYMBOLS, SUIT_COLORS } from './constants'

export function PlayingCard({ card, faceDown = false }) {
  if (faceDown) {
    return (
      <Box sx={{
        width: 72, height: 104, borderRadius: 2,
        bgcolor: '#1a237e',
        border: '2px solid rgba(255,255,255,0.12)',
        backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,0.04) 0,rgba(255,255,255,0.04) 2px,transparent 2px,transparent 8px)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
      }} />
    )
  }

  const symbol = SUIT_SYMBOLS[card.suit] || SUIT_SYMBOLS[card.suite] || '?'
  const color  = SUIT_COLORS[card.suit]  || SUIT_COLORS[card.suite]  || '#111'
  const rank   = card.rank || card.text || '?'

  return (
    <Box sx={{
      width: 72, height: 104, borderRadius: 2,
      bgcolor: '#fff',
      border: '2px solid rgba(0,0,0,0.08)',
      display: 'flex', flexDirection: 'column',
      p: '6px', position: 'relative',
      boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
      userSelect: 'none',
    }}>
      <Box sx={{ lineHeight: 1 }}>
        <Typography sx={{ color, fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{rank}</Typography>
        <Typography sx={{ color, fontSize: 13, lineHeight: 1 }}>{symbol}</Typography>
      </Box>
      <Typography sx={{
        color, fontSize: 28, fontWeight: 700,
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
      }}>
        {symbol}
      </Typography>
      <Box sx={{ position: 'absolute', bottom: '6px', right: '6px', transform: 'rotate(180deg)', lineHeight: 1 }}>
        <Typography sx={{ color, fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{rank}</Typography>
        <Typography sx={{ color, fontSize: 13, lineHeight: 1 }}>{symbol}</Typography>
      </Box>
    </Box>
  )
}

export function CardRow({ cards, faceDownCount = 0, label, value, busted }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      {label && (
        <Typography sx={{ color: '#666', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', mb: 1.5 }}>
          {label}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap', minHeight: 104 }}>
        {cards.map((card, i) => <PlayingCard key={i} card={card} />)}
        {Array.from({ length: faceDownCount }).map((_, i) => <PlayingCard key={`fd-${i}`} faceDown />)}
        {cards.length === 0 && faceDownCount === 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ color: '#333', fontSize: 13 }}>No cards yet</Typography>
          </Box>
        )}
      </Box>
      {value !== undefined && value !== null && (
        <Typography sx={{ color: busted ? '#ef5350' : GOLD, fontSize: 14, mt: 1.5, fontWeight: 600 }}>
          {busted ? 'BUST' : `Value: ${value.hi !== value.lo ? `${value.lo} / ${value.hi}` : value.hi}`}
        </Typography>
      )}
    </Box>
  )
}