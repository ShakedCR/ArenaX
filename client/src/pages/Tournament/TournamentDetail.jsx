import { Box, Button, CircularProgress, Divider, Snackbar, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/useAuth'
import AuthNavbar from '../../components/layout/AuthNavbar'

const GOLD = '#C9A84C'
const DARK = '#0A0A0F'
const DARK2 = '#12121A'
const BEBAS = "'Bebas Neue', sans-serif"

const statusColors = {
  draft: { bg: '#2a2a2a', text: '#888' },
  open: { bg: '#2d5a27', text: '#4caf50' },
  ongoing: { bg: '#1a3a5c', text: '#2196f3' },
  completed: { bg: '#3a3a3a', text: '#888' }
}

export default function TournamentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })

  useEffect(() => {
    api.get(`/tournaments/${id}`)
      .then(res => setTournament(res.data.tournament))
      .catch(() => navigate('/lobby'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const isCreator = tournament && user && tournament.createdBy?._id === user._id

  const handleCopyInviteLink = async () => {
    try {
      const res = await api.get(`/tournaments/${id}/invite-link`)
      await navigator.clipboard.writeText(res.data.inviteLink)
      setSnackbar({ open: true, message: 'Invite link copied to clipboard!' })
    } catch {
      setSnackbar({ open: true, message: 'Failed to copy invite link.' })
    }
  }

  const handleRegenerateInvite = async () => {
    try {
      const res = await api.patch(`/tournaments/${id}/regenerate-invite`)
      setTournament(prev => ({ ...prev, inviteCode: res.data.inviteCode }))
      await navigator.clipboard.writeText(res.data.inviteLink)
      setSnackbar({ open: true, message: 'Invite link regenerated and copied!' })
    } catch {
      setSnackbar({ open: true, message: 'Failed to regenerate invite link.' })
    }
  }

  if (loading) {
    return (
      <Box sx={{ bgcolor: DARK, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: GOLD }} />
      </Box>
    )
  }

  if (!tournament) return null

  const colors = statusColors[tournament.status] || statusColors.draft

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={user?.tokenBalance || 0}
        elo={user?.elo?.chess || 1200}
      />

      <Box sx={{ px: 6, py: 4, maxWidth: 800, mx: 'auto' }}>
        <Button
          onClick={() => navigate('/lobby')}
          sx={{ color: '#666', mb: 3, fontSize: 13, '&:hover': { color: 'white' } }}>
          ← Back to Lobby
        </Button>

        <Box sx={{ bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.15)', borderRadius: 2, p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Typography sx={{ fontFamily: BEBAS, fontSize: 32, letterSpacing: 2 }}>
                {tournament.title}
              </Typography>
              <Typography sx={{ color: '#888', fontSize: 13, mt: 0.5 }}>
                {tournament.gameTitle} · {tournament.format}
              </Typography>
            </Box>
            <Box sx={{
              px: 2, py: 0.5, borderRadius: 1,
              bgcolor: colors.bg
            }}>
              <Typography sx={{ fontSize: 12, color: colors.text, textTransform: 'capitalize' }}>
                {tournament.status}
              </Typography>
            </Box>
          </Box>

          {tournament.description && (
            <Typography sx={{ color: '#aaa', fontSize: 14, mb: 3 }}>
              {tournament.description}
            </Typography>
          )}

          <Divider sx={{ borderColor: 'rgba(201,168,76,0.1)', mb: 3 }} />

          <Box sx={{ display: 'flex', gap: 4, mb: 3, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ color: '#666', fontSize: 11 }}>Entry Fee</Typography>
              <Typography sx={{ color: GOLD, fontSize: 14 }}>⬡ {tournament.entryFee ?? 0}</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: '#666', fontSize: 11 }}>Prize Pool</Typography>
              <Typography sx={{ color: GOLD, fontSize: 14 }}>⬡ {tournament.prizePool ?? 0}</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: '#666', fontSize: 11 }}>Players</Typography>
              <Typography sx={{ fontSize: 14 }}>
                👥 {tournament.participants?.length ?? 0} / {tournament.maxParticipants}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: '#666', fontSize: 11 }}>Start Date</Typography>
              <Typography sx={{ fontSize: 14 }}>
                {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString() : '—'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: '#666', fontSize: 11 }}>Created By</Typography>
              <Typography sx={{ fontSize: 14 }}>
                {tournament.createdBy?.username || tournament.createdBy?.fullName || '—'}
              </Typography>
            </Box>
          </Box>

          {isCreator && (
            <>
              <Divider sx={{ borderColor: 'rgba(201,168,76,0.1)', mb: 3 }} />
              <Box>
                <Typography sx={{ color: '#888', fontSize: 12, mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Invite Management
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    onClick={handleCopyInviteLink}
                    sx={{
                      border: '1px solid rgba(201,168,76,0.4)',
                      color: GOLD, px: 3, fontSize: 13,
                      '&:hover': { borderColor: GOLD, bgcolor: 'rgba(201,168,76,0.1)' }
                    }}>
                    📋 Copy Invite Link
                  </Button>
                  <Button
                    onClick={handleRegenerateInvite}
                    sx={{
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#aaa', px: 3, fontSize: 13,
                      '&:hover': { borderColor: 'white', color: 'white', bgcolor: 'rgba(255,255,255,0.05)' }
                    }}>
                    🔄 Regenerate Invite Link
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
