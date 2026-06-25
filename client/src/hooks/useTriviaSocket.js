import { useCallback, useEffect, useRef, useState } from 'react'
import { connectSocket, getSocket } from '../services/socket'

/**
 * Phases:
 *  'loading'   — waiting for the first trivia:question-started
 *  'question'  — question active, timer ticking
 *  'reveal'    — question ended, answer + explanation shown (5 s pause)
 *  'completed' — game over, final leaderboard available
 *
 * @param {string}  triviaGameId
 * @param {object}  initialQuestion  — optional: the trivia:question-started payload
 *                  passed via router state from WaitingRoom so the first question
 *                  is never missed due to the room-join race condition.
 */
export function useTriviaSocket({ triviaGameId, initialQuestion }) {
  const [phase, setPhase] = useState('loading')
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(-1)
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalTime, setTotalTime] = useState(30)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answerResult, setAnswerResult] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [finalLeaderboard, setFinalLeaderboard] = useState([])
  const [isConnected, setIsConnected] = useState(() => getSocket()?.connected ?? true)

  const timerRef = useRef(null)
  const questionStartTimeRef = useRef(null)
  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startCountdown = useCallback((serverStartedAt, timePerQuestion) => {
    clearTimer()
    const endMs = new Date(serverStartedAt).getTime() + timePerQuestion * 1000

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, endMs - Date.now())
      setTimeLeft(Math.ceil(remaining / 1000))
      if (remaining <= 0) clearTimer()
    }, 100)
  }, [clearTimer])

  // Shared handler — used for both socket events and the initial question
  const handleQuestionStarted = useCallback((data) => {
    setCurrentQuestion(data.question)
    setQuestionIndex(data.currentQuestionIndex)
    setTotalTime(data.timePerQuestion)
    setSelectedAnswer(null)
    setAnswerResult(null)
    setPhase('question')
    questionStartTimeRef.current = Date.now()
    startCountdown(data.serverStartedAt, data.timePerQuestion)
  }, [startCountdown])

  // Process the first question immediately if it was passed from WaitingRoom.
  // This resolves the race condition: WaitingRoom received trivia:question-started,
  // navigated here, and left the trivia room. By the time we join the room the
  // event has already fired — so we use the data that was passed via router state.
  useEffect(() => {
    if (initialQuestion) {
      handleQuestionStarted(initialQuestion)
    }
  }, []) // intentionally empty — only run once on mount

  useEffect(() => {
    if (!triviaGameId) return

    const sock = connectSocket(localStorage.getItem('token'))

    // Join generic game room — registers with the reconnect timer system
    sock.emit('player:join', { gameId: triviaGameId })
    sock.emit('trivia:join', { triviaGameId })

    // Save to localStorage so ActiveGameBanner can show a "Return to game" button
    localStorage.setItem('trivia_active_game', JSON.stringify({ triviaGameId }))

    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)
    const onConnectError = () => setIsConnected(false)
    sock.on('connect', onConnect)
    sock.on('disconnect', onDisconnect)
    sock.on('connect_error', onConnectError)

    // trivia:question-ended
    // { triviaGameId, questionIndex, correctAnswerIndex, correctAnswer, explanation, leaderboard, at }
    const onQuestionEnded = (data) => {
      clearTimer()
      setTimeLeft(0)
      setAnswerResult(prev => ({
        ...(prev || {}),
        correctAnswerIndex: data.correctAnswerIndex,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
      }))
      setLeaderboard(data.leaderboard)
      setPhase('reveal')
    }

    // trivia:answer-result  — only to the player who answered
    // { isCorrect, scoreEarned, selectedAnswerIndex, correctAnswerIndex, correctAnswer, explanation, at }
    const onAnswerResult = (data) => {
      setAnswerResult({
        isCorrect: data.isCorrect,
        scoreEarned: data.scoreEarned,
        correctAnswerIndex: data.correctAnswerIndex,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
      })
    }

    const onLeaderboardUpdated = (data) => {
      setLeaderboard(data.leaderboard)
    }

    const onGameCompleted = (data) => {
      clearTimer()
      localStorage.removeItem('trivia_active_game')
      setFinalLeaderboard(data.leaderboard)
      setPhase('completed')
    }

    sock.on('trivia:question-started', handleQuestionStarted)
    sock.on('trivia:question-ended', onQuestionEnded)
    sock.on('trivia:answer-result', onAnswerResult)
    sock.on('trivia:leaderboard-updated', onLeaderboardUpdated)
    sock.on('trivia:game-completed', onGameCompleted)

    return () => {
      // Start the 60s forfeit window — same pattern as blackjack
      const gameFinished = phaseRef.current === 'completed'
      if (!gameFinished) {
        sock.emit('player:leave-game', { gameId: triviaGameId })
        const raw = localStorage.getItem('trivia_active_game')
        if (raw) {
          try {
            const data = JSON.parse(raw)
            if (data.triviaGameId === triviaGameId && !data.savedAt) {
              localStorage.setItem('trivia_active_game', JSON.stringify({ ...data, savedAt: Date.now() }))
            }
          } catch { /* ignore */ }
        }
      } else {
        localStorage.removeItem('trivia_active_game')
      }

      sock.emit('trivia:leave', { triviaGameId })
      sock.off('connect', onConnect)
      sock.off('disconnect', onDisconnect)
      sock.off('connect_error', onConnectError)
      sock.off('trivia:question-started', handleQuestionStarted)
      sock.off('trivia:question-ended', onQuestionEnded)
      sock.off('trivia:answer-result', onAnswerResult)
      sock.off('trivia:leaderboard-updated', onLeaderboardUpdated)
      sock.off('trivia:game-completed', onGameCompleted)
      clearTimer()
    }
  }, [triviaGameId, handleQuestionStarted, clearTimer])

  const submitAnswer = (selectedAnswerIndex) => {
    if (phase !== 'question' || selectedAnswer !== null) return

    const responseTimeMs = Date.now() - (questionStartTimeRef.current || Date.now())
    setSelectedAnswer(selectedAnswerIndex)

    const sock = connectSocket(localStorage.getItem('token'))
    sock.emit('trivia:submit-answer', {
      triviaGameId,
      questionIndex,
      selectedAnswerIndex,
      responseTimeMs,
    })
  }

  return {
    phase,
    currentQuestion,
    questionIndex,
    timeLeft,
    totalTime,
    selectedAnswer,
    answerResult,
    leaderboard,
    finalLeaderboard,
    submitAnswer,
    isConnected,
  }
}
