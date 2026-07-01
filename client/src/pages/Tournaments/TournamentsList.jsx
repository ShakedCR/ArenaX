import { Box, CircularProgress, Tab, Tabs, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../contexts/useAuth'
import useTournaments from '../../hooks/useTournaments'

import AuthNavbar from '../../components/layout/AuthNavbar'
import TournamentListRow from '../../components/tournament/TournamentListRow'

import { GOLD, DARK, BEBAS } from '../../styles/themeConstants'
import { TOURNAMENT_TABS } from '../../styles/tournamentConstants'

export default function TournamentsList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const { tournaments, loading } = useTournaments()

  const filteredTournaments = useMemo(() => {
    return tournaments.filter(tournament => {
      if (tab === 1) return tournament.status === 'ongoing'
      if (tab === 2) return tournament.status === 'completed'
      return true
    })
  }, [tab, tournaments])

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={user?.walletBalance || 0}
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
          onChange={(_, value) => setTab(value)}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: '#666', textTransform: 'none', fontSize: 14 },
            '& .Mui-selected': { color: GOLD },
            '& .MuiTabs-indicator': { bgcolor: GOLD }
          }}
        >
          {TOURNAMENT_TABS.map(label => (
            <Tab key={label} label={label} />
          ))}
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress sx={{ color: GOLD }} />
          </Box>
        ) : filteredTournaments.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography sx={{ color: '#666', fontSize: 14 }}>
              No tournaments found.
            </Typography>
          </Box>
        ) : (
          filteredTournaments.map(tournament => (
            <TournamentListRow
              key={tournament._id}
              tournament={tournament}
              onClick={() => navigate(`/tournaments/${tournament._id}`)}
            />
          ))
        )}
      </Box>
    </Box>
  )
}