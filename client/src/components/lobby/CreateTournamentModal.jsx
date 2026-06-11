import { Box, Button, MenuItem, Modal, Select, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import api from '../../services/api'

const GOLD = '#C9A84C'
const DARK = '#0A0A0F'
const DARK2 = '#12121A'
const DARK3 = '#1C1C28'
const BEBAS = "'Bebas Neue', sans-serif"

const inputSx = {
  '& .MuiOutlinedInput-root': {
    color: 'white', fontSize: 14,
    '& fieldset': { borderColor: 'rgba(201,168,76,0.2)' },
    '&:hover fieldset': { borderColor: GOLD },
    '&.Mui-focused fieldset': { borderColor: GOLD },
  },
  '& input': { bgcolor: DARK3, borderRadius: 1 }
}

export default function CreateTournamentModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    gameTitle: '',
    entryFee: 0,
    maxParticipants: 2,
    type: 'open',
    privatePassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState(null)

  const isBlackjack = form.gameTitle === 'Blackjack'
  const maxAllowed = isBlackjack ? 6 : 12

  const handleChange = (field) => (e) => {
    let value = e.target.value
    if (field === 'maxParticipants') {
      value = Math.min(Number(value), maxAllowed)
    }
    if (field === 'gameTitle' && value === 'Blackjack') {
      setForm({ ...form, gameTitle: value, maxParticipants: Math.min(Number(form.maxParticipants), 6) })
      return
    }
    setForm({ ...form, [field]: value })
  }

  const handleClose = () => {
    setInviteLink(null)
    setForm({ title: '', gameTitle: '', entryFee: 0, maxParticipants: 2, type: 'open', privatePassword: '' })
    setError('')
    onClose()
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError('Tournament name is required')
    if (!form.gameTitle) return setError('Please select a game')
    const maxP = Number(form.maxParticipants)
    if (form.gameTitle === 'Blackjack' && (maxP < 2 || maxP > 6))
      return setError('Blackjack tournaments support 2 to 6 players')
    if (form.gameTitle !== 'Blackjack' && (maxP < 2 || maxP > 12))
      return setError('Max players must be between 2 and 12')
    if (form.type === 'private' && !form.privatePassword.trim())
      return setError('Private tournaments require a password')

    setLoading(true)
    try {
      const res = await api.post('/tournaments', {
        title: form.title,
        gameTitle: form.gameTitle,
        entryFee: Number(form.entryFee),
        maxParticipants: Number(form.maxParticipants),
        format: 'round_robin',
        startDate: new Date(),
        isPrivate: form.type === 'private',
        privatePassword: form.type === 'private' ? form.privatePassword : undefined
      })

      if (form.type === 'private' && res.data?.tournament?.inviteCode) {
        const link = `${window.location.origin}/tournaments/join/${res.data.tournament.inviteCode}`
        setInviteLink(link)
      } else {
        onCreated()
        handleClose()
      }
    } catch {
      setError('Failed to create tournament. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => navigator.clipboard.writeText(inviteLink)

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 2, p: 4, width: '100%', maxWidth: 480,
        outline: 'none'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography sx={{ fontFamily: BEBAS, fontSize: 26, letterSpacing: 3 }}>
            {inviteLink ? 'INVITE LINK' : 'CREATE TOURNAMENT'}
          </Typography>
          <Typography onClick={handleClose}
            sx={{ color: '#666', cursor: 'pointer', fontSize: 20, '&:hover': { color: 'white' } }}>
            ✕
          </Typography>
        </Box>

        {inviteLink ? (
          <Box>
            <Typography sx={{ color: '#888', fontSize: 13, mb: 2 }}>
              Your private tournament was created! Share this link and password with invited players.
            </Typography>
            <Box sx={{
              bgcolor: DARK3, border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: 1, p: 2, mb: 2, wordBreak: 'break-all'
            }}>
              <Typography sx={{ color: GOLD, fontSize: 13 }}>{inviteLink}</Typography>
            </Box>
            <Box sx={{
              bgcolor: DARK3, border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 1, p: 2, mb: 3
            }}>
              <Typography sx={{ color: '#aaa', fontSize: 12, mb: 0.5 }}>Password</Typography>
              <Typography sx={{ color: 'white', fontSize: 14 }}>{form.privatePassword}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button fullWidth onClick={handleCopyLink}
                sx={{ bgcolor: GOLD, color: DARK, py: 1.5, fontWeight: 700, fontSize: 14, '&:hover': { bgcolor: '#E8C97A' } }}>
                Copy Link
              </Button>
              <Button fullWidth onClick={() => { onCreated(); handleClose() }}
                sx={{ color: '#aaa', border: '1px solid rgba(255,255,255,0.1)', py: 1.5, fontSize: 14, '&:hover': { borderColor: 'white', color: 'white' } }}>
                Done
              </Button>
            </Box>
          </Box>
        ) : (
          <>
            <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>Tournament Name</Typography>
            <TextField
              fullWidth
              placeholder="e.g. Friday Night Showdown"
              value={form.title}
              onChange={handleChange('title')}
              sx={{ mb: 2, ...inputSx }}
            />

            <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>Game</Typography>
            <Select
              fullWidth displayEmpty
              value={form.gameTitle}
              onChange={handleChange('gameTitle')}
              sx={{
                mb: 2, color: form.gameTitle ? 'white' : '#666', fontSize: 14,
                bgcolor: DARK3,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(201,168,76,0.2)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
                '& .MuiSvgIcon-root': { color: '#666' }
              }}>
              <MenuItem value="" disabled>Select a game</MenuItem>
              <MenuItem value="Blackjack">Blackjack</MenuItem>
              <MenuItem value="Chess">Chess</MenuItem>
              <MenuItem value="Checkers">Checkers</MenuItem>
            </Select>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>Entry Fee (Tokens)</Typography>
                <TextField fullWidth type="number" value={form.entryFee} onChange={handleChange('entryFee')} sx={inputSx} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>
                  Max Players {isBlackjack ? '(2–6)' : '(2–12)'}
                </Typography>
                <TextField
                  fullWidth type="number"
                  value={form.maxParticipants}
                  onChange={handleChange('maxParticipants')}
                  slotProps={{ input: { min: 2, max: maxAllowed } }}
                  sx={inputSx}
                />
              </Box>
            </Box>

            <Typography sx={{ color: '#aaa', fontSize: 13, mb: 1 }}>Type</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: form.type === 'private' ? 2 : 3 }}>
              {['open', 'private'].map(type => (
                <Box key={type}
                  onClick={() => setForm({ ...form, type })}
                  sx={{
                    flex: 1, py: 1, textAlign: 'center', borderRadius: 1,
                    cursor: 'pointer', fontSize: 14, textTransform: 'capitalize',
                    bgcolor: form.type === type ? 'rgba(201,168,76,0.15)' : DARK3,
                    border: `1px solid ${form.type === type ? GOLD : 'rgba(255,255,255,0.1)'}`,
                    color: form.type === type ? GOLD : '#888',
                    transition: 'all 0.2s'
                  }}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Box>
              ))}
            </Box>

            {form.type === 'private' && (
              <>
                <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>Tournament Password</Typography>
                <TextField
                  fullWidth
                  placeholder="Set a password for your private tournament"
                  value={form.privatePassword}
                  onChange={handleChange('privatePassword')}
                  sx={{ mb: 3, ...inputSx }}
                />
              </>
            )}

            {error && (
              <Typography sx={{ color: 'red', fontSize: 13, mb: 2, textAlign: 'center' }}>
                {error}
              </Typography>
            )}

            <Button
              fullWidth onClick={handleSubmit} disabled={loading}
              sx={{
                bgcolor: GOLD, color: DARK, py: 1.5, fontWeight: 700, fontSize: 15,
                '&:hover': { bgcolor: '#E8C97A' },
                '&.Mui-disabled': { bgcolor: '#5a4a20', color: '#888' }
              }}>
              {loading ? 'Creating...' : 'Create Tournament'}
            </Button>
          </>
        )}
      </Box>
    </Modal>
  )
}