import { Box, Button, CircularProgress, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/useAuth'
import AuthNavbar from '../../components/layout/AuthNavbar'

const GOLD = '#C9A84C'
const DARK = '#0A0A0F'
const DARK2 = '#12121A'
const BEBAS = "'Bebas Neue', sans-serif"

const gameIcons = {
  Blackjack: '♠',
  Chess: '♟',
  Checkers: '⬤'
}

export default function WaitingRoom() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [redirecting, setRedirecting] = useState(false)

  const userId = user?.id || user?._id

  const findAndNavigateToMatch = (matches) => {
    const myMatch = matches.find(m =>
      m.participants?.some(p => {
        const pid = p._id || p
        return pid?.toString() === userId?.toString()
      })
    )
    if (myMatch) {
      navigate(`/game/blackjack/${myMatch._id}`)
    }
  }

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const res = await api.get(`/tournaments/${id}`)
        const t = res.data.tournament
        setTournament(t)

        if (t.status === 'ongoing' && !redirecting && userId) {
          setRedirecting(true)
          const matchRes = await api.get(`/matches/tournament/${id}`)
          findAndNavigateToMatch(matchRes.data.matches || [])
        }
      } catch {
        setError('Tournament not found')
      } finally {
        setLoading(false)
      }
    }
    fetchTournament()

    const interval = setInterval(fetchTournament, 5000)
    return () => clearInterval(interval)
  }, [id, userId])

  const handleStart = async () => {
    setStarting(true)
    try {
      const res = await api.patch(`/tournaments/${id}/start`)
      findAndNavigateToMatch(res.data.matches || [])
    } catch {
      setError('Failed to start tournament')
    } finally {
      setStarting(false)
    }
  }

  const creatorId = tournament?.createdBy?._id || tournament?.createdBy?.id || tournament?.createdBy

  const isCreator = userId && creatorId && userId.toString() === creatorId.toString()

  const canStart = isCreator &&
    tournament?.status === 'open' &&
    tournament?.participants?.length >= 4

  if (loading) return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress sx={{ color: GOLD }} />
    </Box>
  )

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={user?.walletBalance || 0}
        elo={user?.elo?.chess || 1200}
      />

      <Box sx={{ maxWidth: 600, mx: 'auto', py: 8, px: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography sx={{ fontSize: 40, mb: 1 }}>
            {gameIcons[tournament?.gameTitle]}
          </Typography>
          <Typography sx={{ fontFamily: BEBAS, fontSize: 40, letterSpacing: 3, mb: 1 }}>
            {tournament?.title}
          </Typography>
          <Typography sx={{ color: '#666', fontSize: 14 }}>
            {tournament?.gameTitle} · Entry: ⬡ {tournament?.entryFee}
          </Typography>
        </Box>

        <Box sx={{
          bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.15)',
          borderRadius: 2, p: 4, mb: 4
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography sx={{ fontFamily: BEBAS, fontSize: 20, letterSpacing: 2 }}>
              PLAYERS
            </Typography>
            <Typography sx={{ color: GOLD, fontSize: 14 }}>
              {tournament?.participants?.length || 0} / {tournament?.maxParticipants}
            </Typography>
          </Box>

          {tournament?.participants?.length === 0 ? (
            <Typography sx={{ color: '#666', fontSize: 13, textAlign: 'center', py: 2 }}>
              No players yet
            </Typography>
          ) : (
            tournament?.participants?.map((p, i) => (
              <Box key={i} sx={{
                display: 'flex', alignItems: 'center', gap: 2,
                py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '50%',
                  bgcolor: 'rgba(201,168,76,0.1)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, color: GOLD
                }}>
                  {i + 1}
                </Box>
                <Typography sx={{ fontSize: 14 }}>
                  {p.username || p.fullName || 'Player'}
                </Typography>
                {(p.id === userId || p._id === userId) && (
                  <Typography sx={{ color: GOLD, fontSize: 11, ml: 'auto' }}>You</Typography>
                )}
              </Box>
            ))
          )}
        </Box>

        {error && (
          <Typography sx={{ color: 'red', fontSize: 13, textAlign: 'center', mb: 2 }}>
            {error}
          </Typography>
        )}

        {isCreator ? (
          <Button
            fullWidth
            onClick={handleStart}
            disabled={!canStart || starting}
            sx={{
              bgcolor: canStart ? GOLD : '#3a3a3a',
              color: canStart ? DARK : '#666',
              py: 1.5, fontWeight: 700, fontSize: 15,
              '&:hover': { bgcolor: canStart ? '#E8C97A' : '#3a3a3a' },
              '&.Mui-disabled': { bgcolor: '#3a3a3a', color: '#666' }
            }}>
            {starting ? 'Starting...' : canStart ? 'Start Tournament' : `Waiting for players (${tournament?.participants?.length || 0}/4 minimum)`}
          </Button>
        ) : (
          <Box sx={{
            textAlign: 'center', py: 3,
            border: '1px solid rgba(201,168,76,0.1)',
            borderRadius: 2
          }}>
            <Typography sx={{ color: '#666', fontSize: 14 }}>
              Waiting for the host to start the tournament...
            </Typography>
          </Box>
        )}

        <Button
          fullWidth
          onClick={() => navigate('/lobby')}
          sx={{ mt: 2, color: '#666', fontSize: 13, '&:hover': { color: 'white' } }}>
          ← Back to Lobby
        </Button>
      </Box>
    </Box>
  )
}