import { Box, Typography } from '@mui/material'
import PlayerHand from './PlayerHand'
import ActionButtons from './ActionButtons'

export default function PlayersSection({
  players,
  currentPlayerId,
  userId,
  playerNames,
  phase,
  isMyTurn,
  myPlayer,
  canAct,
  availableMoves,
  acting,
  onAction,
}) {
  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {players.map(p => (
        <PlayerHand
          key={p.id}
          player={p}
          isCurrentPlayer={p.id === currentPlayerId}
          isMe={p.id === userId}
          playerNames={playerNames}
        />
      ))}

      {isMyTurn && myPlayer?.status === 'playing' && (
        <ActionButtons
          canAct={canAct}
          availableMoves={availableMoves}
          acting={acting}
          onAction={onAction}
        />
      )}

      {phase === 'playing' && !isMyTurn && currentPlayerId && (
        <Typography sx={{ color: '#555', fontSize: 13, mt: 3 }}>
          Waiting for {playerNames[currentPlayerId] || 'player'} to act…
        </Typography>
      )}
    </Box>
  )
}
