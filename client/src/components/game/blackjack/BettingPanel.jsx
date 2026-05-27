import { Box, Button, Slider, Typography } from '@mui/material'
import { GOLD, DARK, DARK2, BEBAS } from './constants'

const QUICK_BETS = [25, 50, 100, 200]

export default function BettingPanel({
  myTokens,
  betConfirmed,
  bettingPlayers,
  round,
  totalRounds,
  myBet,
  effectiveBet,
  minBet,
  onBetChange,
  onConfirmBet,
  betTimeLeft,
}) {
  return (
    <Box sx={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 3, width: '100%',
    }}>
      <Typography sx={{ fontFamily: BEBAS, fontSize: 32, letterSpacing: 4, color: GOLD }}>
        PLACE YOUR BET
      </Typography>
      <Typography sx={{ color: '#666', fontSize: 13 }}>
        Round {round} of {totalRounds} · Your tokens: ⬡ {myTokens}
      </Typography>

      {!betConfirmed && betTimeLeft !== null && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 160, height: 4, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{
              height: '100%',
              width: `${(betTimeLeft / 30) * 100}%`,
              bgcolor: betTimeLeft <= 5 ? '#ef5350' : betTimeLeft <= 10 ? '#ff9800' : GOLD,
              borderRadius: 2,
              transition: 'width 1s linear, background-color 0.3s'
            }} />
          </Box>
          <Typography sx={{
            fontSize: 12,
            color: betTimeLeft <= 5 ? '#ef5350' : betTimeLeft <= 10 ? '#ff9800' : '#888',
            minWidth: 24
          }}>
            {betTimeLeft}s
          </Typography>
        </Box>
      )}

      {betConfirmed ? (
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: GOLD, fontFamily: BEBAS, fontSize: 24 }}>
            BET PLACED: ⬡ {effectiveBet}
          </Typography>
          <Typography sx={{ color: '#555', fontSize: 13, mt: 1 }}>
            Waiting for other players… ({bettingPlayers.length} ready)
          </Typography>
        </Box>
      ) : myTokens > 0 ? (
        <Box sx={{ width: 320, bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 2, p: 4 }}>
          <Typography sx={{ color: GOLD, fontFamily: BEBAS, fontSize: 48, textAlign: 'center', mb: 1 }}>
            ⬡ {effectiveBet}
          </Typography>

          <Slider
            value={effectiveBet}
            onChange={(_, v) => onBetChange(v)}
            min={minBet}
            max={myTokens}
            step={10}
            sx={{ color: GOLD, '& .MuiSlider-thumb': { bgcolor: GOLD }, '& .MuiSlider-track': { bgcolor: GOLD } }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography sx={{ color: '#555', fontSize: 12 }}>Min: {minBet}</Typography>
            <Typography sx={{ color: '#555', fontSize: 12 }}>Max: {myTokens}</Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 3, justifyContent: 'center' }}>
            {QUICK_BETS.filter(v => v <= myTokens).map(v => (
              <Box
                key={v}
                onClick={() => onBetChange(v)}
                sx={{
                  px: 2, py: 0.5, borderRadius: 1, cursor: 'pointer',
                  border: `1px solid ${effectiveBet === v ? GOLD : 'rgba(255,255,255,0.1)'}`,
                  color: effectiveBet === v ? GOLD : '#666', fontSize: 13,
                  '&:hover': { borderColor: GOLD, color: GOLD },
                }}
              >
                {v}
              </Box>
            ))}
            <Box
              onClick={() => onBetChange(myTokens)}
              sx={{
                px: 2, py: 0.5, borderRadius: 1, cursor: 'pointer',
                border: `1px solid ${effectiveBet === myTokens ? GOLD : 'rgba(255,255,255,0.1)'}`,
                color: effectiveBet === myTokens ? GOLD : '#666', fontSize: 13,
                '&:hover': { borderColor: GOLD, color: GOLD },
              }}
            >
              ALL IN
            </Box>
          </Box>

          <Button
            fullWidth
            onClick={onConfirmBet}
            disabled={effectiveBet <= 0}
            sx={{
              bgcolor: GOLD, color: DARK, py: 1.5,
              fontFamily: BEBAS, fontSize: 18, letterSpacing: 2,
              '&:hover': { bgcolor: '#E8C97A' },
              '&.Mui-disabled': { bgcolor: '#3a3a3a', color: '#666' },
            }}
          >
            CONFIRM BET
          </Button>
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: '#ef5350', fontFamily: BEBAS, fontSize: 24, letterSpacing: 2 }}>
            OUT OF TOKENS
          </Typography>
          <Typography sx={{ color: '#666', fontSize: 13, mt: 1 }}>
            You cannot place a bet in this round.
          </Typography>
        </Box>
      )}
    </Box>
  )
}
