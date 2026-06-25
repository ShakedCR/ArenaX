import { Box, Button, MenuItem, Select, TextField, Typography } from '@mui/material'

import { GOLD, DARK, DARK3 } from '../../styles/themeConstants'
import {
  TOURNAMENT_GAMES,
  TOURNAMENT_TYPES,
  TRIVIA_CATEGORIES,
  TRIVIA_DIFFICULTIES,
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

const selectSx = {
  color: 'white',
  fontSize: 14,
  bgcolor: DARK3,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(201,168,76,0.2)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
  '& .MuiSvgIcon-root': { color: '#666' }
}

export default function CreateTournamentForm({
  form,
  error,
  loading,
  isBlackjack,
  isTrivia,
  maxAllowed,
  onChange,
  onTypeChange,
  onFileChange,
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
        sx={{ mb: 2, ...selectSx, color: form.gameTitle ? 'white' : '#666' }}
      >
        <MenuItem value="" disabled>Select a game</MenuItem>
        {TOURNAMENT_GAMES.map(game => (
          <MenuItem key={game} value={game}>{game}</MenuItem>
        ))}
      </Select>

      {/* ── Trivia-specific fields ───────────────────────────── */}
      {isTrivia && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>
                Category
              </Typography>
              <Select
                fullWidth
                value={form.category}
                onChange={onChange('category')}
                sx={selectSx}
              >
                {TRIVIA_CATEGORIES.map(c => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>
                Difficulty
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, height: 56, alignItems: 'center' }}>
                {TRIVIA_DIFFICULTIES.map(d => (
                  <Box
                    key={d}
                    onClick={() => onChange('difficulty')({ target: { value: d } })}
                    sx={{
                      flex: 1, height: '100%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      borderRadius: 1, cursor: 'pointer', fontSize: 12,
                      textTransform: 'capitalize',
                      bgcolor: form.difficulty === d ? 'rgba(201,168,76,0.15)' : DARK3,
                      border: `1px solid ${form.difficulty === d ? GOLD : 'rgba(255,255,255,0.1)'}`,
                      color: form.difficulty === d ? GOLD : '#888',
                      transition: 'all 0.2s'
                    }}
                  >
                    {d}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          {/* Document upload */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>
              Source Document <span style={{ color: '#555' }}>(optional · PDF or TXT · max 10MB)</span>
            </Typography>
            <Box
              component="label"
              htmlFor="trivia-doc-upload"
              sx={{
                display: 'flex', alignItems: 'center', gap: 2,
                p: 1.5, borderRadius: 1, cursor: 'pointer',
                bgcolor: DARK3, border: `1px solid ${form.document ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.2)'}`,
                '&:hover': { borderColor: GOLD },
                transition: 'border-color 0.2s'
              }}
            >
              <Box sx={{
                px: 2, py: 0.8, borderRadius: 1, fontSize: 12, fontWeight: 600,
                bgcolor: 'rgba(201,168,76,0.15)', color: GOLD, flexShrink: 0
              }}>
                Choose file
              </Box>
              <Typography sx={{ fontSize: 13, color: form.document ? GOLD : '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {form.document ? form.document.name : 'No file selected'}
              </Typography>
              {form.document && (
                <Box
                  component="span"
                  onClick={(e) => { e.preventDefault(); onFileChange(null) }}
                  sx={{ ml: 'auto', color: '#555', fontSize: 18, lineHeight: 1, flexShrink: 0, '&:hover': { color: '#E84040' }, cursor: 'pointer' }}
                >
                  ✕
                </Box>
              )}
            </Box>
            <input
              id="trivia-doc-upload"
              type="file"
              accept=".pdf,.txt"
              style={{ display: 'none' }}
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>
                Questions (1–50)
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={form.questionCount}
                onChange={onChange('questionCount')}
                slotProps={{ input: { min: 1, max: 50 } }}
                sx={inputSx}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: '#aaa', fontSize: 13, mb: 0.5 }}>
                Seconds / Question (5–120)
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={form.timePerQuestion}
                onChange={onChange('timePerQuestion')}
                slotProps={{ input: { min: 5, max: 120 } }}
                sx={inputSx}
              />
            </Box>
          </Box>
        </>
      )}

      {/* ── Common fields ───────────────────────────────────── */}
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
            Max Players {isBlackjack ? '(2–6)' : isTrivia ? '(1–50)' : '(2–12)'}
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={form.maxParticipants}
            onChange={onChange('maxParticipants')}
            slotProps={{ input: { min: isTrivia ? 1 : 2, max: maxAllowed } }}
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
              flex: 1, py: 1, textAlign: 'center',
              borderRadius: 1, cursor: 'pointer', fontSize: 14,
              textTransform: 'capitalize',
              bgcolor: form.type === type ? 'rgba(201,168,76,0.15)' : DARK3,
              border: `1px solid ${form.type === type ? GOLD : 'rgba(255,255,255,0.1)'}`,
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
          bgcolor: GOLD, color: DARK, py: 1.5, fontWeight: 700, fontSize: 15,
          '&:hover': { bgcolor: '#E8C97A' },
          '&.Mui-disabled': { bgcolor: '#5a4a20', color: '#888' }
        }}
      >
        {loading
          ? isTrivia
            ? form.document
              ? 'Processing document & generating questions...'
              : 'Generating questions with AI...'
            : 'Creating...'
          : 'Create Tournament'}
      </Button>
    </>
  )
}
