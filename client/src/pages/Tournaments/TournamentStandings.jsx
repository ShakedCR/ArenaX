import { Box, CircularProgress, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/useAuth'
import AuthNavbar from '../../components/layout/AuthNavbar'
import { connectSocket } from '../../services/socket'
import StagesTimeline from '../../components/tournament/StagesTimeline'
import PlayersTable from '../../components/tournament/PlayersTable'
import { GOLD, DARK, DARK2, BEBAS } from '../../styles/themeConstants'

const gameIcons = { Blackjack: '♠', Trivia: '❓' }

const rankMedal = (rank) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

const TRIVIA_STATUS_STYLE = {
  active:    { label: 'Playing',  bg: '#1a3a5c', color: '#2196f3' },
  winner:    { label: 'Winner',   bg: '#2a2000', color: GOLD },
  completed: { label: 'Finished', bg: '#1a1a2a', color: '#888' },
}

function TriviaPlayersTable({ players, userId, tournamentStatus }) {
  const sorted = [...players].sort((a, b) => {
    const order = { winner: 0, active: 1, completed: 2 }
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    return (b.totalScore ?? 0) - (a.totalScore ?? 0)
  })

  return (
    <Box sx={{ bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.1)', borderRadius: 2, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography sx={{ fontFamily: BEBAS, fontSize: 18, letterSpacing: 2 }}>STANDINGS</Typography>
        {tournamentStatus === 'ongoing' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2196f3', animation: 'pulse 1.5s infinite' }} />
            <Typography sx={{ color: '#2196f3', fontSize: 12 }}>Live</Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{
        display: 'grid', gridTemplateColumns: '36px 1fr 80px 70px 70px 100px',
        gap: 1, px: 2, pb: 1, minWidth: 420,
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        {['', 'Player', 'Score', '✓', '✗', 'Status'].map((h, i) => (
          <Typography key={i} sx={{ color: '#555', fontSize: 11, textTransform: 'uppercase' }}>{h}</Typography>
        ))}
      </Box>

      {sorted.map((player, index) => {
        const style = TRIVIA_STATUS_STYLE[player.status] || TRIVIA_STATUS_STYLE.completed
        const isMe = player._id === userId
        const rank = player.rank ?? index + 1

        return (
          <Box key={player._id} sx={{
            display: 'grid', gridTemplateColumns: '36px 1fr 80px 70px 70px 100px',
            gap: 1, alignItems: 'center',
            px: 2, py: 1.5, minWidth: 420,
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            bgcolor: isMe ? 'rgba(201,168,76,0.04)' : 'transparent',
            '&:last-child': { borderBottom: 'none' }
          }}>
            <Typography sx={{ fontSize: 16 }}>{rankMedal(rank)}</Typography>

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
              <Typography sx={{ fontSize: 14, color: isMe ? GOLD : 'white' }}>
                {player.username || player.fullName || 'Player'}
                {isMe && <span style={{ color: GOLD, fontSize: 11, marginLeft: 6 }}>You</span>}
              </Typography>
            </Box>

            <Typography sx={{ fontSize: 13, color: player.totalScore > 0 ? GOLD : '#555', fontWeight: 700 }}>
              {player.totalScore > 0 ? player.totalScore : '—'}
            </Typography>

            <Typography sx={{ fontSize: 13, color: '#4caf50' }}>
              {player.correctAnswers > 0 ? player.correctAnswers : '—'}
            </Typography>

            <Typography sx={{ fontSize: 13, color: '#e57373' }}>
              {player.wrongAnswers > 0 ? player.wrongAnswers : '—'}
            </Typography>

            <Box sx={{ px: 1.5, py: 0.4, borderRadius: 1, bgcolor: style.bg, display: 'inline-flex' }}>
              <Typography sx={{ fontSize: 11, color: style.color }}>{style.label}</Typography>
            </Box>
          </Box>
        )
      })}
      </Box>
    </Box>
  )
}

export default function TournamentStandings() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStandings = useCallback(async () => {
    try {
      const res = await api.get(`/matches/tournament/${id}/standings`)
      const gameTitle = res.data?.tournament?.gameTitle

      if (gameTitle === 'Trivia') {
        const triviaRes = await api.get(`/trivia/tournament/${id}/standings`)
        setData({ ...triviaRes.data, isTrivia: true })
      } else {
        setData(res.data)
      }
    } catch (err) {
      console.error('[TournamentStandings] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchStandings()
  }, [fetchStandings])

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
    sock.on('trivia:game-completed', refresh)

    return () => {
      sock.emit('leave-tournament-room', id)
      sock.off('blackjack:round-result', refresh)
      sock.off('blackjack:stage-over', refresh)
      sock.off('blackjack:next-stage', refresh)
      sock.off('blackjack:tournament-over', refresh)
      sock.off('tournament:update', refresh)
      sock.off('tournament:status-changed', refresh)
      sock.off('trivia:game-completed', refresh)
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

  const { tournament, players, stages, isTrivia } = data
  const userId = user?.id || user?._id

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar username={user?.username || 'Player'} tokens={user?.walletBalance || 0} />

      <Box sx={{ maxWidth: 800, mx: 'auto', py: 6, px: 4 }}>

        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography sx={{ fontSize: 36, mb: 1 }}>
            {gameIcons[tournament.gameTitle] ?? '🎮'}
          </Typography>
          <Typography sx={{ fontFamily: BEBAS, fontSize: 40, letterSpacing: 3, mb: 1 }}>
            {tournament.title}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
            <Typography sx={{ color: '#666', fontSize: 13 }}>
              {tournament.gameTitle}
              {isTrivia && tournament.category && (
                <span style={{ color: '#555', marginLeft: 6 }}>· {tournament.category} · {tournament.difficulty}</span>
              )}
            </Typography>
            <Typography sx={{ color: GOLD, fontSize: 13 }}>
              ⬡ {tournament.prizePool} prize pool
            </Typography>
            {tournament.status === 'ongoing' && !isTrivia && (
              <Typography sx={{ color: '#2196f3', fontSize: 13 }}>
                Stage {tournament.currentStage}
                {tournament.currentRound != null && tournament.totalRounds != null && (
                  <span style={{ color: '#888', marginLeft: 8 }}>
                    · Round {tournament.currentRound}/{tournament.totalRounds}
                  </span>
                )}
              </Typography>
            )}
            {tournament.status === 'ongoing' && isTrivia && tournament.currentQuestionIndex >= 0 && (
              <Typography sx={{ color: '#2196f3', fontSize: 13 }}>
                Question {tournament.currentQuestionIndex + 1}/{tournament.questionCount}
              </Typography>
            )}
          </Box>
        </Box>

        {!isTrivia && <StagesTimeline stages={stages} />}

        {isTrivia ? (
          <TriviaPlayersTable
            players={players}
            userId={userId}
            tournamentStatus={tournament.status}
          />
        ) : (
          <PlayersTable
            players={players}
            userId={userId}
            tournamentStatus={tournament.status}
          />
        )}

        <Box
          onClick={() => navigate('/tournaments')}
          sx={{ textAlign: 'center', mt: 4, color: '#555', fontSize: 13, cursor: 'pointer', '&:hover': { color: '#aaa' } }}
        >
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
