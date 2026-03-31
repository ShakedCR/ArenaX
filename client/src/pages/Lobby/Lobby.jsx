import { Box, Button, CircularProgress, Tab, Tabs, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/useAuth'
import AuthNavbar from '../../components/layout/AuthNavbar'
import FilterBar from '../../components/lobby/FilterBar'
import TournamentRow from '../../components/lobby/TournamentRow'

const GOLD = '#C9A84C'
const DARK = '#0A0A0F'
const BEBAS = "'Bebas Neue', sans-serif"

export default function Lobby() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState(0)
  const [filter, setFilter] = useState('All')
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/tournaments')
      .then(res => setTournaments(Array.isArray(res.data.tournaments) ? res.data.tournaments : []))
      .catch(err => console.log(err))
      .finally(() => setLoading(false))
  }, [])

  const filtered = tournaments.filter(t =>
    filter === 'All' ? true : t.gameTitle === filter
  )

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={user?.tokenBalance || 0}
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
            onClick={() => navigate('/create-tournament')}
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
              onView={(t) => navigate(`/tournaments/${t._id}`)}
            />
          ))
        )}
      </Box>
    </Box>
  )
}