import { Box, CircularProgress, Typography } from '@mui/material'

import { useAuth } from '../../contexts/useAuth'
import useProfile from '../../hooks/useProfile'

import AuthNavbar from '../../components/layout/AuthNavbar'
import ProfileHeader from '../../components/profile/ProfileHeader'
import GameStatsCard from '../../components/profile/GameStatsCard'
import TournamentHistoryRow from '../../components/profile/TournamentHistoryRow'

import { GOLD, DARK, DARK2, BEBAS } from '../../styles/themeConstants'
import { GAMES, gameIcons } from '../../styles/gameConstants'

export default function Profile() {
  const { user } = useAuth()

  const {
    loading,
    initials,
    completedTournaments,
    editingUsername,
    newUsername,
    usernameError,
    usernameLoading,
    avatarLoading,
    avatarError,
    setNewUsername,
    getGameStats,
    handleEditUsername,
    handleCancelEdit,
    handleSaveUsername,
    handleAvatarChange,
  } = useProfile()

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={user?.walletBalance || 0}
      />

      <Box sx={{ px: { xs: 2, md: 6 }, py: 4, maxWidth: 1000, mx: 'auto' }}>
        <ProfileHeader
          user={user}
          initials={initials}
          completedCount={completedTournaments.length}
          editingUsername={editingUsername}
          newUsername={newUsername}
          usernameError={usernameError}
          usernameLoading={usernameLoading}
          avatarLoading={avatarLoading}
          avatarError={avatarError}
          onEditUsername={handleEditUsername}
          onUsernameChange={setNewUsername}
          onSaveUsername={handleSaveUsername}
          onCancelEdit={handleCancelEdit}
          onAvatarChange={handleAvatarChange}
        />

        <Typography sx={{ fontFamily: BEBAS, fontSize: 22, letterSpacing: 2, mb: 2 }}>
          GAME BREAKDOWN
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
          {GAMES.map(game => (
            <GameStatsCard
              key={game}
              game={game}
              icon={gameIcons[game]}
              stats={getGameStats(game)}
            />
          ))}
        </Box>

        <Typography sx={{ fontFamily: BEBAS, fontSize: 22, letterSpacing: 2, mb: 2 }}>
          TOURNAMENT HISTORY
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress sx={{ color: GOLD }} />
          </Box>
        ) : completedTournaments.length === 0 ? (
          <Box sx={{
            bgcolor: DARK2,
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 2,
            p: 4,
            textAlign: 'center'
          }}>
            <Typography sx={{ color: '#666', fontSize: 14 }}>
              No completed tournaments yet. Keep playing!
            </Typography>
          </Box>
        ) : (
          completedTournaments.map(tournament => (
            <TournamentHistoryRow
              key={tournament._id}
              tournament={tournament}
              userId={user?.id || user?._id}
            />
          ))
        )}
      </Box>
    </Box>
  )
}