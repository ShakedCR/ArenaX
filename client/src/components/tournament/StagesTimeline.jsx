import { Box, Typography } from '@mui/material'

const GOLD = '#C9A84C'
const DARK2 = '#12121A'
const DARK3 = '#1C1C28'
const BEBAS = "'Bebas Neue', sans-serif"

const STAGE_STATUS_STYLE = {
  live:      { label: 'Live',      color: '#2196f3' },
  completed: { label: 'Completed', color: '#4caf50' },
  scheduled: { label: 'Scheduled', color: '#888' },
}

export default function StagesTimeline({ stages }) {
  if (!stages.length) return null

  return (
    <Box sx={{ bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.1)', borderRadius: 2, p: 3, mb: 4 }}>
      <Typography sx={{ fontFamily: BEBAS, fontSize: 18, letterSpacing: 2, mb: 2 }}>
        STAGES
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {stages.map(s => {
          const style = STAGE_STATUS_STYLE[s.status] || STAGE_STATUS_STYLE.scheduled
          return (
            <Box key={s.stage} sx={{
              flex: 1, minWidth: 100,
              bgcolor: DARK3, borderRadius: 1,
              border: `1px solid ${s.status === 'live' ? 'rgba(33,150,243,0.4)' : 'rgba(255,255,255,0.05)'}`,
              p: 2, textAlign: 'center'
            }}>
              <Typography sx={{ fontFamily: BEBAS, fontSize: 22, letterSpacing: 2, color: GOLD }}>
                {s.stage}
              </Typography>
              <Typography sx={{ color: '#666', fontSize: 11, mb: 0.5 }}>STAGE</Typography>
              <Typography sx={{ fontSize: 11, color: style.color }}>{style.label}</Typography>
              <Typography sx={{ color: '#555', fontSize: 11, mt: 0.5 }}>
                {s.playerCount} players
              </Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
