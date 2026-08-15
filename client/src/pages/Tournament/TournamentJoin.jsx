import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/useAuth'
import AuthNavbar from '../../components/layout/AuthNavbar'
import { GOLD, DARK, DARK2, DARK3, BEBAS } from '../../styles/themeConstants'

const gameIcons = {
  Blackjack: '♠',
  Trivia: '❓',
}

const normalizeId = (value) => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (typeof value._id === 'string') return value._id
    if (typeof value.id === 'string') return value.id
  }
  return null
}

export default function TournamentJoin() {
  const { inviteCode } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const mapJoinErrorMessage = (err) => {
    const status = err?.response?.status
    const message = String(err?.response?.data?.message || err?.message || '').toLowerCase()

    if (status === 404 || /not found|invite code not found/i.test(message)) return 'Invite code not found.'
    if (/password/i.test(message) && /invalid|wrong/i.test(message)) return 'Wrong password.'
    if (/password/i.test(message) && /enter|required|missing/i.test(message)) return 'Password required to join this private tournament.'
    if (/full/i.test(message)) return 'Tournament is full.'
    if (/already joined/i.test(message)) return 'You already joined this tournament.'
    if (/private/i.test(message) && /use invite/i.test(message)) return 'This tournament is private. Use invite link or QR to join.'
    return err?.response?.data?.message || 'Server/network error while joining the tournament.'
  }

  const joinByInviteCode = useCallback(async (code) => {
    const inviteToUse = String(code || '').trim()
    if (!inviteToUse) {
      setError('Please paste a valid invite link or invite code.')
      return false
    }

    setJoining(true)
    setError('')

    try {
      const currentTournament = inviteToUse === inviteCode && tournament
        ? tournament
        : (await api.get(`/tournaments/invite/${inviteToUse}`)).data?.tournament

      if (!currentTournament) {
        setError('Invite code not found.')
        return false
      }

      const userId = normalizeId(user?.id || user?._id)
      const creatorId = normalizeId(currentTournament?.createdBy)
      const isCreator = Boolean(userId && creatorId && userId === creatorId)
      const requirePassword = Boolean(currentTournament?.isPrivate && !isCreator)

      if (requirePassword && !password.trim()) {
        setError('Password required to join this private tournament.')
        return false
      }

      const response = await api.post(`/tournaments/invite/${inviteToUse}/join`, {
        privatePassword: requirePassword ? password.trim() : undefined
      })

      const joinedTournament = response?.data?.tournament || currentTournament
      navigate(`/tournament/${joinedTournament?._id}/waiting`)
      return true
    } catch (err) {
      setError(mapJoinErrorMessage(err))
      return false
    } finally {
      setJoining(false)
    }
  }, [inviteCode, navigate, password, tournament, user])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate(`/login?redirect=/tournaments/join/${inviteCode}`)
      return
    }

    api.get(`/tournaments/invite/${inviteCode}`)
      .then(res => setTournament(res.data.tournament))
      .catch(() => setError('Tournament not found or invite link is invalid.'))
      .finally(() => setLoading(false))
  }, [inviteCode, user, navigate, authLoading])

  const handleJoin = async () => {
    if (!tournament) return

    // Already a participant — go straight to waiting room
    const alreadyJoined = tournament.participants?.some(
      p => normalizeId(p?._id || p) === userId
    )
    if (alreadyJoined) {
      navigate(`/tournament/${tournament._id}/waiting`)
      return
    }

    try {
      if (tournament?.isPrivate) {
        await joinByInviteCode(inviteCode)
        return
      }

      setJoining(true)
      setError('')
      await api.post(`/tournaments/${tournament._id}/join`)
      navigate(`/tournament/${tournament._id}/waiting`)
    } catch (err) {
      if (/already joined/i.test(err?.response?.data?.message || '')) {
        navigate(`/tournament/${tournament._id}/waiting`)
        return
      }
      setError(mapJoinErrorMessage(err))
    } finally {
      setJoining(false)
    }
  }

  if (authLoading || loading) return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress sx={{ color: GOLD }} />
    </Box>
  )

  if (error && !tournament) return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Typography sx={{ color: '#f44336', fontSize: 16 }}>{error}</Typography>
      <Button onClick={() => navigate('/lobby')} sx={{ color: GOLD }}>← Back to Lobby</Button>
    </Box>
  )

  const userId = normalizeId(user?.id || user?._id)
  const creatorId = normalizeId(tournament?.createdBy)
  const isCreator = Boolean(userId && creatorId && userId === creatorId)
  const requirePassword = Boolean(tournament?.isPrivate && !isCreator)
  const isFull = (tournament?.participants?.length || 0) >= (tournament?.maxParticipants || 0)
  const alreadyJoined = tournament?.participants?.some(p => normalizeId(p?._id || p) === userId)
  const canJoin = (tournament?.status === 'open' || (isCreator && tournament?.status === 'draft')) && !isFull
  const shouldShowNotOpen = !canJoin && !alreadyJoined

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={user?.walletBalance || 0}
      />

      <Box sx={{ maxWidth: 500, mx: 'auto', py: 8, px: 4 }}>
        <Box sx={{
          bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.15)',
          borderRadius: 2, p: 4, textAlign: 'center'
        }}>
          <Typography sx={{ fontSize: 40, mb: 1 }}>
            {gameIcons[tournament?.gameTitle]}
          </Typography>
          <Typography sx={{ fontFamily: BEBAS, fontSize: 32, letterSpacing: 3, mb: 0.5 }}>
            {tournament?.title}
          </Typography>
          <Typography sx={{ color: '#666', fontSize: 13, mb: 3 }}>
            {tournament?.gameTitle} · {tournament?.participants?.length}/{tournament?.maxParticipants} players
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Box sx={{ bgcolor: DARK3, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1, px: 2, py: 0.8 }}>
              <Typography sx={{ color: '#aaa', fontSize: 12 }}>
                Entry Fee: <span style={{ color: GOLD }}>⬡ {tournament?.entryFee}</span>
              </Typography>
            </Box>
            <Box sx={{ bgcolor: DARK3, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1, px: 2, py: 0.8 }}>
              <Typography sx={{ color: '#aaa', fontSize: 12 }}>
                Prize Pool: <span style={{ color: GOLD }}>⬡ {tournament?.prizePool}</span>
              </Typography>
            </Box>
            <Box sx={{
              bgcolor: tournament?.isPrivate ? 'rgba(201,168,76,0.1)' : 'rgba(76,175,80,0.1)',
              border: `1px solid ${tournament?.isPrivate ? 'rgba(201,168,76,0.3)' : 'rgba(76,175,80,0.3)'}`,
              borderRadius: 1, px: 2, py: 0.8
            }}>
              <Typography sx={{ color: tournament?.isPrivate ? GOLD : '#4caf50', fontSize: 12 }}>
                {tournament?.isPrivate ? '🔒 Private' : '🌐 Open'}
              </Typography>
            </Box>
          </Box>

          {requirePassword && (
            <>
              <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5, textAlign: 'left' }}>
                Tournament Password
              </Typography>
              <TextField
                fullWidth
                type="password"
                placeholder="Enter tournament password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: 'white', fontSize: 14,
                    '& fieldset': { borderColor: 'rgba(201,168,76,0.2)' },
                    '&:hover fieldset': { borderColor: GOLD },
                    '&.Mui-focused fieldset': { borderColor: GOLD },
                  },
                  '& input': { bgcolor: DARK3, borderRadius: 1 }
                }}
              />
            </>
          )}

          {tournament?.isPrivate && isCreator && (
            <Typography sx={{ color: '#4caf50', fontSize: 12, mb: 2, textAlign: 'left' }}>
              You are the tournament creator. Password is not required for your join.
            </Typography>
          )}

          {error && (
            <Typography sx={{ color: '#f44336', fontSize: 13, mb: 2 }}>
              {error}
            </Typography>
          )}


          {alreadyJoined ? (
            <Button
              fullWidth
              onClick={() => navigate(`/tournament/${tournament._id}/waiting`)}
              sx={{ bgcolor: GOLD, color: DARK, py: 1.5, mb: 2, fontWeight: 700, fontSize: 15, '&:hover': { bgcolor: '#E8C97A' } }}
            >
              Enter Waiting Room →
            </Button>
          ) : isFull ? (
            <Box sx={{ bgcolor: '#3a3a3a', borderRadius: 1, p: 2, mb: 2 }}>
              <Typography sx={{ color: '#888', fontSize: 14 }}>
                This tournament is full ({tournament?.participants?.length}/{tournament?.maxParticipants} players)
              </Typography>
            </Box>
          ) : shouldShowNotOpen ? (
            <Box sx={{ bgcolor: '#3a3a3a', borderRadius: 1, p: 2, mb: 2 }}>
              <Typography sx={{ color: '#888', fontSize: 14 }}>
                This tournament is not open for registration.
              </Typography>
            </Box>
          ) : (
            <Button
              fullWidth
              onClick={handleJoin}
              disabled={joining}
              sx={{
                bgcolor: GOLD, color: DARK, py: 1.5, mb: 2,
                fontWeight: 700, fontSize: 15,
                '&:hover': { bgcolor: '#E8C97A' },
                '&.Mui-disabled': { bgcolor: '#5a4a20', color: '#888' }
              }}>
              {joining ? 'Joining...' : 'Join Tournament'}
            </Button>
          )}

          <Button
            fullWidth
            onClick={() => navigate('/lobby')}
            sx={{ color: '#666', fontSize: 13, '&:hover': { color: 'white' } }}>
            ← Back to Lobby
          </Button>
        </Box>
      </Box>
    </Box>
  )
}