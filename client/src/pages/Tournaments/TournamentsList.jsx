import { Box, CircularProgress, Tab, Tabs, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

const statusColors = {
  ongoing: { bg: '#1a3a5c', text: '#2196f3' },
  completed: { bg: '#1a2a1a', text: '#4caf50' },
  open: { bg: '#2d5a27', text: '#81c784' },
  draft: { bg: '#2a2a2a', text: '#888' },
  cancelled: { bg: '#3a1a1a', text: '#f44336' },
}

const TABS = ['All', 'Ongoing', 'Completed']

export default function TournamentsList() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTournaments = useCallback(async () => {
    try {
      const res = await api.get('/tournaments')
      const all = Array.isArray(res.data?.tournaments) ? res.data.tournaments : []
      setTournaments(all)
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTournaments()
    refreshUser()
  }, [fetchTournaments])

  useEffect(() => {
    const sock = connectSocket(localStorage.getItem('token'))

    const onParticipantAdded = ({ tournamentId, participant }) => {
      setTournaments(prev => prev.map(t =>
        t._id === tournamentId && !t.participants?.some(p => (p._id || p) === participant._id)
          ? { ...t, participants: [...(t.participants || []), participant] }
          : t
      ))
    }

    sock.on('tournament:created', fetchTournaments)
    sock.on('tournament:opened', fetchTournaments)
    sock.on('tournament:status-changed', fetchTournaments)
    sock.on('tournament:participant-added', onParticipantAdded)

    return () => {
      sock.off('tournament:created', fetchTournaments)
      sock.off('tournament:opened', fetchTournaments)
      sock.off('tournament:status-changed', fetchTournaments)
      sock.off('tournament:participant-added', onParticipantAdded)
    }
  }, [fetchTournaments])

  const filtered = tournaments.filter(t => {
    if (tab === 1) return t.status === 'ongoing'
    if (tab === 2) return t.status === 'completed'
    return true
  })

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={user?.walletBalance || 0}
        elo={user?.elo?.chess || 1200}
      />

      <Box sx={{ px: 6, py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontFamily: BEBAS, fontSize: 36, letterSpacing: 3 }}>
            TOURNAMENTS
          </Typography>
          <Typography sx={{ color: '#666', fontSize: 13 }}>
            Live results and standings
          </Typography>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: '#666', textTransform: 'none', fontSize: 14 },
            '& .Mui-selected': { color: GOLD },
            '& .MuiTabs-indicator': { bgcolor: GOLD }
          }}>
          {TABS.map(label => <Tab key={label} label={label} />)}
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress sx={{ color: GOLD }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography sx={{ color: '#666', fontSize: 14 }}>No tournaments found.</Typography>
          </Box>
        ) : (
          filtered.map(t => {
            const colors = statusColors[t.status] || statusColors.draft
            return (
              <Box
                key={t._id}
                onClick={() => navigate(`/tournaments/${t._id}`)}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.1)',
                  borderRadius: 1, px: 3, py: 2, mb: 1.5, cursor: 'pointer',
                  '&:hover': { bgcolor: DARK3, borderColor: 'rgba(201,168,76,0.3)' },
                  transition: 'all 0.2s'
                }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 220 }}>
                  <Box sx={{
                    width: 36, height: 36, bgcolor: 'rgba(201,168,76,0.1)',
                    border: '1px solid rgba(201,168,76,0.3)',
                    borderRadius: 1, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 16
                  }}>
                    {gameIcons[t.gameTitle] ?? '🎮'}
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{t.title}</Typography>
                    <Typography sx={{ color: '#666', fontSize: 12 }}>{t.gameTitle}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ color: '#666', fontSize: 11 }}>Prize</Typography>
                    <Typography sx={{ color: GOLD, fontSize: 13 }}>⬡ {t.prizePool}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ color: '#666', fontSize: 11 }}>Players</Typography>
                    <Typography sx={{ fontSize: 13 }}>
                      👥 {t.participants?.length || 0}/{t.maxParticipants}
                    </Typography>
                  </Box>
                  {t.status === 'ongoing' && (
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography sx={{ color: '#666', fontSize: 11 }}>Stage</Typography>
                      <Typography sx={{ color: GOLD, fontSize: 13 }}>
                        {t.matchData?.currentStage ?? 1}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ px: 2, py: 0.5, borderRadius: 1, bgcolor: colors.bg }}>
                    <Typography sx={{ fontSize: 12, color: colors.text }}>{t.status}</Typography>
                  </Box>
                </Box>
              </Box>
            )
          })
        )}
      </Box>
    </Box>
  )
}
