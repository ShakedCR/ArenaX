import { Box, Button, Modal, Typography, CircularProgress } from '@mui/material'
import { useState } from 'react'
import { useAuth } from '../../contexts/useAuth'
import api from '../../services/api'
import QRCodeDisplay from '../common/QRCodeDisplay'

const GOLD = '#C9A84C'
const DARK2 = '#12121A'

const gameIcons = {
  Blackjack: '♠',
  Trivia: '❓',
}

const statusColors = {
  draft: '#3a3a3a',
  open: '#2d5a27',
  ongoing: '#1a3a5c',
  completed: '#3a3a3a'
}

const statusTextColors = {
  draft: '#888',
  open: '#4caf50',
  ongoing: '#2196f3',
  completed: '#888'
}

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
  const [showQR, setShowQR] = useState(false)
  const [qrData, setQrData] = useState(null)
  const [loadingQR, setLoadingQR] = useState(false)

  const isCreator = normalizeId(user?.id || user?._id) === normalizeId(createdBy)
  const inviteLink = tournament.inviteCode ? `${window.location.origin}/tournaments/join/${tournament.inviteCode}` : null

  const handleShowQR = async () => {
    if (!inviteLink) return

    if (!isCreator) {
      setQrData({ inviteLink })
      setShowQR(true)
      return
    }

    setLoadingQR(true)
    try {
      const response = await api.get(`/tournaments/${tournament._id}/invite-link`)
      const payload = response.data || {}
      // payload: { inviteCode, inviteLink }
      const qrImageRes = await api.get(`/tournaments/${tournament._id}/qr`).catch(() => null)
      setQrData({ inviteLink: payload.inviteLink, inviteCode: payload.inviteCode, qrImage: qrImageRes?.data?.data?.qrImage || qrImageRes?.data?.qrImage || null })
      setShowQR(true)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingQR(false)
    }
  }

  const handleCopyLink = () => {
    if (inviteLink) navigator.clipboard.writeText(inviteLink)
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.1)', borderRadius: 1, px: 3, py: 2, mb: 1.5 }}>
        {/* Left: icon + title + private lock */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 220 }}>
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
            bgcolor: statusColors[status] || '#3a3a3a',
          }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: statusTextColors[status] || '#888', textTransform: 'capitalize' }}>
              {status}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, minWidth: 280, justifyContent: 'flex-end' }}>
          {inviteLink && (
            <Button onClick={handleShowQR} disabled={loadingQR} sx={{ border: '1px solid rgba(201,168,76,0.3)', color: GOLD, px: 2, fontSize: 12 }}>
              {loadingQR ? <CircularProgress size={20} /> : 'QR'}
            </Button>
          )}
          {isCreator && (
            <>
              <Button onClick={() => setShowInvite(true)} sx={{ border: '1px solid rgba(201,168,76,0.3)', color: GOLD, px: 2, fontSize: 12 }}>
                Invite
              </Button>
            </>
          )}
          {isCreator && status === 'draft' && (
            <Button onClick={() => onOpen(tournament)} sx={{ border: '1px solid rgba(76,175,80,0.4)', color: '#4caf50', px: 2, fontSize: 12 }}>
              Open
            </Button>
          )}
          <Button onClick={() => onJoin(tournament)} disabled={status !== 'open' && !(isCreator && isPrivate)} sx={{ color: (status === 'open' || (isCreator && isPrivate)) ? GOLD : '#555', px: 3, fontSize: 13 }}>
            {status === 'ongoing' ? 'View' : 'Join'}
          </Button>
        </Box>
      </Box>

      <QRCodeDisplay open={showQR} onClose={() => setShowQR(false)} inviteLink={qrData?.inviteLink} qrImage={qrData?.qrImage} tournamentName={title} isLoading={loadingQR} hasPassword={isPrivate} />

      <Modal open={showInvite} onClose={() => setShowInvite(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: DARK2, borderRadius: 2, p: 4, width: '100%', maxWidth: 460 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 3 }}>Invite: {title}</Typography>
          <Typography sx={{ color: '#aaa', fontSize: 12, mb: 1 }}>Link: {inviteLink}</Typography>
          {isPrivate && (
            <Typography sx={{ color: '#f44336', fontSize: 12, mb: 1 }}>This tournament requires a password to join.</Typography>
          )}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button fullWidth onClick={handleCopyLink} sx={{ bgcolor: GOLD, color: '#0A0A0F', py: 1 }}>Copy</Button>
            <Button fullWidth onClick={() => setShowInvite(false)} sx={{ color: '#aaa' }}>Close</Button>
          </Box>
        </Box>
      </Modal>
    </>
  )
}
