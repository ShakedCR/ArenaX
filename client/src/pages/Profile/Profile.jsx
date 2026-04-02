import { Box, Button, CircularProgress, InputBase, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../contexts/useAuth'
import AuthNavbar from '../../components/layout/AuthNavbar'

const GOLD = '#C9A84C'
const DARK = '#0A0A0F'
const DARK2 = '#12121A'
const DARK3 = '#1C1C28'
const BEBAS = "'Bebas Neue', sans-serif"

const gameIcons = {
  Blackjack: '♠',
  Chess: '♟',
  Checkers: '⬤'
}

const GAMES = ['Blackjack', 'Chess', 'Checkers']

export default function Profile() {
  const { user, setUser } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [usernameLoading, setUsernameLoading] = useState(false)

  useEffect(() => {
    api.get('/tournaments')
      .then(res => {
        const all = Array.isArray(res.data?.tournaments) ? res.data.tournaments : []
        const userId = user?.id || user?._id
        const myTournaments = all.filter(t =>
          t.participants?.some(p => p?._id === userId || p === userId) ||
          t.createdBy?._id === userId || t.createdBy === userId
        )
        setTournaments(myTournaments)
      })
      .catch(err => console.log(err))
      .finally(() => setLoading(false))
  }, [user])

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.username?.slice(0, 2).toUpperCase() || '?'

  const completedTournaments = tournaments.filter(t => t.status === 'completed')

  const getGameStats = (gameTitle) => {
    const gameTournaments = completedTournaments.filter(t => t.gameTitle === gameTitle)
    return {
      total: gameTournaments.length,
      winRate: gameTournaments.length > 0
        ? (gameTournaments.filter(t => t.result?.winner === (user?.id || user?._id)).length / gameTournaments.length * 100).toFixed(0)
        : null
    }
  }

  const handleEditUsername = () => {
    setNewUsername(user?.username || '')
    setUsernameError('')
    setEditingUsername(true)
  }

  const handleSaveUsername = async () => {
    if (newUsername.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      setUsernameError('Only letters, numbers and underscores')
      return
    }
    setUsernameLoading(true)
    try {
      const userId = user?.id || user?._id
      const res = await api.put(`/users/${userId}`, { username: newUsername })
      setUser(res.data.user)
      setEditingUsername(false)
      setUsernameError('')
    } catch {
      setUsernameError('Username already taken or unavailable')
    } finally {
      setUsernameLoading(false)
    }
  }

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={user?.walletBalance || 0}
        elo={user?.elo || 1200}
      />

      <Box sx={{ px: 6, py: 4, maxWidth: 1000, mx: 'auto' }}>

        <Box sx={{
          bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.15)',
          borderRadius: 2, p: 4, mb: 4,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
        }}>
          <Box sx={{
            width: 120, height: 120, borderRadius: '50%',
            bgcolor: 'rgba(201,168,76,0.15)',
            border: '3px solid rgba(201,168,76,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0
          }}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} width={120} height={120} style={{ objectFit: 'cover' }} />
            ) : (
              <Typography sx={{ fontFamily: BEBAS, fontSize: 36, color: GOLD }}>
                {initials}
              </Typography>
            )}
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontFamily: BEBAS, fontSize: 28, letterSpacing: 2 }}>
              {user?.fullName || user?.username}
            </Typography>

            {editingUsername ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', mt: 0.5, mb: 1 }}>
                <Typography sx={{ color: '#666', fontSize: 13 }}>@</Typography>
                <InputBase
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  autoFocus
                  sx={{
                    color: 'white', fontSize: 13,
                    borderBottom: `1px solid ${GOLD}`,
                    px: 0.5, minWidth: 120
                  }}
                />
                <Button
                  onClick={handleSaveUsername}
                  disabled={usernameLoading}
                  sx={{ color: GOLD, fontSize: 11, py: 0, minWidth: 'unset' }}>
                  {usernameLoading ? '...' : 'Save'}
                </Button>
                <Button
                  onClick={() => setEditingUsername(false)}
                  sx={{ color: '#666', fontSize: 11, py: 0, minWidth: 'unset' }}>
                  Cancel
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', mb: 1 }}>
                <Typography sx={{ color: '#888', fontSize: 13 }}>
                  @{user?.username}
                </Typography>
                <Box
                  onClick={handleEditUsername}
                  sx={{
                    width: 22, height: 22, borderRadius: '50%',
                    bgcolor: 'rgba(201,168,76,0.1)',
                    border: '1px solid rgba(201,168,76,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 11,
                    '&:hover': { bgcolor: 'rgba(201,168,76,0.2)', borderColor: GOLD }
                  }}>
                  ✎
                </Box>
              </Box>
            )}

            {usernameError && (
              <Typography sx={{ color: 'red', fontSize: 12, mb: 1 }}>
                {usernameError}
              </Typography>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Box sx={{
                bgcolor: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.3)',
                borderRadius: 1, px: 2, py: 0.5
              }}>
                <Typography sx={{ color: GOLD, fontSize: 13 }}>
                  Elo {user?.elo || 1200}
                </Typography>
              </Box>
              <Box sx={{
                bgcolor: DARK3, border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 1, px: 2, py: 0.5
              }}>
                <Typography sx={{ color: '#aaa', fontSize: 13 }}>
                  ⬡ {user?.walletBalance || 0} tokens
                </Typography>
              </Box>
              <Box sx={{
                bgcolor: DARK3, border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 1, px: 2, py: 0.5
              }}>
                <Typography sx={{ color: '#aaa', fontSize: 13 }}>
                  {completedTournaments.length} completed
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Typography sx={{ fontFamily: BEBAS, fontSize: 22, letterSpacing: 2, mb: 2 }}>
          GAME BREAKDOWN
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 4 }}>
          {GAMES.map(game => {
            const stats = getGameStats(game)
            return (
              <Box key={game} sx={{
                bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.1)',
                borderRadius: 2, p: 3
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Box sx={{
                    width: 32, height: 32,
                    bgcolor: 'rgba(201,168,76,0.1)',
                    border: '1px solid rgba(201,168,76,0.3)',
                    borderRadius: 1, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 14
                  }}>
                    {gameIcons[game]}
                  </Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{game}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ color: '#666', fontSize: 12 }}>Win Rate</Typography>
                  <Typography sx={{ color: GOLD, fontSize: 12 }}>
                    {stats.winRate !== null ? `${stats.winRate}%` : '-'}
                  </Typography>
                </Box>
                {stats.winRate !== null && (
                  <Box sx={{ bgcolor: '#333', borderRadius: 1, height: 4, mb: 1 }}>
                    <Box sx={{
                      bgcolor: GOLD, borderRadius: 1, height: 4,
                      width: `${stats.winRate}%`, transition: 'width 0.5s'
                    }} />
                  </Box>
                )}
                <Typography sx={{ color: '#555', fontSize: 11 }}>
                  {stats.total} {stats.total === 1 ? 'tournament' : 'tournaments'} played
                </Typography>
              </Box>
            )
          })}
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
            bgcolor: DARK2, border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 2, p: 4, textAlign: 'center'
          }}>
            <Typography sx={{ color: '#666', fontSize: 14 }}>
              No completed tournaments yet. Keep playing!
            </Typography>
          </Box>
        ) : (
          completedTournaments.map(t => (
            <Box key={t._id} sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.1)',
              borderRadius: 1, px: 3, py: 2, mb: 1.5,
              '&:hover': { bgcolor: DARK3 }, transition: 'all 0.2s'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ fontSize: 20 }}>{gameIcons[t.gameTitle]}</Typography>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{t.title}</Typography>
                  <Typography sx={{ color: '#666', fontSize: 12 }}>{t.gameTitle}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Typography sx={{ color: '#666', fontSize: 12 }}>
                  {new Date(t.createdAt).toLocaleDateString()}
                </Typography>
                <Typography sx={{ color: '#888', fontSize: 13, minWidth: 40, textAlign: 'center' }}>
                  {t.result?.placement ? `${t.result.placement}st` : '-'}
                </Typography>
                <Typography sx={{
                  color: t.result?.earnings > 0 ? '#4caf50' :
                    t.result?.earnings < 0 ? '#f44336' : '#888',
                  fontSize: 13, minWidth: 50, textAlign: 'right'
                }}>
                  {t.result?.earnings > 0 ? `+${t.result.earnings}` :
                    t.result?.earnings < 0 ? `${t.result.earnings}` : '-'}
                </Typography>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  )
}