import { Box, Button, Typography } from '@mui/material'
import { GOLD, DARK, DARK2 } from '../../styles/themeConstants'

export default function DailyBonusCard({
  bonusClaimed,
  claimingBonus,
  onClaim
}) {
  return (
    <Box sx={{
      bgcolor: DARK2,
      border: '1px solid rgba(201,168,76,0.15)',
      borderRadius: 2,
      p: 3,
      mb: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: 'rgba(201,168,76,0.1)',
          border: '1px solid rgba(201,168,76,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18
        }}>
          🎁
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
            Daily Bonus
          </Typography>

          <Typography sx={{ color: '#666', fontSize: 12 }}>
            {bonusClaimed
              ? 'Come back tomorrow!'
              : 'Claim your daily +50 tokens'}
          </Typography>
        </Box>
      </Box>

      <Button
        onClick={onClaim}
        disabled={bonusClaimed || claimingBonus}
        sx={{
          bgcolor: bonusClaimed ? '#3a3a3a' : GOLD,
          color: bonusClaimed ? '#666' : DARK,
          px: 3,
          fontWeight: 700,
          fontSize: 13,
          '&:hover': {
            bgcolor: bonusClaimed ? '#3a3a3a' : '#E8C97A'
          },
          '&.Mui-disabled': {
            bgcolor: '#3a3a3a',
            color: '#666'
          }
        }}
      >
        {claimingBonus
          ? '...'
          : bonusClaimed
            ? 'Claimed'
            : 'Claim +50'}
      </Button>
    </Box>
  )
}