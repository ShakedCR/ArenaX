import { useParams, useNavigate } from 'react-router-dom'
import { Box, Typography } from '@mui/material'
import { useAuth } from '../../contexts/useAuth'
import { useBlackjackSocket } from '../../hooks/useBlackjackSocket'
import AuthNavbar from '../../components/layout/AuthNavbar'
import BlackjackLeaderboard from '../../components/game/blackjack/BlackjackLeaderboard'
import RoundResultOverlay from '../../components/game/blackjack/RoundResultOverlay'
import GameOverScreen from '../../components/game/blackjack/GameOverScreen'
import TournamentOverScreen from '../../components/game/blackjack/TournamentOverScreen'
import StageOverScreen from '../../components/game/blackjack/StageOverScreen'
import BettingPanel from '../../components/game/blackjack/BettingPanel'
import DealerSection from '../../components/game/blackjack/DealerSection'
import TurnIndicator from '../../components/game/blackjack/TurnIndicator'
import PlayersSection from '../../components/game/blackjack/PlayersSection'
import { GOLD, DARK, BEBAS } from '../../components/game/blackjack/constants'

const calcHandValue = (cards) => {
  let total = 0
  let aces = 0
  for (const card of cards) {
    if (!card || card.rank === '?') continue
    if (card.rank === 'A') { aces++; total += 11 } else { total += card.value }
  }
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return total
}

export default function Blackjack() {
  const { id: gameId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id || user?._id

  const {
    phase, round, totalRounds,
    dealerCards, visibleDealerCards, dealerHidden,
    players, currentPlayerId, leaderboard, playerNames,
    roundResult, finalLeaderboard,
    stageOverData, tournamentWinner, tournamentTie, tournamentId, eloResult,
    acting, myBet, setMyBet, betConfirmed, bettingPlayers,
    myPlayer, isMyTurn, canAct, myTokens, availableMoves, minBet, effectiveBet,
    turnTimeLeft, betTimeLeft,
    handleAction, handleConfirmBet,
    disconnectedPlayers,
  } = useBlackjackSocket({ gameId, userId, navigate })

  // ── Full-page screens ──────────────────────────────────────────────────────
  if (phase === 'game-over') {
    return (
      <GameOverScreen
        finalLeaderboard={finalLeaderboard}
        playerNames={playerNames}
        currentUserId={userId}
        eloResult={eloResult}
        onBack={() => navigate('/lobby')}
      />
    )
  }

  if (phase === 'tournament-over') {
    return (
      <TournamentOverScreen
        winner={tournamentWinner}
        isTie={!!tournamentTie}
        tieData={tournamentTie}
        finalLeaderboard={finalLeaderboard}
        playerNames={playerNames}
        currentUserId={userId}
        tournamentId={tournamentId}
        eloResult={eloResult}
        onNavigateTournament={() => navigate(`/tournaments/${tournamentId}`)}
        onNavigateLobby={() => navigate('/lobby')}
      />
    )
  }

  if (phase === 'stage-over') {
    return (
      <StageOverScreen
        stageData={stageOverData}
        playerNames={playerNames}
        currentUserId={userId}
        onBack={() => navigate('/lobby')}
      />
    )
  }

  // ── Dealer card display logic ──────────────────────────────────────────────
  const displayedDealerCards = phase === 'dealer-reveal'
    ? visibleDealerCards
    : (dealerHidden && dealerCards.length > 0 ? [dealerCards[0]] : dealerCards)

  const dealerFaceDownCount = phase === 'dealer-reveal'
    ? 0
    : (dealerHidden && dealerCards.length > 0 ? 1 : 0)

  const dealerTotal = calcHandValue(dealerCards)
  const visibleDealerTotal = calcHandValue(visibleDealerCards)

  // ── Main game UI ───────────────────────────────────────────────────────────
  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: '#fff' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={user?.walletBalance || 0}
      />

      {/* Header: title + round pips + game ID */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 4, py: 2, borderBottom: '1px solid rgba(201,168,76,0.1)',
      }}>
        <Typography sx={{ fontFamily: BEBAS, fontSize: 22, letterSpacing: 3, color: GOLD }}>BLACKJACK</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {Array.from({ length: totalRounds }).map((_, i) => (
            <Box key={i} sx={{
              width: 10, height: 10, borderRadius: '50%',
              bgcolor: i < round ? GOLD : 'rgba(201,168,76,0.2)',
              border: `1px solid ${i === round - 1 ? GOLD : 'transparent'}`,
            }} />
          ))}
          <Typography sx={{ color: '#888', fontSize: 13, ml: 1 }}>Round {round || '—'} / {totalRounds}</Typography>
        </Box>
        <Typography sx={{ color: '#555', fontSize: 12 }}>Game #{gameId?.slice(-6)}</Typography>
      </Box>

      <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 130px)' }}>
        {/* Game area */}
        <Box sx={{
          flex: '0 0 68%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          px: 4, py: 5, position: 'relative',
          borderRight: '1px solid rgba(255,255,255,0.04)',
        }}>
          {phase === 'round-result' && (
            <RoundResultOverlay result={roundResult} currentUserId={userId} round={round} />
          )}

          {phase === 'loading' && (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: '#555', fontFamily: BEBAS, fontSize: 24, letterSpacing: 4 }}>CONNECTING…</Typography>
            </Box>
          )}

          {phase === 'betting' && (
            <BettingPanel
              myTokens={myTokens}
              betConfirmed={betConfirmed}
              bettingPlayers={bettingPlayers}
              round={round}
              totalRounds={totalRounds}
              myBet={myBet}
              effectiveBet={effectiveBet}
              minBet={minBet}
              onBetChange={setMyBet}
              onConfirmBet={handleConfirmBet}
              betTimeLeft={betTimeLeft}
            />
          )}

          {phase !== 'loading' && phase !== 'betting' && (
            <>
              <DealerSection
                phase={phase}
                displayedDealerCards={displayedDealerCards}
                dealerFaceDownCount={dealerFaceDownCount}
                visibleDealerCards={visibleDealerCards}
                visibleDealerTotal={visibleDealerTotal}
                dealerCards={dealerCards}
                dealerTotal={dealerTotal}
              />

              <TurnIndicator
                currentPlayerId={currentPlayerId}
                phase={phase}
                isMyTurn={isMyTurn}
                playerNames={playerNames}
                turnTimeLeft={turnTimeLeft}
              />

              <Box sx={{ width: '80%', height: 1, bgcolor: 'rgba(201,168,76,0.08)', my: 1 }} />

              <PlayersSection
                players={players}
                currentPlayerId={currentPlayerId}
                userId={userId}
                playerNames={playerNames}
                phase={phase}
                isMyTurn={isMyTurn}
                myPlayer={myPlayer}
                canAct={canAct}
                availableMoves={availableMoves}
                acting={acting}
                onAction={handleAction}
              />
            </>
          )}
        </Box>

        {/* Leaderboard sidebar */}
        <Box sx={{ flex: '0 0 32%', p: 3 }}>
          <BlackjackLeaderboard entries={leaderboard} playerNames={playerNames} currentUserId={userId} disconnectedPlayers={disconnectedPlayers} />
        </Box>
      </Box>
    </Box>
  )
}
