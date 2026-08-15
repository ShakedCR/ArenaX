import { Box, Typography } from '@mui/material'
import { GOLD, DARK3 } from '../../../styles/themeConstants'

// ── Answer button ─────────────────────────────────────────────────────────────
export default function AnswerButton({ label, text, index, phase, selectedAnswer, answerResult, onSelect }) {
  const isSelected = selectedAnswer === index
  const correctIndex = answerResult?.correctAnswerIndex

  let bg = DARK3
  let border = 'rgba(201,168,76,0.15)'
  let color = '#ccc'

  if (phase === 'question') {
    if (isSelected) {
      bg = 'rgba(201,168,76,0.2)'
      border = GOLD
      color = GOLD
    }
  } else if (phase === 'reveal') {
    if (index === correctIndex) {
      bg = 'rgba(76,175,80,0.2)'
      border = '#4caf50'
      color = '#4caf50'
    } else if (isSelected && index !== correctIndex) {
      bg = 'rgba(232,64,64,0.2)'
      border = '#E84040'
      color = '#E84040'
    } else {
      color = '#444'
      border = 'rgba(255,255,255,0.04)'
    }
  }

  const disabled = phase !== 'question' || selectedAnswer !== null

  return (
    <Box
      onClick={disabled ? undefined : () => onSelect(index)}
      sx={{
        display: 'flex', alignItems: 'center', gap: 2,
        p: 2, mb: 1.5, borderRadius: 1,
        cursor: disabled ? 'default' : 'pointer',
        bgcolor: bg, border: `1px solid ${border}`,
        transition: 'all 0.2s',
        '&:hover': disabled ? {} : { bgcolor: 'rgba(201,168,76,0.12)', borderColor: GOLD }
      }}
    >
      <Box sx={{
        width: 32, height: 32, borderRadius: 1, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 700,
        color, border: `1px solid ${border}`, transition: 'all 0.2s'
      }}>
        {label}
      </Box>
      <Typography sx={{ fontSize: 14, color, lineHeight: 1.4, transition: 'color 0.2s' }}>
        {text}
      </Typography>
    </Box>
  )
}
