import { Box, Typography } from '@mui/material'
import { GOLD } from '../../../styles/themeConstants'

const timerColor = (timeLeft, totalTime) => {
  const ratio = totalTime > 0 ? timeLeft / totalTime : 0
  if (ratio > 0.5) return GOLD
  if (ratio > 0.25) return '#E8843C'
  return '#E84040'
}

// ── Circular countdown timer ───────────────────────────────────────────────────
export default function CircleTimer({ timeLeft, totalTime, phase }) {
  const SIZE = 68
  const STROKE = 4
  const RADIUS = (SIZE - STROKE * 2) / 2
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const ratio = totalTime > 0 && phase === 'question' ? timeLeft / totalTime : 0
  const dashOffset = CIRCUMFERENCE * (1 - ratio)
  const color = phase === 'question' ? timerColor(timeLeft, totalTime) : '#333'

  return (
    <Box sx={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          fill="none" stroke={color} strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={phase === 'question' ? dashOffset : CIRCUMFERENCE}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.15s linear, stroke 0.3s ease' }}
        />
      </svg>
      <Box sx={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Typography sx={{
          fontSize: 17, fontWeight: 700,
          color: phase === 'question' ? color : '#444',
          transition: 'color 0.3s',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {phase === 'question' ? timeLeft : '—'}
        </Typography>
      </Box>
    </Box>
  )
}
