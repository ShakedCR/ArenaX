import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Slider } from '@mui/material'
import { useAuth } from '../../contexts/useAuth'
import { connectSocket, joinGame, requestBlackjackState, sendBlackjackAction } from '../../services/socket'
import AuthNavbar from '../../components/layout/AuthNavbar'
import { CardRow } from '../../components/game/blackjack/PlayingCard'
import BlackjackLeaderboard from '../../components/game/blackjack/BlackjackLeaderboard'
import RoundResultOverlay from '../../components/game/blackjack/RoundResultOverlay'
import GameOverScreen from '../../components/game/blackjack/GameOverScreen'
import { GOLD, DARK, DARK2, DARK3, BEBAS } from '../../components/game/blackjack/constants'

const calcHandValue = (cards) => {
  let total = 0
  let aces = 0

  for (const card of cards) {
    if (!card || card.rank === '?') continue
    if (card.rank === 'A') {
      aces++
      total += 11
    } else {
      total += card.value
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }

  return total
}

export default function Blackjack() {
  const { id: gameId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id || user?._id

  const [phase, setPhase] = useState('loading')
  const [round, setRound] = useState(0)
  const [totalRounds, setTotalRounds] = useState(5)
  const [dealerCards, setDealerCards] = useState([])
  const [visibleDealerCards, setVisibleDealerCards] = useState([])
  const [dealerHidden, setDealerHidden] = useState(true)
  const [players, setPlayers] = useState([])
  const [currentPlayerId, setCurrentPlayerId] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [playerNames, setPlayerNames] = useState({})
  const [roundResult, setRoundResult] = useState(null)
  const [finalLeaderboard, setFinalLeaderboard] = useState(null)
  const [acting, setActing] = useState(false)
  const [myBet, setMyBet] = useState(100)
  const [betConfirmed, setBetConfirmed] = useState(false)
  const [bettingPlayers, setBettingPlayers] = useState([])
  const [stageOverData, setStageOverData] = useState(null)
  const [tournamentWinner, setTournamentWinner] = useState(null)
  const [tournamentTie, setTournamentTie] = useState(null)
  const [tournamentId, setTournamentId] = useState(null)

  const userIdRef = useRef(userId)
  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  // Fallback timer: if round-start is never received (e.g. missed due to reconnect),
  // re-request state from server so betting phase is shown automatically
  const roundFallbackTimerRef = useRef(null)

  const myPlayer = players.find(p => p.id === userId)
  const isMyTurn = currentPlayerId === userId
  const canAct = phase === 'playing' && isMyTurn && myPlayer?.status === 'playing' && !acting
  const myTokens = myPlayer?.tokens ?? leaderboard.find(e => e.playerId === userId)?.tokens ?? 0
  const availableMoves = myPlayer?.availableMoves || []

  const minBet = myTokens > 0 ? Math.min(10, myTokens) : 0
  const effectiveBet = myTokens > 0 ? Math.max(minBet, Math.min(myBet, myTokens)) : 0

  const revealDealerCards = (cards) => {
    setVisibleDealerCards([])
    cards.forEach((card, i) => {
      setTimeout(() => {
        setVisibleDealerCards(prev => [...prev, card])
      }, i * 600)
    })
  }

  useEffect(() => {
    if (!gameId || !userId) return
    const sock = connectSocket(localStorage.getItem('token'))

    sock.on('blackjack:game-start', (data) => {
      const names = {}
      data.players?.forEach(p => {
        names[p.id] = p.name
      })
      setPlayerNames(names)
      setRound(data.round)
      setTotalRounds(data.totalRounds)
      setDealerCards(data.dealerCards || [])
      setVisibleDealerCards(data.dealerCards || [])
      setDealerHidden(data.dealerHidden ?? true)
      setPlayers(data.players || [])
      setCurrentPlayerId(data.currentPlayerId)
      setLeaderboard(
        (data.players || [])
          .sort((a, b) => b.tokens - a.tokens)
          .map((p, i) => ({ playerId: p.id, tokens: p.tokens, rank: i + 1 }))
      )
      if (data.phase === 'betting') {
        setBetConfirmed(false)
        setMyBet(100)
        setBettingPlayers([])
        setPhase('betting')
      } else if (data.phase === 'game-over') {
        setPhase('game-over')
      } else if (data.phase === 'round-over' || data.phase === 'dealer-turn') {
        if (data.lastRoundResult) {
          setRoundResult(data.lastRoundResult)
          setLeaderboard(data.lastRoundResult.leaderboard || [])
          setDealerCards(data.lastRoundResult.dealerCards || [])
          setVisibleDealerCards(data.lastRoundResult.dealerCards || [])
          setDealerHidden(false)
        }
        setPhase('round-result')
      } else {
        setPhase('playing')
      }
    })

    sock.on('blackjack:game-state', (data) => {
      setRound(data.round)
      setDealerCards(data.dealerCards || [])
      setVisibleDealerCards(data.dealerCards || [])
      setDealerHidden(data.dealerHidden ?? true)
      setPlayers(data.players || [])
      setCurrentPlayerId(data.currentPlayerId)
      if (data.phase === 'round-over') {
        setPhase('round-result')
      } else {
        setPhase('playing')
      }
    })

    sock.on('blackjack:round-result', (data) => {
      setDealerHidden(false)
      setDealerCards(data.dealerCards || [])
      if (data.players) setPlayers(data.players)
      setLeaderboard(data.leaderboard || [])
      setRoundResult(data)
      setPhase('dealer-reveal')
      revealDealerCards(data.dealerCards || [])
      const delay = ((data.dealerCards?.length || 2) * 600) + 800
      setTimeout(() => setPhase('round-result'), delay)

      // Fallback: if round-start is never received (missed due to reconnect),
      // re-request state so the client doesn't get stuck in round-result
      if (roundFallbackTimerRef.current) clearTimeout(roundFallbackTimerRef.current)
      roundFallbackTimerRef.current = setTimeout(() => {
        roundFallbackTimerRef.current = null
        requestBlackjackState(gameId)
      }, delay + 9000)
    })

    sock.on('blackjack:round-start', (data) => {
      // round-start arrived normally — cancel the fallback
      if (roundFallbackTimerRef.current) {
        clearTimeout(roundFallbackTimerRef.current)
        roundFallbackTimerRef.current = null
      }
      setRound(data.round)
      setRoundResult(null)
      setDealerCards([])
      setVisibleDealerCards([])
      setDealerHidden(true)
      setPlayers([])
      setCurrentPlayerId(null)
      setBetConfirmed(false)
      setMyBet(100)
      setBettingPlayers([])
      if (data.players?.length) {
        setLeaderboard(
          [...data.players]
            .sort((a, b) => b.tokens - a.tokens)
            .map((p, i) => ({ playerId: p.id, tokens: p.tokens, rank: i + 1 }))
        )
      }
      setPhase('betting')
    })

    sock.on('blackjack:bet-placed', (data) => {
      setBettingPlayers(prev => [...prev.filter(p => p.id !== data.playerId), { id: data.playerId }])
    })

    sock.on('blackjack:timeout', (data) => {
      if (data.playerId === userIdRef.current) setActing(false)
    })

    sock.on('blackjack:game-over', (data) => {
      setFinalLeaderboard(data.finalLeaderboard || [])
      setPhase('game-over')
    })

    sock.on('blackjack:stage-over', (data) => {
      setStageOverData(data)
      setPhase('stage-over')
    })

    sock.on('blackjack:next-stage', (data) => {
      const isAdvancing = data.players?.includes(userIdRef.current)
      if (isAdvancing) {
        navigate(`/game/blackjack/${data.gameId}`)
      } else {
        navigate(`/tournaments/${data.tournamentId}`)
      }
    })

    sock.on('blackjack:tournament-over', (data) => {
      setTournamentWinner(data.winner)
      setTournamentTie(data.isTie ? { winners: data.winners, splitPrize: data.splitPrize } : null)
      setFinalLeaderboard(data.finalLeaderboard || [])
      setTournamentId(data.tournamentId)
      setPhase('tournament-over')
    })

    joinGame(gameId).then(() => requestBlackjackState(gameId))

    return () => {
      sock.off('blackjack:game-start')
      sock.off('blackjack:game-state')
      sock.off('blackjack:round-result')
      sock.off('blackjack:round-start')
      sock.off('blackjack:bet-placed')
      sock.off('blackjack:timeout')
      sock.off('blackjack:game-over')
      sock.off('blackjack:stage-over')
      sock.off('blackjack:next-stage')
      sock.off('blackjack:tournament-over')
      if (roundFallbackTimerRef.current) {
        clearTimeout(roundFallbackTimerRef.current)
        roundFallbackTimerRef.current = null
      }
    }
  }, [gameId, userId, navigate])

  const handleAction = async (action) => {
    if (!canAct) return
    setActing(true)
    try {
      await sendBlackjackAction(gameId, action)
    } finally {
      setActing(false)
    }
  }

  const handleConfirmBet = async () => {
    if (myTokens <= 0 || effectiveBet <= 0) return
    const sock = connectSocket(localStorage.getItem('token'))
    sock.emit('blackjack:place-bet', { gameId, bet: effectiveBet }, (res) => {
      if (res?.ok) {
        setBetConfirmed(true)
      }
    })
  }

  if (phase === 'game-over') {
    return (
      <GameOverScreen
        finalLeaderboard={finalLeaderboard}
        playerNames={playerNames}
        currentUserId={userId}
        onBack={() => navigate('/lobby')}
      />
    )
  }

  if (phase === 'tournament-over') {
    const isTie = !!tournamentTie
    const isTieWinner = isTie && tournamentTie.winners?.some(w => w.playerId === userId)
    const isWinner = !isTie && tournamentWinner?.playerId === userId

    const emoji = isTie ? '🤝' : isWinner ? '🏆' : '🎯'
    const headline = isTie
      ? `IT'S A TIE! PRIZE SPLIT (⬡ ${tournamentTie.splitPrize} EACH)`
      : isWinner ? 'YOU WIN!' : `${playerNames[tournamentWinner?.playerId] || 'Player'} WINS!`
    const headlineColor = isTie ? GOLD : isWinner ? GOLD : 'white'

    return (
      <Box sx={{ bgcolor: DARK, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        <Typography sx={{ fontFamily: BEBAS, fontSize: 20, color: GOLD, letterSpacing: 3 }}>TOURNAMENT OVER</Typography>
        <Typography sx={{ fontSize: 60 }}>{emoji}</Typography>
        <Typography sx={{ fontFamily: BEBAS, fontSize: isTie ? 28 : 36, color: headlineColor, letterSpacing: 3, textAlign: 'center' }}>
          {headline}
        </Typography>
        {isTie && (
          <Typography sx={{ color: isTieWinner ? '#4caf50' : '#888', fontSize: 14 }}>
            {isTieWinner ? 'You split the prize!' : 'Prize was split between tied players'}
          </Typography>
        )}
        <Box sx={{ bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 2, p: 3, minWidth: 300 }}>
          {(finalLeaderboard || []).map((e, i) => (
            <Box key={e.playerId} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography sx={{ color: i === 0 ? GOLD : '#888', fontSize: 14 }}>#{i + 1} {playerNames[e.playerId] || 'Player'}</Typography>
              <Typography sx={{ color: GOLD, fontSize: 14 }}>⬡ {e.tokens}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {tournamentId && (
            <Button onClick={() => navigate(`/tournaments/${tournamentId}`)} sx={{ bgcolor: GOLD, color: DARK, px: 4, py: 1.5, fontFamily: BEBAS, fontSize: 18, '&:hover': { bgcolor: '#E8C97A' } }}>
              VIEW TOURNAMENT
            </Button>
          )}
          <Button onClick={() => navigate('/lobby')} sx={{ color: '#aaa', border: '1px solid rgba(255,255,255,0.1)', px: 4, py: 1.5, fontFamily: BEBAS, fontSize: 18, '&:hover': { borderColor: 'white', color: 'white' } }}>
            LOBBY
          </Button>
        </Box>
      </Box>
    )
  }

  if (phase === 'stage-over') {
    const isAdvancing = stageOverData?.advancingPlayers?.includes(userId)
    return (
      <Box sx={{ bgcolor: DARK, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        <Typography sx={{ fontFamily: BEBAS, fontSize: 20, color: GOLD, letterSpacing: 3 }}>STAGE {stageOverData?.stage} COMPLETE</Typography>
        <Typography sx={{ fontSize: 50 }}>{isAdvancing ? '✅' : '❌'}</Typography>
        <Typography sx={{ fontFamily: BEBAS, fontSize: 32, color: isAdvancing ? '#4caf50' : '#ef5350', letterSpacing: 3 }}>
          {isAdvancing ? 'YOU ADVANCE!' : 'ELIMINATED'}
        </Typography>
        <Box sx={{ bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 2, p: 3, minWidth: 300 }}>
          <Typography sx={{ color: '#888', fontSize: 12, mb: 2, fontFamily: BEBAS, letterSpacing: 2 }}>STAGE RESULTS</Typography>
          {(stageOverData?.leaderboard || []).map((e, i) => {
            const advancing = stageOverData?.advancingPlayers?.includes(e.playerId)
            return (
              <Box key={e.playerId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ color: advancing ? '#4caf50' : '#ef5350', fontSize: 12 }}>{advancing ? '↑' : '✗'}</Typography>
                  <Typography sx={{ color: e.playerId === userId ? GOLD : '#888', fontSize: 14 }}>#{i + 1} {playerNames[e.playerId] || 'Player'}</Typography>
                </Box>
                <Typography sx={{ color: GOLD, fontSize: 14 }}>⬡ {e.tokens}</Typography>
              </Box>
            )
          })}
        </Box>
        <Typography sx={{ color: '#555', fontSize: 13 }}>
          {isAdvancing ? 'Next stage starting soon…' : 'Better luck next time!'}
        </Typography>
        {!isAdvancing && (
          <Button onClick={() => navigate('/lobby')} sx={{ bgcolor: GOLD, color: DARK, px: 4, py: 1.5, fontFamily: BEBAS, fontSize: 18, '&:hover': { bgcolor: '#E8C97A' } }}>
            BACK TO LOBBY
          </Button>
        )}
      </Box>
    )
  }

  if (phase === 'eliminated') {
    return (
      <Box sx={{ bgcolor: DARK, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        <Typography sx={{ fontSize: 60 }}>❌</Typography>
        <Typography sx={{ fontFamily: BEBAS, fontSize: 32, color: '#ef5350', letterSpacing: 3 }}>ELIMINATED</Typography>
        <Typography sx={{ color: '#666', fontSize: 14 }}>You did not advance to the next stage.</Typography>
        <Button onClick={() => navigate('/lobby')} sx={{ bgcolor: GOLD, color: DARK, px: 4, py: 1.5, fontFamily: BEBAS, fontSize: 18, '&:hover': { bgcolor: '#E8C97A' } }}>
          BACK TO LOBBY
        </Button>
      </Box>
    )
  }

  const displayedDealerCards = phase === 'dealer-reveal'
    ? visibleDealerCards
    : (dealerHidden && dealerCards.length > 0 ? [dealerCards[0]] : dealerCards)

  const dealerFaceDownCount = phase === 'dealer-reveal'
    ? 0
    : (dealerHidden && dealerCards.length > 0 ? 1 : 0)

  const dealerTotal = calcHandValue(dealerCards)
  const visibleDealerTotal = calcHandValue(visibleDealerCards)

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: '#fff' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={user?.walletBalance || 0}
        elo={user?.elo?.blackjack || 1200}
      />

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
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, width: '100%' }}>
              <Typography sx={{ fontFamily: BEBAS, fontSize: 32, letterSpacing: 4, color: GOLD }}>PLACE YOUR BET</Typography>
              <Typography sx={{ color: '#666', fontSize: 13 }}>
                Round {round} of {totalRounds} · Your tokens: ⬡ {myTokens}
              </Typography>
              {!betConfirmed ? (
                myTokens > 0 ? (
                  <Box sx={{ width: 320, bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.2)', borderRadius: 2, p: 4 }}>
                    <Typography sx={{ color: GOLD, fontFamily: BEBAS, fontSize: 48, textAlign: 'center', mb: 1 }}>⬡ {effectiveBet}</Typography>
                    <Slider
                      value={effectiveBet}
                      onChange={(_, v) => setMyBet(v)}
                      min={minBet}
                      max={myTokens}
                      step={10}
                      disabled={myTokens <= 0}
                      sx={{ color: GOLD, '& .MuiSlider-thumb': { bgcolor: GOLD }, '& .MuiSlider-track': { bgcolor: GOLD } }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                      <Typography sx={{ color: '#555', fontSize: 12 }}>Min: {minBet}</Typography>
                      <Typography sx={{ color: '#555', fontSize: 12 }}>Max: {myTokens}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mb: 3, justifyContent: 'center' }}>
                      {[25, 50, 100, 200].filter(v => v <= myTokens).map(v => (
                        <Box key={v} onClick={() => setMyBet(v)} sx={{
                          px: 2, py: 0.5, borderRadius: 1, cursor: 'pointer',
                          border: `1px solid ${effectiveBet === v ? GOLD : 'rgba(255,255,255,0.1)'}`,
                          color: effectiveBet === v ? GOLD : '#666', fontSize: 13,
                          '&:hover': { borderColor: GOLD, color: GOLD }
                        }}>{v}</Box>
                      ))}
                      <Box onClick={() => setMyBet(myTokens)} sx={{
                        px: 2, py: 0.5, borderRadius: 1, cursor: 'pointer',
                        border: `1px solid ${effectiveBet === myTokens ? GOLD : 'rgba(255,255,255,0.1)'}`,
                        color: effectiveBet === myTokens ? GOLD : '#666', fontSize: 13,
                        '&:hover': { borderColor: GOLD, color: GOLD }
                      }}>ALL IN</Box>
                    </Box>
                    <Button
                      fullWidth
                      onClick={handleConfirmBet}
                      disabled={myTokens <= 0 || effectiveBet <= 0}
                      sx={{
                        bgcolor: GOLD,
                        color: DARK,
                        py: 1.5,
                        fontFamily: BEBAS,
                        fontSize: 18,
                        letterSpacing: 2,
                        '&:hover': { bgcolor: '#E8C97A' },
                        '&.Mui-disabled': { bgcolor: '#3a3a3a', color: '#666' }
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
                )
              ) : (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ color: GOLD, fontFamily: BEBAS, fontSize: 24 }}>BET PLACED: ⬡ {effectiveBet}</Typography>
                  <Typography sx={{ color: '#555', fontSize: 13, mt: 1 }}>
                    Waiting for other players… ({bettingPlayers.length} ready)
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {phase !== 'loading' && phase !== 'betting' && (
            <>
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <CardRow cards={displayedDealerCards} faceDownCount={dealerFaceDownCount} label="Dealer" />
                {phase === 'dealer-reveal' && visibleDealerCards.length > 0 && (
                  <Box sx={{ textAlign: 'center', mt: 1 }}>
                    <Typography sx={{ color: GOLD, fontSize: 12, fontFamily: BEBAS, letterSpacing: 2 }}>DEALER REVEALS…</Typography>
                    <Typography sx={{ color: visibleDealerTotal > 21 ? '#ef5350' : 'white', fontSize: 20, fontWeight: 700, mt: 0.5 }}>
                      {visibleDealerTotal > 21 ? `BUST (${visibleDealerTotal})` : `Total: ${visibleDealerTotal}`}
                    </Typography>
                  </Box>
                )}
                {phase === 'round-result' && dealerCards.length > 0 && (
                  <Typography sx={{ mt: 1, fontSize: 14, fontWeight: 700, color: dealerTotal > 21 ? '#ef5350' : GOLD }}>
                    {dealerTotal > 21 ? `DEALER BUST (${dealerTotal})` : `Dealer: ${dealerTotal}`}
                  </Typography>
                )}
              </Box>

              <Box sx={{ my: 2, textAlign: 'center' }}>
                {currentPlayerId && phase === 'playing' && (
                  <Typography sx={{ color: isMyTurn ? GOLD : '#666', fontSize: 13, letterSpacing: 2, fontFamily: BEBAS }}>
                    {isMyTurn ? '⭐ YOUR TURN' : `${playerNames[currentPlayerId] || 'Player'}'S TURN`}
                  </Typography>
                )}
              </Box>

              <Box sx={{ width: '80%', height: 1, bgcolor: 'rgba(201,168,76,0.08)', my: 1 }} />

              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {players.map(p => {
                  const isMe = p.id === userId
                  const isCurrentPlayer = p.id === currentPlayerId
                  const hasSplit = p.hands?.length > 1

                  return (
                    <Box key={p.id} sx={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      opacity: p.status === 'done' || p.status === 'bust' ? 0.5 : 1,
                      border: isCurrentPlayer ? `1px solid ${GOLD}` : '1px solid transparent',
                      borderRadius: 2, p: 2, transition: 'all 0.3s'
                    }}>
                      <Typography sx={{ color: isMe ? GOLD : '#888', fontSize: 12, letterSpacing: 2, mb: 1, fontFamily: BEBAS }}>
                        {isMe ? 'YOU' : playerNames[p.id] || 'Player'}
                        {p.status === 'bust' ? ' — BUST' : ''}
                        {p.status === 'stand' ? ' — STAND' : ''}
                        {isCurrentPlayer && p.status === 'playing' ? ' — PLAYING' : ''}
                      </Typography>

                      {hasSplit ? (
                        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                          {p.hands.map((hand, hi) => (
                            <Box key={hi} sx={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              border: isCurrentPlayer && hi === p.activeHandIndex ? `1px solid ${GOLD}` : '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 1, p: 1.5,
                              opacity: hand.status === 'done' || hand.status === 'bust' ? 0.6 : 1
                            }}>
                              <Typography sx={{ color: '#555', fontSize: 10, mb: 0.5, fontFamily: BEBAS }}>
                                HAND {hi + 1} {hand.isDoubled ? '(DOUBLED)' : ''} {hand.status === 'bust' ? '— BUST' : ''}
                              </Typography>
                              <CardRow cards={hand.cards || []} value={hand.handValue} busted={hand.status === 'bust'} />
                              <Typography sx={{ color: '#555', fontSize: 10, mt: 0.5 }}>Bet: ⬡ {hand.bet}</Typography>
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <CardRow cards={p.cards || []} value={p.handValue} busted={p.status === 'bust'} />
                      )}

                      <Typography sx={{ color: '#555', fontSize: 11, mt: 0.5 }}>
                        Bet: ⬡ {p.bet} · Tokens: ⬡ {p.tokens}
                      </Typography>
                    </Box>
                  )
                })}
              </Box>

              {isMyTurn && myPlayer?.status === 'playing' && (
                <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[
                    { action: 'hit', label: 'HIT' },
                    { action: 'stand', label: 'STAND' },
                    { action: 'double', label: 'DOUBLE', requires: 'double' },
                    { action: 'split', label: 'SPLIT', requires: 'split' },
                  ].filter(btn => !btn.requires || availableMoves.includes(btn.requires)).map(({ action, label }) => (
                    <Button
                      key={action}
                      onClick={() => handleAction(action)}
                      disabled={!canAct}
                      sx={{
                        width: 110,
                        py: 1.5,
                        fontFamily: BEBAS,
                        fontSize: 18,
                        letterSpacing: 2,
                        bgcolor: canAct ? (action === 'hit' ? GOLD : DARK3) : '#1a1a1a',
                        color: canAct ? (action === 'hit' ? DARK : GOLD) : '#444',
                        border: `1px solid ${canAct ? GOLD : '#2a2a2a'}`,
                        borderRadius: 1.5,
                        '&:hover': { bgcolor: canAct ? (action === 'hit' ? '#E8C97A' : '#252535') : '#1a1a1a' },
                        '&.Mui-disabled': { bgcolor: '#1a1a1a', color: '#333', border: '1px solid #1f1f1f' },
                      }}
                    >
                      {acting ? '...' : label}
                    </Button>
                  ))}
                </Box>
              )}

              {phase === 'playing' && !isMyTurn && currentPlayerId && (
                <Typography sx={{ color: '#555', fontSize: 13, mt: 3 }}>
                  Waiting for {playerNames[currentPlayerId] || 'player'} to act…
                </Typography>
              )}
            </>
          )}
        </Box>

        <Box sx={{ flex: '0 0 32%', p: 3 }}>
          <BlackjackLeaderboard entries={leaderboard} playerNames={playerNames} currentUserId={userId} />
        </Box>
      </Box>
    </Box>
  )
}