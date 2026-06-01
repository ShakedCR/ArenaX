import { Box, CircularProgress, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/useAuth'
import AuthNavbar from '../../components/layout/AuthNavbar'
import { connectSocket } from '../../services/socket'
import StagesTimeline from '../../components/tournament/StagesTimeline'
import PlayersTable from '../../components/tournament/PlayersTable'

const GOLD = '#C9A84C'
const DARK = '#0A0A0F'
const BEBAS = "'Bebas Neue', sans-serif"

const gameIcons = { Blackjack: '♠' }

export default function TournamentStandings() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStandings = async () => {
    try {
      const res = await api.get(`/matches/tournament/${id}/standings`)
      setData(res.data)
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStandings()
  }, [id])

  // Live updates via socket
  useEffect(() => {
    const sock = connectSocket(localStorage.getItem('token'))
    sock.emit('join-tournament-room', id)

    const refresh = () => fetchStandings()

    sock.on('blackjack:round-result', refresh)
    sock.on('blackjack:stage-over', refresh)
    sock.on('blackjack:next-stage', refresh)
    sock.on('blackjack:tournament-over', refresh)
    sock.on('tournament:update', refresh)
    sock.on('tournament:status-changed', refresh)

    return () => {
      sock.emit('leave-tournament-room', id)
      sock.off('blackjack:round-result', refresh)
      sock.off('blackjack:stage-over', refresh)
      sock.off('blackjack:next-stage', refresh)
      sock.off('blackjack:tournament-over', refresh)
      sock.off('tournament:update', refresh)
      sock.off('tournament:status-changed', refresh)
    }
  }, [id])

  if (loading) return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress sx={{ color: GOLD }} />
    </Box>
  )

  if (!data) return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography sx={{ color: '#666' }}>Tournament not found.</Typography>
    </Box>
  )

  const { tournament, players, stages } = data
  const userId = user?.id || user?._id

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={user?.walletBalance || 0}
      />

      <Box sx={{ maxWidth: 800, mx: 'auto', py: 6, px: 4 }}>

        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography sx={{ fontSize: 36, mb: 1 }}>
            {gameIcons[tournament.gameTitle] ?? '🎮'}
          </Typography>
          <Typography sx={{ fontFamily: BEBAS, fontSize: 40, letterSpacing: 3, mb: 1 }}>
            {tournament.title}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
            <Typography sx={{ color: '#666', fontSize: 13 }}>
              {tournament.gameTitle}
            </Typography>
            <Typography sx={{ color: GOLD, fontSize: 13 }}>
              ⬡ {tournament.prizePool} prize pool
            </Typography>
            {tournament.status === 'ongoing' && (
              <Typography sx={{ color: '#2196f3', fontSize: 13 }}>
                Stage {tournament.currentStage}
                {tournament.currentRound != null && tournament.totalRounds != null && (
                  <span style={{ color: '#888', marginLeft: 8 }}>
                    · Round {tournament.currentRound}/{tournament.totalRounds}
                  </span>
                )}
              </Typography>
            )}
          </Box>
        </Box>

        <StagesTimeline stages={stages} />

        <PlayersTable
          players={players}
          userId={userId}
          tournamentStatus={tournament.status}
        />

        <Box
          onClick={() => navigate('/tournaments')}
          sx={{ textAlign: 'center', mt: 4, color: '#555', fontSize: 13, cursor: 'pointer', '&:hover': { color: '#aaa' } }}>
          ← Back to Tournaments
        </Box>
      </Box>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </Box>
  )
}
