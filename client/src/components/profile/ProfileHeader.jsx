import { Box, Button, InputBase, Typography } from '@mui/material'
import { GOLD, DARK2, DARK3, BEBAS } from '../../styles/themeConstants'

export default function ProfileHeader({
  user,
  initials,
  completedCount,
  editingUsername,
  newUsername,
  usernameError,
  usernameLoading,
  onEditUsername,
  onUsernameChange,
  onSaveUsername,
  onCancelEdit
}) {
  return (
    <Box sx={{
      bgcolor: DARK2,
      border: '1px solid rgba(201,168,76,0.15)',
      borderRadius: 2,
      p: 4,
      mb: 4,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2
    }}>
      <Box sx={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        bgcolor: 'rgba(201,168,76,0.15)',
        border: '3px solid rgba(201,168,76,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            width={120}
            height={120}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <Typography sx={{ fontFamily: BEBAS, fontSize: 36, color: GOLD }}>
            {initials}
          </Typography>
        )}
      </Box>

      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{ fontFamily: BEBAS, fontSize: 28, letterSpacing: 2 }}>
          {user?.fullName || user?.username}
        </Typography>

        {editingUsername ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', mt: 0.5, mb: 1 }}>
            <Typography sx={{ color: '#666', fontSize: 13 }}>@</Typography>

            <InputBase
              value={newUsername}
              onChange={e => onUsernameChange(e.target.value)}
              autoFocus
              sx={{
                color: 'white',
                fontSize: 13,
                borderBottom: `1px solid ${GOLD}`,
                px: 0.5,
                minWidth: 120
              }}
            />

            <Button
              onClick={onSaveUsername}
              disabled={usernameLoading}
              sx={{ color: GOLD, fontSize: 11, py: 0, minWidth: 'unset' }}
            >
              {usernameLoading ? '...' : 'Save'}
            </Button>

            <Button
              onClick={onCancelEdit}
              sx={{ color: '#666', fontSize: 11, py: 0, minWidth: 'unset' }}
            >
              Cancel
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', mb: 1 }}>
            <Typography sx={{ color: '#888', fontSize: 13 }}>
              @{user?.username}
            </Typography>

            <Box
              onClick={onEditUsername}
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                bgcolor: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 11,
                '&:hover': {
                  bgcolor: 'rgba(201,168,76,0.2)',
                  borderColor: GOLD
                }
              }}
            >
              ✎
            </Box>
          </Box>
        )}

        {usernameError && (
          <Typography sx={{ color: 'red', fontSize: 12, mb: 1 }}>
            {usernameError}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Box sx={{
            bgcolor: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 1,
            px: 2,
            py: 0.5
          }}>
            <Typography sx={{ color: GOLD, fontSize: 13 }}>
              Elo {user?.elo?.blackjack || 1200}
            </Typography>
          </Box>

          <Box sx={{
            bgcolor: DARK3,
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 1,
            px: 2,
            py: 0.5
          }}>
            <Typography sx={{ color: '#aaa', fontSize: 13 }}>
              ⬡ {user?.walletBalance || 0} tokens
            </Typography>
          </Box>

          <Box sx={{
            bgcolor: DARK3,
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 1,
            px: 2,
            py: 0.5
          }}>
            <Typography sx={{ color: '#aaa', fontSize: 13 }}>
              {completedCount} completed
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}