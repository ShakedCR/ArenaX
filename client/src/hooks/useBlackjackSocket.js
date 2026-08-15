import { useEffect, useRef, useState } from 'react'
import {
  connectSocket,
  joinGame,
  requestBlackjackState,
  sendBlackjackAction,
} from '../services/socket'
import { useBetCountdown } from './useBetCountdown'
import { useTurnCountdown } from './useTurnCountdown'

/**
 * Manages all socket state and real-time event listeners for a Blackjack game.
 * Returns game state, derived values, and action handlers for the UI to consume.
 */
export function useBlackjackSocket({ gameId, userId, navigate }) {
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
  const [eloResult, setEloResult] = useState(null) // { oldRating, newRating, delta }
  const [disconnectedPlayers, setDisconnectedPlayers] = useState({})

  // Keep a ref so socket callbacks always see the latest userId without re-registering
  const userIdRef = useRef(userId)
  useEffect(() => { userIdRef.current = userId }, [userId])

  // Keep a ref to phase so the cleanup function can read the latest value
  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  // Fallback: if blackjack:round-start is never received (e.g. missed due to
  // reconnect), re-request state from server to avoid getting stuck on round-result
  const roundFallbackTimerRef = useRef(null)

  // ── Countdown timers (extracted to dedicated hooks) ────────────────────────
  const betTimeLeft = useBetCountdown(phase, betConfirmed)
  const turnTimeLeft = useTurnCountdown(phase, currentPlayerId)

  // ── Derived state ──────────────────────────────────────────────────────────
  const myPlayer = players.find(p => p.id === userId)
  const isMyTurn = currentPlayerId === userId
  const canAct = phase === 'playing' && isMyTurn && myPlayer?.status === 'playing' && !acting
  const myTokens = myPlayer?.tokens ?? leaderboard.find(e => e.playerId === userId)?.tokens ?? 0
  const availableMoves = myPlayer?.availableMoves || []
  const minBet = myTokens > 0 ? Math.min(10, myTokens) : 0
  const effectiveBet = myTokens > 0 ? Math.max(minBet, Math.min(myBet, myTokens)) : 0

  // ── Helpers ────────────────────────────────────────────────────────────────
  const revealDealerCards = (cards) => {
    setVisibleDealerCards([])
    cards.forEach((card, i) => {
      setTimeout(() => {
        setVisibleDealerCards(prev => [...prev, card])
      }, i * 600)
    })
  }

  const leaderboardFromPlayers = (playerList) =>
    [...playerList]
      .sort((a, b) => b.tokens - a.tokens)
      .map((p, i) => ({ playerId: p.id, tokens: p.tokens, rank: i + 1 }))

  // ── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId || !userId) return
    const sock = connectSocket(localStorage.getItem('token'))

    sock.on('blackjack:game-start', (data) => {
      // Store active game so the player can return from Lobby if they navigate away
      localStorage.setItem('bj_active_game', JSON.stringify({ gameId }))

      const names = {}
      data.players?.forEach(p => { names[p.id] = p.name })
      setPlayerNames(names)
      setRound(data.round)
      setTotalRounds(data.totalRounds)
      setDealerCards(data.dealerCards || [])
      setVisibleDealerCards(data.dealerCards || [])
      setDealerHidden(data.dealerHidden ?? true)
      setPlayers(data.players || [])
      setCurrentPlayerId(data.currentPlayerId)
      setLeaderboard(leaderboardFromPlayers(data.players || []))

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
      setPhase(data.phase === 'round-over' ? 'round-result' : 'playing')
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

      if (roundFallbackTimerRef.current) clearTimeout(roundFallbackTimerRef.current)
      roundFallbackTimerRef.current = setTimeout(() => {
        roundFallbackTimerRef.current = null
        requestBlackjackState(gameId)
      }, delay + 9000)
    })

    sock.on('blackjack:round-start', (data) => {
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
      if (data.players?.length) setLeaderboard(leaderboardFromPlayers(data.players))
      setPhase('betting')
    })

    sock.on('blackjack:bet-placed', (data) => {
      setBettingPlayers(prev => [
        ...prev.filter(p => p.id !== data.playerId),
        { id: data.playerId },
      ])
    })

    sock.on('blackjack:timeout', (data) => {
      if (data.playerId === userIdRef.current) setActing(false)
    })

    sock.on('blackjack:game-over', (data) => {
      if (roundFallbackTimerRef.current) {
        clearTimeout(roundFallbackTimerRef.current)
        roundFallbackTimerRef.current = null
      }
      localStorage.removeItem('bj_active_game')
      setFinalLeaderboard(data.finalLeaderboard || [])
      setPhase('game-over')
    })

    sock.on('blackjack:stage-over', (data) => {
      if (roundFallbackTimerRef.current) {
        clearTimeout(roundFallbackTimerRef.current)
        roundFallbackTimerRef.current = null
      }
      localStorage.removeItem('bj_active_game')
      setStageOverData(data)
      setPhase('stage-over')
    })

    sock.on('blackjack:next-stage', (data) => {
      if (data.players?.includes(userIdRef.current)) {
        navigate(`/game/blackjack/${data.gameId}`)
      } else {
        navigate(`/tournaments/${data.tournamentId}`)
      }
    })

    sock.on('blackjack:tournament-over', (data) => {
      if (roundFallbackTimerRef.current) {
        clearTimeout(roundFallbackTimerRef.current)
        roundFallbackTimerRef.current = null
      }
      localStorage.removeItem('bj_active_game')
      setTournamentWinner(data.winner)
      setTournamentTie(data.isTie ? { winners: data.winners, splitPrize: data.splitPrize } : null)
      setFinalLeaderboard(data.finalLeaderboard || [])
      setTournamentId(data.tournamentId)
      setPhase('tournament-over')
    })

    sock.on('blackjack:player-forfeited', (data) => {
      setDisconnectedPlayers(prev => ({
        ...prev,
        [data.playerId]: { ...prev[data.playerId], forfeited: true, expired: true },
      }))
    })

    sock.on('player:disconnect', (data) => {
      if (data.gameId !== gameId) return
      setDisconnectedPlayers(prev => ({
        ...prev,
        [data.userId]: { since: Date.now(), reconnectWindowMs: data.reconnectTimeoutMs ?? 60000, expired: false },
      }))
    })

    sock.on('player:reconnect', (data) => {
      if (data.gameId !== gameId) return
      setDisconnectedPlayers(prev => {
        const next = { ...prev }
        delete next[data.userId]
        return next
      })
    })

    sock.on('player:reconnect-expired', (data) => {
      if (data.gameId !== gameId) return
      setDisconnectedPlayers(prev => ({
        ...prev,
        [data.userId]: { ...prev[data.userId], expired: true },
      }))
    })

    const handleEloUpdated = (data) => {
      if (data.game === 'blackjack') setEloResult(data)
    }
    sock.on('elo:updated', handleEloUpdated)

    joinGame(gameId)
      .then((joinRes) => {
        if (!joinRes?.ok) {
          throw new Error(joinRes?.message || 'Failed to join game')
        }
        return requestBlackjackState(gameId)
      })
      .then((stateRes) => {
        if (!stateRes?.ok) {
          throw new Error(stateRes?.message || 'Failed to request game state')
        }
      })
      .catch((err) => {
        console.error('[useBlackjackSocket] Failed to initialize game:', err)
        navigate('/lobby')
      })

    return () => {
      // Tell the server the player left the page — triggers the 60s forfeit window.
      // Only emit if the game is still active (not when game/tournament ends naturally).
      const currentPhase = phaseRef.current
      const gameFinished = ['game-over', 'tournament-over', 'stage-over'].includes(currentPhase)
      if (!gameFinished) {
        sock.emit('player:leave-game', { gameId })
      }

      // Stamp the exit time so ActiveGameBanner knows how much of the 60s window remains
      if (!gameFinished) {
        const raw = localStorage.getItem('bj_active_game')
        if (raw) {
          try {
            const data = JSON.parse(raw)
            if (data.gameId === gameId && !data.savedAt) {
              localStorage.setItem('bj_active_game', JSON.stringify({ ...data, savedAt: Date.now() }))
            }
          } catch { /* ignore */ }
        }
      }

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
      sock.off('elo:updated', handleEloUpdated)
      sock.off('blackjack:player-forfeited')
      sock.off('player:disconnect')
      sock.off('player:reconnect')
      sock.off('player:reconnect-expired')
      if (roundFallbackTimerRef.current) {
        clearTimeout(roundFallbackTimerRef.current)
        roundFallbackTimerRef.current = null
      }
    }
  }, [gameId, userId, navigate])

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleAction = async (action) => {
    if (!canAct) return
    setActing(true)
    try {
      await sendBlackjackAction(gameId, action)
    } finally {
      setActing(false)
    }
  }

  const handleConfirmBet = () => {
    if (myTokens <= 0 || effectiveBet <= 0) return
    const sock = connectSocket(localStorage.getItem('token'))
    sock.emit('blackjack:place-bet', { gameId, bet: effectiveBet }, (res) => {
      if (res?.ok) setBetConfirmed(true)
    })
  }

  return {
    // game state
    phase, round, totalRounds,
    dealerCards, visibleDealerCards, dealerHidden,
    players, currentPlayerId, leaderboard, playerNames,
    roundResult, finalLeaderboard,
    // tournament state
    stageOverData, tournamentWinner, tournamentTie, tournamentId,
    // elo
    eloResult,
    // disconnect tracking
    disconnectedPlayers,
    // bet state
    acting, myBet, setMyBet, betConfirmed, bettingPlayers,
    // derived
    myPlayer, isMyTurn, canAct, myTokens, availableMoves, minBet, effectiveBet,
    turnTimeLeft, betTimeLeft,
    // action handlers
    handleAction, handleConfirmBet,
  }
}
