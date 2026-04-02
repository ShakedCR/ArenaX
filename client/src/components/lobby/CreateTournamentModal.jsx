import { Box, Button, MenuItem, Modal, Select, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import api from '../../services/api'

const GOLD = '#C9A84C'
const DARK = '#0A0A0F'
const DARK2 = '#12121A'
const DARK3 = '#1C1C28'
const BEBAS = "'Bebas Neue', sans-serif"

export default function CreateTournamentModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    gameTitle: '',
    entryFee: 50,
    maxParticipants: 8,
    type: 'open'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError('Tournament name is required')
    if (!form.gameTitle) return setError('Please select a game')
    if (form.maxParticipants < 4 || form.maxParticipants > 12)
      return setError('Max players must be between 4 and 12')

    setLoading(true)
    try {
      await api.post('/tournaments', {
        title: form.title,
        gameTitle: form.gameTitle,
        entryFee: Number(form.entryFee),
        maxParticipants: Number(form.maxParticipants),
        format: 'round_robin',
        startDate: new Date(),
        type: form.type
      })
      onCreated()
      onClose()
      setForm({ title: '', gameTitle: '', entryFee: 50, maxParticipants: 8, type: 'open' })
      setError('')
    } catch {
      setError('Failed to create tournament. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 2, p: 4, width: '100%', maxWidth: 480,
        outline: 'none'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography sx={{ fontFamily: BEBAS, fontSize: 26, letterSpacing: 3 }}>
            CREATE TOURNAMENT
          </Typography>
          <Typography onClick={onClose}
            sx={{ color: '#666', cursor: 'pointer', fontSize: 20, '&:hover': { color: 'white' } }}>
            ✕
          </Typography>
        </Box>

        <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>Tournament Name</Typography>
        <TextField
          fullWidth
          placeholder="e.g. Friday Night Showdown"
          value={form.title}
          onChange={handleChange('title')}
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

        <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>Game</Typography>
        <Select
          fullWidth
          displayEmpty
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
            <TextField
              fullWidth
              type="number"
              value={form.entryFee}
              onChange={handleChange('entryFee')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white', fontSize: 14,
                  '& fieldset': { borderColor: 'rgba(201,168,76,0.2)' },
                  '&:hover fieldset': { borderColor: GOLD },
                  '&.Mui-focused fieldset': { borderColor: GOLD },
                },
                '& input': { bgcolor: DARK3, borderRadius: 1 }
              }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>Max Players</Typography>
            <TextField
              fullWidth
              type="number"
              value={form.maxParticipants}
              onChange={handleChange('maxParticipants')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white', fontSize: 14,
                  '& fieldset': { borderColor: 'rgba(201,168,76,0.2)' },
                  '&:hover fieldset': { borderColor: GOLD },
                  '&.Mui-focused fieldset': { borderColor: GOLD },
                },
                '& input': { bgcolor: DARK3, borderRadius: 1 }
              }}
            />
          </Box>
        </Box>

        <Typography sx={{ color: '#aaa', fontSize: 13, mb: 1 }}>Type</Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
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

        {error && (
          <Typography sx={{ color: 'red', fontSize: 13, mb: 2, textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        <Button
          fullWidth
          onClick={handleSubmit}
          disabled={loading}
          sx={{
            bgcolor: GOLD, color: DARK, py: 1.5,
            fontWeight: 700, fontSize: 15,
            '&:hover': { bgcolor: '#E8C97A' },
            '&.Mui-disabled': { bgcolor: '#5a4a20', color: '#888' }
          }}>
          {loading ? 'Creating...' : 'Create Tournament'}
        </Button>
      </Box>
    </Modal>
  )
}