import { Box, CircularProgress, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/useAuth'
import AuthNavbar from '../../components/layout/AuthNavbar'
import { connectSocket } from '../../services/socket'

const GOLD = '#C9A84C'
const DARK = '#0A0A0F'
const DARK2 = '#12121A'
const DARK3 = '#1C1C28'
const BEBAS = "'Bebas Neue', sans-serif"

const gameIcons = { Blackjack: '♠', Chess: '♟', Checkers: '⬤' }

const STATUS_STYLE = {
  active:     { label: 'Active',     bg: '#1a3a5c', color: '#2196f3' },
  eliminated: { label: 'Eliminated', bg: '#3a1a1a', color: '#f44336' },
  winner:     { label: 'Winner',     bg: '#2a2000', color: GOLD },
}

const STAGE_STATUS_STYLE = {
  live:      { label: 'Live',      color: '#2196f3' },
  completed: { label: 'Completed', color: '#4caf50' },
  scheduled: { label: 'Scheduled', color: '#888' },
}

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

    sock.on('blackjack:stage-over', refresh)
    sock.on('blackjack:next-stage', refresh)
    sock.on('blackjack:tournament-over', refresh)
    sock.on('tournament:update', refresh)

    return () => {
      sock.emit('leave-tournament-room', id)
      sock.off('blackjack:stage-over', refresh)
      sock.off('blackjack:next-stage', refresh)
      sock.off('blackjack:tournament-over', refresh)
      sock.off('tournament:update', refresh)
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

  // Sort players: winner first, then active (by score desc), then eliminated (by stage desc)
  const sorted = [...players].sort((a, b) => {
    const order = { winner: 0, active: 1, eliminated: 2 }
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    if (a.status === 'eliminated' && b.status === 'eliminated') return b.stage - a.stage
    return (b.score ?? 0) - (a.score ?? 0)
  })

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={user?.walletBalance || 0}
        elo={user?.elo?.chess || 1200}
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
              </Typography>
            )}
          </Box>
        </Box>

        {/* Stages timeline */}
        {stages.length > 0 && (
          <Box sx={{ bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.1)', borderRadius: 2, p: 3, mb: 4 }}>
            <Typography sx={{ fontFamily: BEBAS, fontSize: 18, letterSpacing: 2, mb: 2 }}>
              STAGES
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {stages.map(s => {
                const style = STAGE_STATUS_STYLE[s.status] || STAGE_STATUS_STYLE.scheduled
                return (
                  <Box key={s.stage} sx={{
                    flex: 1, minWidth: 100,
                    bgcolor: DARK3, borderRadius: 1,
                    border: `1px solid ${s.status === 'live' ? 'rgba(33,150,243,0.4)' : 'rgba(255,255,255,0.05)'}`,
                    p: 2, textAlign: 'center'
                  }}>
                    <Typography sx={{ fontFamily: BEBAS, fontSize: 22, letterSpacing: 2, color: GOLD }}>
                      {s.stage}
                    </Typography>
                    <Typography sx={{ color: '#666', fontSize: 11, mb: 0.5 }}>STAGE</Typography>
                    <Typography sx={{ fontSize: 11, color: style.color }}>{style.label}</Typography>
                    <Typography sx={{ color: '#555', fontSize: 11, mt: 0.5 }}>
                      {s.playerCount} players
                    </Typography>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}

        {/* Players standings */}
        <Box sx={{ bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.1)', borderRadius: 2, p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography sx={{ fontFamily: BEBAS, fontSize: 18, letterSpacing: 2 }}>
              STANDINGS
            </Typography>
            {tournament.status === 'ongoing' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2196f3', animation: 'pulse 1.5s infinite' }} />
                <Typography sx={{ color: '#2196f3', fontSize: 12 }}>Live</Typography>
              </Box>
            )}
          </Box>

          {/* Table header */}
          <Box sx={{
            display: 'grid', gridTemplateColumns: '32px 1fr 80px 80px 100px',
            gap: 1, px: 2, pb: 1,
            borderBottom: '1px solid rgba(255,255,255,0.06)'
          }}>
            {['#', 'Player', 'Stage', 'Score', 'Status'].map(h => (
              <Typography key={h} sx={{ color: '#555', fontSize: 11, textTransform: 'uppercase' }}>
                {h}
              </Typography>
            ))}
          </Box>

          {sorted.map((player, index) => {
            const style = STATUS_STYLE[player.status] || STATUS_STYLE.eliminated
            const isMe = player._id === userId

            return (
              <Box key={player._id} sx={{
                display: 'grid', gridTemplateColumns: '32px 1fr 80px 80px 100px',
                gap: 1, alignItems: 'center',
                px: 2, py: 1.5,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                bgcolor: isMe ? 'rgba(201,168,76,0.04)' : 'transparent',
                '&:last-child': { borderBottom: 'none' }
              }}>
                <Typography sx={{ color: '#555', fontSize: 13 }}>{index + 1}</Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{
                    width: 28, height: 28, borderRadius: '50%',
                    bgcolor: 'rgba(201,168,76,0.1)',
                    border: '1px solid rgba(201,168,76,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: GOLD
                  }}>
                    {(player.username || player.fullName || 'P')[0].toUpperCase()}
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 14, color: isMe ? GOLD : 'white' }}>
                      {player.username || player.fullName || 'Player'}
                      {isMe && <span style={{ color: GOLD, fontSize: 11, marginLeft: 6 }}>You</span>}
                    </Typography>
                  </Box>
                </Box>

                <Typography sx={{ fontSize: 13, color: '#aaa' }}>
                  {player.stage > 0 ? `Stage ${player.stage}` : '—'}
                </Typography>

                <Typography sx={{ fontSize: 13, color: player.score != null ? GOLD : '#555' }}>
                  {player.score != null ? `⬡ ${player.score}` : '—'}
                </Typography>

                <Box sx={{ px: 1.5, py: 0.4, borderRadius: 1, bgcolor: style.bg, display: 'inline-flex', width: 'fit-content' }}>
                  <Typography sx={{ fontSize: 11, color: style.color }}>{style.label}</Typography>
                </Box>
              </Box>
            )
          })}
        </Box>

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
