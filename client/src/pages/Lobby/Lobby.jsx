import { Box, Button, CircularProgress, Tab, Tabs, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/useAuth'
import AuthNavbar from '../../components/layout/AuthNavbar'
import FilterBar from '../../components/lobby/FilterBar'
import TournamentRow from '../../components/lobby/TournamentRow'
import CreateTournamentModal from '../../components/lobby/CreateTournamentModal'

const GOLD = '#C9A84C'
const DARK = '#0A0A0F'
const BEBAS = "'Bebas Neue', sans-serif"

const extractTournaments = (data) =>
  Array.isArray(data?.tournaments) ? data.tournaments : []

export default function Lobby() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [filter, setFilter] = useState('All')
  const [tournaments, setTournaments] = useState([])
  const [myTournaments, setMyTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchTournaments = useCallback(async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        api.get('/tournaments'),
        api.get('/tournaments/my')
      ])
      setTournaments(extractTournaments(allRes.data))
      setMyTournaments(extractTournaments(myRes.data))
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTournaments()
  }, [fetchTournaments])

  const handleJoin = async (tournament) => {
    const userId = user?.id || user?._id
    const alreadyJoined = tournament.participants?.some(
      p => p?._id === userId || p === userId
    )

    if (alreadyJoined) {
      navigate(`/tournament/${tournament._id}/waiting`)
      return
    }

    try {
      await api.post(`/tournaments/${tournament._id}/join`)
      navigate(`/tournament/${tournament._id}/waiting`)
    } catch (err) {
      console.log('Join failed:', err.response?.data)
      if (err.response?.data?.message === 'User already joined this tournament') {
        navigate(`/tournament/${tournament._id}/waiting`)
      }
    }
  }

  const handleOpen = async (tournament) => {
    try {
      await api.patch(`/tournaments/${tournament._id}/open`)
      await fetchTournaments()
    } catch (err) {
      console.log('Open failed:', err)
    }
  }

  const handleCreated = async () => {
    await fetchTournaments()
  }

  const filtered = (tab === 0 ? tournaments : myTournaments).filter(t =>
    filter === 'All' ? true : t.gameTitle === filter
  )

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={user?.walletBalance || 0}
        elo={user?.elo?.chess || 1200}
      />

      <Box sx={{ px: 6, py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
          <Box>
            <Typography sx={{ fontFamily: BEBAS, fontSize: 36, letterSpacing: 3 }}>
              TOURNAMENT LOBBY
            </Typography>
            <Typography sx={{ color: '#666', fontSize: 13 }}>
              Find and join competitive matches
            </Typography>
          </Box>
          <Button
            onClick={() => setModalOpen(true)}
            sx={{
              bgcolor: GOLD, color: DARK, px: 3, py: 1.2,
              fontWeight: 700, fontSize: 14,
              '&:hover': { bgcolor: '#E8C97A' }
            }}>
            + Create Tournament
          </Button>
        </Box>

        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: '#666', textTransform: 'none', fontSize: 14 },
            '& .Mui-selected': { color: GOLD },
            '& .MuiTabs-indicator': { bgcolor: GOLD }
          }}>
          <Tab label="Open Tournaments" />
          <Tab label="My Tournaments" />
        </Tabs>

        <FilterBar active={filter} onChange={setFilter} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress sx={{ color: GOLD }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography sx={{ color: '#666', fontSize: 14 }}>
              No tournaments found. Create one!
            </Typography>
          </Box>
        ) : (
          filtered.map(t => (
            <TournamentRow
              key={t._id}
              tournament={t}
              onJoin={handleJoin}
              onOpen={handleOpen}
            />
          ))
        )}
      </Box>

      <CreateTournamentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </Box>
  )
}