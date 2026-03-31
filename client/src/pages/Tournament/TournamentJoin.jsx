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

export default function TournamentJoin() {
  const { inviteCode } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })

  useEffect(() => {
    api.get(`/tournaments/invite/${inviteCode}`)
      .then(res => setTournament(res.data.tournament))
      .catch(() => setSnackbar({ open: true, message: 'Tournament not found.' }))
      .finally(() => setLoading(false))
  }, [inviteCode])

  const alreadyJoined = tournament && user &&
    tournament.participants?.some(p => (p._id || p) === user._id)

  const handleJoin = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setJoining(true)
    try {
      await api.post(`/tournaments/invite/${inviteCode}/join`)
      setSnackbar({ open: true, message: 'Successfully joined the tournament!' })
      const res = await api.get(`/tournaments/invite/${inviteCode}`)
      setTournament(res.data.tournament)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to join tournament.'
      setSnackbar({ open: true, message: msg })
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ bgcolor: DARK, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: GOLD }} />
      </Box>
    )
  }

  const colors = tournament
    ? (statusColors[tournament.status] || statusColors.draft)
    : statusColors.draft

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      {user && (
        <AuthNavbar
          username={user?.username || 'Player'}
          tokens={user?.tokenBalance || 0}
          elo={user?.elo?.chess || 1200}
        />
      )}

      <Box sx={{ px: 6, py: 4, maxWidth: 700, mx: 'auto' }}>
        {!tournament ? (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography sx={{ fontFamily: BEBAS, fontSize: 28, color: '#888' }}>
              Tournament Not Found
            </Typography>
            <Typography sx={{ color: '#666', fontSize: 14, mt: 1, mb: 3 }}>
              This invite link may be invalid or expired.
            </Typography>
            <Button
              onClick={() => navigate('/lobby')}
              sx={{ border: '1px solid rgba(201,168,76,0.4)', color: GOLD, px: 3,
                '&:hover': { borderColor: GOLD, bgcolor: 'rgba(201,168,76,0.1)' } }}>
              Back to Lobby
            </Button>
          </Box>
        ) : (
          <>
            <Typography sx={{ color: '#666', fontSize: 13, mb: 3 }}>
              You've been invited to join a tournament
            </Typography>

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
                <Box sx={{ px: 2, py: 0.5, borderRadius: 1, bgcolor: colors.bg }}>
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

              <Box sx={{ display: 'flex', gap: 4, mb: 4, flexWrap: 'wrap' }}>
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

              {alreadyJoined ? (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography sx={{ color: '#4caf50', fontSize: 14, alignSelf: 'center' }}>
                    ✓ You have already joined this tournament
                  </Typography>
                </Box>
              ) : tournament.status !== 'open' ? (
                <Typography sx={{ color: '#888', fontSize: 14 }}>
                  This tournament is not currently accepting participants.
                </Typography>
              ) : (
                <Button
                  onClick={handleJoin}
                  disabled={joining}
                  sx={{
                    bgcolor: GOLD, color: DARK, px: 4, py: 1.2,
                    fontWeight: 700, fontSize: 14,
                    '&:hover': { bgcolor: '#E8C97A' },
                    '&:disabled': { bgcolor: 'rgba(201,168,76,0.3)', color: '#888' }
                  }}>
                  {joining ? 'Joining...' : 'Join Tournament'}
                </Button>
              )}
            </Box>
          </>
        )}
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
