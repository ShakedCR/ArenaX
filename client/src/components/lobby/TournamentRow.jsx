import { Box, Button, Modal, Typography } from '@mui/material'
import { useState } from 'react'
import { useAuth } from '../../contexts/useAuth'

const GOLD = '#C9A84C'
const DARK2 = '#12121A'
const DARK3 = '#1C1C28'

const gameIcons = {
  Blackjack: '♠',
  Trivia: '❓',
}

const statusColors = {
  draft: '#3a3a3a',
  open: '#2d5a27',
  ongoing: '#1a3a5c',
  completed: '#3a3a3a',
  cancelled: '#3a1a1a'
}

const statusTextColors = {
  draft: '#888',
  open: '#4caf50',
  ongoing: '#2196f3',
  completed: '#888',
  cancelled: '#f44336'
}

export default function TournamentRow({ tournament, onJoin, onOpen }) {
  const { user } = useAuth()
  const { title, gameTitle, entryFee, participants, maxParticipants, status, createdBy, isPrivate, inviteCode, privatePassword } = tournament
  const [showInvite, setShowInvite] = useState(false)

  const isCreator = user?.id === createdBy?._id || user?.id === createdBy

  const inviteLink = inviteCode
    ? `${window.location.origin}/tournaments/join/${inviteCode}`
    : null

  const handleCopyLink = () => navigator.clipboard.writeText(inviteLink)

  return (
    <>
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.1)',
        borderRadius: 1, px: 3, py: 2, mb: 1.5,
        '&:hover': { bgcolor: DARK3, borderColor: 'rgba(201,168,76,0.3)' },
        transition: 'all 0.2s'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
          <Box sx={{
            width: 36, height: 36,
            bgcolor: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 1, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 16
          }}>
            {gameIcons[gameTitle]}
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{title}</Typography>
              {isPrivate && <Typography sx={{ color: GOLD, fontSize: 11 }}>🔒</Typography>}
            </Box>
            <Typography sx={{ color: '#666', fontSize: 12 }}>{gameTitle}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ color: '#666', fontSize: 11 }}>Entry</Typography>
            <Typography sx={{ color: GOLD, fontSize: 13 }}>⬡ {entryFee}</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ color: '#666', fontSize: 11 }}>Players</Typography>
            <Typography sx={{ fontSize: 13 }}>👥 {participants?.length || 0}/{maxParticipants}</Typography>
          </Box>
          <Box sx={{
            px: 2, py: 0.5, borderRadius: 1,
            bgcolor: statusColors[status] || '#3a3a3a',
          }}>
            <Typography sx={{ fontSize: 12, color: statusTextColors[status] || '#888' }}>
              {status}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {isCreator && isPrivate && (
            <Button
              onClick={() => setShowInvite(true)}
              sx={{
                border: '1px solid rgba(201,168,76,0.3)',
                color: GOLD, px: 2, fontSize: 12,
                '&:hover': { borderColor: GOLD, bgcolor: 'rgba(201,168,76,0.1)' }
              }}>
              Invite
            </Button>
          )}
          {isCreator && status === 'draft' && (
            <Button
              onClick={() => onOpen(tournament)}
              sx={{
                border: '1px solid rgba(76,175,80,0.4)',
                color: '#4caf50', px: 2, fontSize: 12,
                '&:hover': { borderColor: '#4caf50', bgcolor: 'rgba(76,175,80,0.1)' }
              }}>
              Open
            </Button>
          )}
          <Button
            onClick={() => onJoin(tournament)}
            disabled={status !== 'open'}
            sx={{
              border: `1px solid ${status === 'open' ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: status === 'open' ? GOLD : '#555',
              px: 3, fontSize: 13,
              '&:hover': { borderColor: GOLD, bgcolor: 'rgba(201,168,76,0.1)' },
              '&.Mui-disabled': { color: '#555', border: '1px solid rgba(255,255,255,0.1)' }
            }}>
            {status === 'completed' ? 'View' : status === 'ongoing' ? 'View' : 'Join'}
          </Button>
        </Box>
      </Box>

      <Modal open={showInvite} onClose={() => setShowInvite(false)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 2, p: 4, width: '100%', maxWidth: 460, outline: 'none'
        }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 3 }}>
            🔒 {title} — Invite Details
          </Typography>

          <Typography sx={{ color: '#aaa', fontSize: 12, mb: 0.5 }}>Invite Link</Typography>
          <Box sx={{
            bgcolor: DARK3, border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: 1, p: 1.5, mb: 2, wordBreak: 'break-all'
          }}>
            <Typography sx={{ color: GOLD, fontSize: 12 }}>{inviteLink}</Typography>
          </Box>

          {privatePassword && (
            <>
              <Typography sx={{ color: '#aaa', fontSize: 12, mb: 0.5 }}>Password</Typography>
              <Box sx={{
                bgcolor: DARK3, border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 1, p: 1.5, mb: 3
              }}>
                <Typography sx={{ color: 'white', fontSize: 14, letterSpacing: 2 }}>
                  {privatePassword}
                </Typography>
              </Box>
            </>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              fullWidth
              onClick={handleCopyLink}
              sx={{
                bgcolor: GOLD, color: '#0A0A0F', py: 1.2,
                fontWeight: 700, fontSize: 13,
                '&:hover': { bgcolor: '#E8C97A' }
              }}>
              Copy Link
            </Button>
            <Button
              fullWidth
              onClick={() => setShowInvite(false)}
              sx={{
                color: '#aaa', border: '1px solid rgba(255,255,255,0.1)',
                py: 1.2, fontSize: 13,
                '&:hover': { borderColor: 'white', color: 'white' }
              }}>
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  )
}