import { Box, Typography } from '@mui/material'
import { CardRow } from './PlayingCard'
import { GOLD, BEBAS } from './constants'

function statusLabel(player, isCurrentPlayer) {
  if (player.status === 'bust') return ' — BUST'
  if (player.status === 'stand') return ' — STAND'
  if (isCurrentPlayer && player.status === 'playing') return ' — PLAYING'
  return ''
}

export default function PlayerHand({ player, isCurrentPlayer, isMe, playerNames }) {
  const hasSplit = player.hands?.length > 1

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      opacity: player.status === 'done' || player.status === 'bust' ? 0.5 : 1,
      border: isCurrentPlayer ? `1px solid ${GOLD}` : '1px solid transparent',
      borderRadius: 2, p: 2, transition: 'all 0.3s',
    }}>
      <Typography sx={{ color: isMe ? GOLD : '#888', fontSize: 12, letterSpacing: 2, mb: 1, fontFamily: BEBAS }}>
        {isMe ? 'YOU' : playerNames[player.id] || 'Player'}
        {statusLabel(player, isCurrentPlayer)}
      </Typography>

      {hasSplit ? (
        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
          {player.hands.map((hand, hi) => (
            <Box
              key={hi}
              sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                border: isCurrentPlayer && hi === player.activeHandIndex
                  ? `1px solid ${GOLD}`
                  : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 1, p: 1.5,
                opacity: hand.status === 'done' || hand.status === 'bust' ? 0.6 : 1,
              }}
            >
              <Typography sx={{ color: '#555', fontSize: 10, mb: 0.5, fontFamily: BEBAS }}>
                HAND {hi + 1} {hand.isDoubled ? '(DOUBLED)' : ''} {hand.status === 'bust' ? '— BUST' : ''}
              </Typography>
              <CardRow cards={hand.cards || []} value={hand.handValue} busted={hand.status === 'bust'} />
              <Typography sx={{ color: '#555', fontSize: 10, mt: 0.5 }}>Bet: ⬡ {hand.bet}</Typography>
            </Box>
          ))}
        </Box>
      ) : (
        <CardRow cards={player.cards || []} value={player.handValue} busted={player.status === 'bust'} />
      )}

      <Typography sx={{ color: '#555', fontSize: 11, mt: 0.5 }}>
        Bet: ⬡ {player.bet} · Tokens: ⬡ {player.tokens}
      </Typography>
    </Box>
  )
}
