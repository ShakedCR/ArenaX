import { Box, Button, Typography } from '@mui/material'
import { GOLD, DARK, DARK2, BEBAS } from './constants'

function EloBadge({ eloResult }) {
  if (!eloResult) return null
  const { oldRating, newRating, delta } = eloResult
  const positive = delta >= 0
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 2,
      bgcolor: DARK2, border: `1px solid ${positive ? 'rgba(76,175,80,0.3)' : 'rgba(239,83,80,0.3)'}`,
      borderRadius: 2, px: 3, py: 1.5,
    }}>
      <Box>
        <Typography sx={{ color: '#555', fontSize: 11, fontFamily: BEBAS, letterSpacing: 2 }}>
          BLACKJACK ELO
        </Typography>
        <Typography sx={{ color: '#ccc', fontSize: 18, fontFamily: BEBAS, letterSpacing: 1 }}>
          {oldRating} → {newRating}
        </Typography>
      </Box>
      <Typography sx={{
        fontFamily: BEBAS, fontSize: 28, letterSpacing: 1,
        color: positive ? '#4caf50' : '#ef5350',
      }}>
        {positive ? '+' : ''}{delta}
      </Typography>
    </Box>
  )
}

export default function TournamentOverScreen({
  winner,
  isTie,
  tieData,
  finalLeaderboard,
  playerNames,
  currentUserId,
  tournamentId,
  eloResult,
  onNavigateTournament,
  onNavigateLobby,
}) {
  const isTieWinner = isTie && tieData?.winners?.some(w => w.playerId === currentUserId)
  const isWinner = !isTie && winner?.playerId === currentUserId

  const emoji = isTie ? '🤝' : isWinner ? '🏆' : '🎯'
  const headline = isTie
    ? `IT'S A TIE! PRIZE SPLIT (⬡ ${tieData?.splitPrize} EACH)`
    : isWinner
      ? 'YOU WIN!'
      : `${playerNames[winner?.playerId] || 'Player'} WINS!`
  const headlineColor = isTie || isWinner ? GOLD : 'white'

  return (
    <Box sx={{
      bgcolor: DARK, minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
    }}>
      <Typography sx={{ fontFamily: BEBAS, fontSize: 20, color: GOLD, letterSpacing: 3 }}>
        TOURNAMENT OVER
      </Typography>

      <Typography sx={{ fontSize: 60 }}>{emoji}</Typography>

      <Typography sx={{
        fontFamily: BEBAS, fontSize: isTie ? 28 : 36,
        color: headlineColor, letterSpacing: 3, textAlign: 'center',
      }}>
        {headline}
      </Typography>

      {isTie && (
        <Typography sx={{ color: isTieWinner ? '#4caf50' : '#888', fontSize: 14 }}>
          {isTieWinner ? 'You split the prize!' : 'Prize was split between tied players'}
        </Typography>
      )}

      <EloBadge eloResult={eloResult} />

      <Box sx={{ bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 2, p: 3, minWidth: 300 }}>
        {(finalLeaderboard || []).map((e, i) => (
          <Box key={e.playerId} sx={{
            display: 'flex', justifyContent: 'space-between',
            py: 1, borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <Typography sx={{ color: i === 0 ? GOLD : '#888', fontSize: 14 }}>
              #{i + 1} {playerNames[e.playerId] || 'Player'}
            </Typography>
            <Typography sx={{ color: GOLD, fontSize: 14 }}>⬡ {e.tokens}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        {tournamentId && (
          <Button
            onClick={onNavigateTournament}
            sx={{ bgcolor: GOLD, color: DARK, px: 4, py: 1.5, fontFamily: BEBAS, fontSize: 18, '&:hover': { bgcolor: '#E8C97A' } }}
          >
            VIEW TOURNAMENT
          </Button>
        )}
        <Button
          onClick={onNavigateLobby}
          sx={{ color: '#aaa', border: '1px solid rgba(255,255,255,0.1)', px: 4, py: 1.5, fontFamily: BEBAS, fontSize: 18, '&:hover': { borderColor: 'white', color: 'white' } }}
        >
          LOBBY
        </Button>
      </Box>
    </Box>
  )
}
