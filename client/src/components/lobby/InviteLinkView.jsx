import { Box, Button, Typography } from '@mui/material'

import { GOLD, DARK, DARK3 } from '../../styles/themeConstants'

export default function InviteLinkView({
  inviteLink,
  password,
  onCopyLink,
  onDone
}) {
  return (
    <Box>
      <Typography sx={{ color: '#888', fontSize: 13, mb: 2 }}>
        Your private tournament was created! Share this link and password with invited players.
      </Typography>

      <Box sx={{
        bgcolor: DARK3,
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 1,
        p: 2,
        mb: 2,
        wordBreak: 'break-all'
      }}>
        <Typography sx={{ color: GOLD, fontSize: 13 }}>
          {inviteLink}
        </Typography>
      </Box>

      <Box sx={{
        bgcolor: DARK3,
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 1,
        p: 2,
        mb: 3
      }}>
        <Typography sx={{ color: '#aaa', fontSize: 12, mb: 0.5 }}>
          Password
        </Typography>
        <Typography sx={{ color: 'white', fontSize: 14 }}>
          {password}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          fullWidth
          onClick={onCopyLink}
          sx={{
            bgcolor: GOLD,
            color: DARK,
            py: 1.5,
            fontWeight: 700,
            fontSize: 14,
            '&:hover': { bgcolor: '#E8C97A' }
          }}
        >
          Copy Link
        </Button>

        <Button
          fullWidth
          onClick={onDone}
          sx={{
            color: '#aaa',
            border: '1px solid rgba(255,255,255,0.1)',
            py: 1.5,
            fontSize: 14,
            '&:hover': { borderColor: 'white', color: 'white' }
          }}
        >
          Done
        </Button>
      </Box>
    </Box>
  )
}