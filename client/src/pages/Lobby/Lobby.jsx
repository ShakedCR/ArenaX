import { Box, Button, CircularProgress, Tab, Tabs, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import api from '../../services/api'
import { useAuth } from '../../contexts/useAuth'
import useTournaments from '../../hooks/useTournaments'

import AuthNavbar from '../../components/layout/AuthNavbar'
import FilterBar from '../../components/lobby/FilterBar'
import TournamentRow from '../../components/lobby/TournamentRow'
import CreateTournamentModal from '../../components/lobby/CreateTournamentModal'
import ActiveGameBanner from '../../components/layout/ActiveGameBanner'

import { GOLD, DARK, BEBAS } from '../../styles/themeConstants'

const normalizeId = (value) => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (typeof value._id === 'string') return value._id
    if (typeof value.id === 'string') return value.id
  }
  return null
}

export default function Lobby() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [filter, setFilter] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)

  const { tournaments, myTournaments, loading, fetchTournaments } =
    useTournaments({ includeMine: true })

  const filteredTournaments = useMemo(() => {
    const list = tab === 0 ? tournaments : myTournaments
    return list.filter(t => filter === 'All' || t.gameTitle === filter)
  }, [tab, filter, tournaments, myTournaments])

  const handleJoin = async (tournament) => {
    const userId = normalizeId(user?.id || user?._id)
    const creatorId = normalizeId(tournament?.createdBy)
    const isCreator = Boolean(userId && creatorId && userId === creatorId)
    const alreadyJoined = tournament.participants?.some(
      p => normalizeId(p?._id || p) === userId
    )

    if (alreadyJoined) {
      navigate(`/tournament/${tournament._id}/waiting`)
      return
    }

    if (tournament.isPrivate) {
      if (isCreator) {
        try {
          await api.post(`/tournaments/invite/${tournament.inviteCode}/join`)
          navigate(`/tournament/${tournament._id}/waiting`)
        } catch (err) {
          console.log('Join failed:', err.response?.data)
          if (err.response?.data?.message === 'User already joined this tournament') {
            navigate(`/tournament/${tournament._id}/waiting`)
          }
        }
        return
      }

      navigate(`/tournaments/join/${tournament.inviteCode}`)
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
      await refreshUser()
    } catch (err) {
      console.log('Open failed:', err)
    }
  }

  const handleCreated = async () => {
    await fetchTournaments()
    await refreshUser()
  }

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={user?.walletBalance || 0}
      />

      <Box sx={{ px: 6, py: 4 }}>
        <ActiveGameBanner />

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
              bgcolor: GOLD,
              color: DARK,
              px: 3,
              py: 1.2,
              fontWeight: 700,
              fontSize: 14,
              '&:hover': { bgcolor: '#E8C97A' }
            }}
          >
            + Create Tournament
          </Button>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: '#666', textTransform: 'none', fontSize: 14 },
            '& .Mui-selected': { color: GOLD },
            '& .MuiTabs-indicator': { bgcolor: GOLD }
          }}
        >
          <Tab label="Open Tournaments" />
          <Tab label="My Tournaments" />
        </Tabs>

        <FilterBar active={filter} onChange={setFilter} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress sx={{ color: GOLD }} />
          </Box>
        ) : filteredTournaments.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography sx={{ color: '#666', fontSize: 14 }}>
              No tournaments found. Create one!
            </Typography>
          </Box>
        ) : (
          filteredTournaments.map(tournament => (
            <TournamentRow
              key={tournament._id}
              tournament={tournament}
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