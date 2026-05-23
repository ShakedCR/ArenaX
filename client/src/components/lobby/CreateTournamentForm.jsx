import { Box, Button, MenuItem, Select, TextField, Typography } from '@mui/material'

import { GOLD, DARK, DARK3 } from '../../styles/themeConstants'
import {
  TOURNAMENT_GAMES,
  TOURNAMENT_TYPES
} from '../../styles/tournamentConstants'

const inputSx = {
  '& .MuiOutlinedInput-root': {
    color: 'white',
    fontSize: 14,
    '& fieldset': { borderColor: 'rgba(201,168,76,0.2)' },
    '&:hover fieldset': { borderColor: GOLD },
    '&.Mui-focused fieldset': { borderColor: GOLD }
  },
  '& input': {
    bgcolor: DARK3,
    borderRadius: 1
  }
}

export default function CreateTournamentForm({
  form,
  error,
  loading,
  isBlackjack,
  maxAllowed,
  onChange,
  onTypeChange,
  onSubmit
}) {
  return (
    <>
      <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>
        Tournament Name
      </Typography>

      <TextField
        fullWidth
        placeholder="e.g. Friday Night Showdown"
        value={form.title}
        onChange={onChange('title')}
        sx={{ mb: 2, ...inputSx }}
      />

      <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>
        Game
      </Typography>

      <Select
        fullWidth
        displayEmpty
        value={form.gameTitle}
        onChange={onChange('gameTitle')}
        sx={{
          mb: 2,
          color: form.gameTitle ? 'white' : '#666',
          fontSize: 14,
          bgcolor: DARK3,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(201,168,76,0.2)'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: GOLD
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: GOLD
          },
          '& .MuiSvgIcon-root': {
            color: '#666'
          }
        }}
      >
        <MenuItem value="" disabled>
          Select a game
        </MenuItem>

        {TOURNAMENT_GAMES.map(game => (
          <MenuItem key={game} value={game}>
            {game}
          </MenuItem>
        ))}
      </Select>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>
            Entry Fee (Tokens)
          </Typography>

          <TextField
            fullWidth
            type="number"
            value={form.entryFee}
            onChange={onChange('entryFee')}
            sx={inputSx}
          />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>
            Max Players {isBlackjack ? '(2–6)' : '(2–12)'}
          </Typography>

          <TextField
            fullWidth
            type="number"
            value={form.maxParticipants}
            onChange={onChange('maxParticipants')}
            slotProps={{ input: { min: 2, max: maxAllowed } }}
            sx={inputSx}
          />
        </Box>
      </Box>

      <Typography sx={{ color: '#aaa', fontSize: 13, mb: 1 }}>
        Type
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: form.type === 'private' ? 2 : 3 }}>
        {TOURNAMENT_TYPES.map(type => (
          <Box
            key={type}
            onClick={() => onTypeChange(type)}
            sx={{
              flex: 1,
              py: 1,
              textAlign: 'center',
              borderRadius: 1,
              cursor: 'pointer',
              fontSize: 14,
              textTransform: 'capitalize',
              bgcolor: form.type === type ? 'rgba(201,168,76,0.15)' : DARK3,
              border: `1px solid ${
                form.type === type ? GOLD : 'rgba(255,255,255,0.1)'
              }`,
              color: form.type === type ? GOLD : '#888',
              transition: 'all 0.2s'
            }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Box>
        ))}
      </Box>

      {form.type === 'private' && (
        <>
          <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>
            Tournament Password
          </Typography>

          <TextField
            fullWidth
            placeholder="Set a password for your private tournament"
            value={form.privatePassword}
            onChange={onChange('privatePassword')}
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
        fullWidth
        onClick={onSubmit}
        disabled={loading}
        sx={{
          bgcolor: GOLD,
          color: DARK,
          py: 1.5,
          fontWeight: 700,
          fontSize: 15,
          '&:hover': { bgcolor: '#E8C97A' },
          '&.Mui-disabled': { bgcolor: '#5a4a20', color: '#888' }
        }}
      >
        {loading ? 'Creating...' : 'Create Tournament'}
      </Button>
    </>
  )
}