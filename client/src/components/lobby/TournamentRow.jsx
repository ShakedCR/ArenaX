import { Box, Button, Modal, Typography } from '@mui/material'
import { useState } from 'react'
import { useAuth } from '../../contexts/useAuth'
import api from '../../services/api'
import { GOLD, DARK2 } from '../../styles/themeConstants'
import { gameIcons } from '../../styles/gameConstants'
import { TOURNAMENT_STATUS_COLORS } from '../../styles/statusConstants'

const normalizeId = (value) => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (typeof value._id === 'string') return value._id
    if (typeof value.id === 'string') return value.id
  }
  return null
}

export default function TournamentRow({ tournament, onJoin, onOpen }) {
  const { user } = useAuth()
  const { title, gameTitle, entryFee, participants, maxParticipants, status, createdBy, isPrivate } = tournament
  const [showInvite, setShowInvite] = useState(false)
  const [newPassword, setNewPassword] = useState(null)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const colors =
    TOURNAMENT_STATUS_COLORS[status]
    || TOURNAMENT_STATUS_COLORS.draft

  const isCreator = normalizeId(user?.id || user?._id) === normalizeId(createdBy)
  const inviteLink = tournament.inviteCode ? `${window.location.origin}/tournaments/join/${tournament.inviteCode}` : null

  const handleCopyLink = () => {
    if (inviteLink) navigator.clipboard.writeText(inviteLink)
  }

  const handleCloseInvite = () => {
    setShowInvite(false)
    setNewPassword(null)
    setPasswordError('')
  }

  const handleResetPassword = async () => {
    setPasswordLoading(true)
    setPasswordError('')
    try {
      const res = await api.patch(`/tournaments/${tournament._id}/regenerate-password`)
      setNewPassword(res.data.privatePassword)
    } catch {
      setPasswordError('Failed to reset password. Please try again.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleCopyPassword = () => {
    if (newPassword) navigator.clipboard.writeText(newPassword)
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.1)', borderRadius: 1, px: 3, py: 2, mb: 1.5, gap: { xs: 1.5, md: 0 } }}>
        {/* Left: icon + title + private lock */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: { xs: 0, md: 220 } }}>
          <Typography sx={{ fontSize: 18 }}>{gameIcons[gameTitle] ?? '🎮'}</Typography>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{title}</Typography>
              {isPrivate && <Typography sx={{ fontSize: 12 }}>🔒</Typography>}
            </Box>
            <Typography sx={{ color: '#555', fontSize: 11 }}>{gameTitle}</Typography>
          </Box>
        </Box>

        {/* Center: entry fee + players + status badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Entry</Typography>
            <Typography sx={{ color: GOLD, fontSize: 13, fontWeight: 600 }}>⬡ {entryFee}</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Players</Typography>
            <Typography sx={{ fontSize: 13, color: '#aaa' }}>{participants?.length || 0}/{maxParticipants}</Typography>
          </Box>
          <Box sx={{
            px: 1.5, py: 0.4, borderRadius: 1,
            bgcolor: colors.bg,
          }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: colors.text, textTransform: 'capitalize' }}>
              {status}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, minWidth: { xs: 0, md: 280 }, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}>
          {isCreator && (
            <Button onClick={() => setShowInvite(true)} sx={{ border: '1px solid rgba(201,168,76,0.3)', color: GOLD, px: 2, fontSize: 12 }}>
              Invite
            </Button>
          )}
          {isCreator && status === 'draft' && (
            <Button onClick={() => onOpen(tournament)} sx={{ border: '1px solid rgba(76,175,80,0.4)', color: '#4caf50', px: 2, fontSize: 12 }}>
              Open
            </Button>
          )}
          {(() => {
            const isFull = (participants?.length || 0) >= maxParticipants
            const alreadyJoined = tournament.participants?.some(
              p => normalizeId(p?._id || p) === normalizeId(user?.id || user?._id)
            )
            const canJoin = status === 'open' && !isFull && !alreadyJoined
            const label = status === 'ongoing' ? 'View' : isFull ? 'Full' : 'Join'
            const active = canJoin || alreadyJoined || status === 'ongoing' || (isCreator && isPrivate)
            return (
              <Button
                onClick={() => onJoin(tournament)}
                disabled={!active}
                sx={{ color: active ? GOLD : '#555', px: 3, fontSize: 13 }}
              >
                {label}
              </Button>
            )
          })()}
        </Box>
      </Box>

      <Modal open={showInvite} onClose={handleCloseInvite}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: DARK2, borderRadius: 2, p: 4, width: '100%', maxWidth: 460 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 3 }}>Invite: {title}</Typography>
          <Typography sx={{ color: '#aaa', fontSize: 12, mb: 1 }}>Link: {inviteLink}</Typography>
          {isPrivate && (
            <>
              <Typography sx={{ color: '#f44336', fontSize: 12, mb: 1 }}>This tournament requires a password to join.</Typography>

              {newPassword ? (
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 1, p: 1.5, mb: 2 }}>
                  <Typography sx={{ color: '#aaa', fontSize: 11, mb: 0.5 }}>New password — share this with your friends:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography sx={{ color: GOLD, fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>{newPassword}</Typography>
                    <Button onClick={handleCopyPassword} sx={{ color: GOLD, fontSize: 11, minWidth: 'unset' }}>Copy</Button>
                  </Box>
                </Box>
              ) : (
                <>
                  <Button
                    onClick={handleResetPassword}
                    disabled={passwordLoading}
                    sx={{ color: GOLD, fontSize: 12, p: 0, minWidth: 'unset', textDecoration: 'underline' }}
                  >
                    {passwordLoading ? 'Resetting...' : 'Forgot the password? Reset it'}
                  </Button>
                  <Typography sx={{ color: '#666', fontSize: 10, mb: 2 }}>
                    Resetting invalidates the previous password immediately.
                  </Typography>
                </>
              )}

              {passwordError && (
                <Typography sx={{ color: '#f44336', fontSize: 11, mb: 1 }}>{passwordError}</Typography>
              )}
            </>
          )}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button fullWidth onClick={handleCopyLink} sx={{ bgcolor: GOLD, color: '#0A0A0F', py: 1 }}>Copy</Button>
            <Button fullWidth onClick={handleCloseInvite} sx={{ color: '#aaa' }}>Close</Button>
          </Box>
        </Box>
      </Modal>
    </>
  )
}
