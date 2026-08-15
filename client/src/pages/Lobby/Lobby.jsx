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

// Maps known backend join-failure messages to safe, user-facing text.
// Any message not listed here (or a network/server error) falls back to the generic message.
const JOIN_ERROR_MESSAGES = {
  'Insufficient wallet balance to join this tournament': "You don't have enough tokens to join this tournament.",
  'Tournament is not open for registration': 'This tournament is no longer open for registration.',
  'Tournament is full': 'This tournament is full.',
  'Invalid private tournament password': 'Incorrect tournament password.',
  'Tournament not found': 'Tournament not found.',
}

const getJoinErrorMessage = (backendMessage) =>
  JOIN_ERROR_MESSAGES[backendMessage] || 'Unable to join tournament. Please try again.'

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
  const [error, setError] = useState('')

  const { tournaments, myTournaments, loading, fetchTournaments } =
    useTournaments({ includeMine: true })

  const filteredTournaments = useMemo(() => {
    const list = tab === 0 ? tournaments : myTournaments
    return list.filter(t => filter === 'All' || t.gameTitle === filter)
  }, [tab, filter, tournaments, myTournaments])

  const handleJoin = async (tournament) => {
    setError('')
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
          console.error('[Lobby] Join failed:', err.response?.data)
          if (err.response?.data?.message === 'User already joined this tournament') {
            navigate(`/tournament/${tournament._id}/waiting`)
          } else {
            setError(getJoinErrorMessage(err.response?.data?.message))
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
      console.error('[Lobby] Join failed:', err.response?.data)

      if (err.response?.data?.message === 'User already joined this tournament') {
        navigate(`/tournament/${tournament._id}/waiting`)
      } else {
        setError(getJoinErrorMessage(err.response?.data?.message))
      }
    }
  }

  const handleOpen = async (tournament) => {
    setError('')
    try {
      await api.patch(`/tournaments/${tournament._id}/open`)
      await fetchTournaments()
      await refreshUser()
    } catch (err) {
      console.error('[Lobby] Open failed:', err)
      setError('Unable to open tournament. Please try again.')
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

      <Box sx={{ px: { xs: 2, md: 6 }, py: 4 }}>
        <ActiveGameBanner />

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'flex-start' }, gap: { xs: 1.5, md: 0 }, mb: 4 }}>
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

        {error && (
          <Typography sx={{ color: 'red', fontSize: 13, mb: 2, textAlign: 'center' }}>
            {error}
          </Typography>
        )}

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