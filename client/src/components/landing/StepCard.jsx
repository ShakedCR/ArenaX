import { Box, Typography } from '@mui/material'

const GOLD = '#C9A84C'
const DARK = '#0A0A0F'
const BEBAS = "'Bebas Neue', sans-serif"

export default function StepCard({ step }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{
        width: 48, height: 48, borderRadius: '50%',
        bgcolor: GOLD, color: DARK, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        mx: 'auto', mb: 3, fontSize: 18
      }}>
        {step.num}
      </Box>
      <Typography sx={{ fontFamily: BEBAS, fontSize: 22, letterSpacing: 3, mb: 1 }}>
        {step.title}
      </Typography>
      <Typography sx={{ color: '#888', fontSize: 13, lineHeight: 1.7 }}>
        {step.desc}
      </Typography>
    </Box>
  )
}