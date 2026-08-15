import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Box, Chip, CircularProgress, Typography } from '@mui/material'
import { useAuth } from '../../contexts/useAuth'
import AuthNavbar from '../../components/layout/AuthNavbar'
import { useTriviaSocket } from '../../hooks/useTriviaSocket'
import api from '../../services/api'
import { GOLD, DARK, BEBAS } from '../../styles/themeConstants'
import CircleTimer from '../../components/game/trivia/CircleTimer'
import AnswerButton from '../../components/game/trivia/AnswerButton'
import TriviaLeaderboard from '../../components/game/trivia/TriviaLeaderboard'
import GameOverScreen from '../../components/game/trivia/GameOverScreen'

const ANSWER_LABELS = ['A', 'B', 'C', 'D']

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Trivia() {
  const { id: triviaGameId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const userId = user?.id || user?._id

  const [gameInfo, setGameInfo] = useState(null)

  const {
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
  } = useTriviaSocket({ triviaGameId, initialQuestion: location.state?.firstQuestion })

  useEffect(() => {
    const tournamentId = location.state?.tournamentId
    if (!tournamentId) return

    api.get(`/trivia/tournament/${tournamentId}`)
      .then(res => {
        const g = res.data.triviaGame
        setGameInfo({
          topic: g.topic,
          category: g.category,
          difficulty: g.difficulty,
          questionCount: g.questionCount
        })
      })
      .catch(() => {})
  }, [location.state?.tournamentId])

  if (phase === 'completed') {
    return (
      <GameOverScreen
        finalLeaderboard={finalLeaderboard}
        currentUserId={userId}
        onBack={() => navigate('/lobby')}
      />
    )
  }

  const totalQ = gameInfo?.questionCount || 0

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar username={user?.username || 'Player'} tokens={user?.walletBalance || 0} />

      {/* Disconnect banner */}
      {!isConnected && (
        <Box sx={{
          bgcolor: '#b71c1c', py: 1, px: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5
        }}>
          <CircularProgress size={12} sx={{ color: 'white' }} />
          <Typography sx={{ fontSize: 13, color: 'white', fontWeight: 600 }}>
            Connection lost — reconnecting…
          </Typography>
        </Box>
      )}

      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: { xs: 2, md: 4 }, py: 1.5,
        borderBottom: '1px solid rgba(201,168,76,0.1)'
      }}>
        <Typography sx={{ fontFamily: BEBAS, fontSize: 20, letterSpacing: 3, color: GOLD }}>
          TRIVIA
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          {gameInfo?.topic && (
            <Chip label={gameInfo.topic} size="small" sx={{
              bgcolor: 'rgba(201,168,76,0.1)', color: GOLD,
              border: '1px solid rgba(201,168,76,0.2)', fontSize: 11
            }} />
          )}
          {gameInfo?.difficulty && (
            <Chip label={gameInfo.difficulty} size="small" sx={{
              bgcolor: 'rgba(255,255,255,0.04)', color: '#666', fontSize: 11
            }} />
          )}
        </Box>
        <Typography sx={{ color: '#333', fontSize: 11 }}>
          {triviaGameId?.slice(-6)}
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        minHeight: 'calc(100vh - 120px)'
      }}>

        {/* ── Question area ─────────────────────────────────── */}
        <Box sx={{
          flex: { xs: '1 1 auto', md: '0 0 65%' },
          px: { xs: 3, md: 6 }, py: 5,
          borderRight: { xs: 'none', md: '1px solid rgba(255,255,255,0.04)' },
          borderBottom: { xs: '1px solid rgba(255,255,255,0.04)', md: 'none' }
        }}>

          {/* Loading state */}
          {phase === 'loading' && (
            <Box sx={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              minHeight: 300, gap: 3
            }}>
              <CircularProgress sx={{ color: GOLD }} />
              <Typography sx={{
                color: '#555', fontFamily: BEBAS, fontSize: 22,
                letterSpacing: 4, textAlign: 'center'
              }}>
                WAITING FOR GAME TO START…
              </Typography>
              {gameInfo && (
                <Typography sx={{ color: '#444', fontSize: 13, textAlign: 'center' }}>
                  {gameInfo.topic} · {totalQ} questions · {gameInfo.difficulty}
                </Typography>
              )}
            </Box>
          )}

          {/* Question + answers */}
          {(phase === 'question' || phase === 'reveal') && currentQuestion && (
            <Box
              key={questionIndex}
              sx={{
                animation: 'questionIn 0.35s ease',
                '@keyframes questionIn': {
                  from: { opacity: 0, transform: 'translateX(10px)' },
                  to: { opacity: 1, transform: 'translateX(0)' }
                }
              }}
            >
              {/* Progress row */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: '#555', fontSize: 12, mb: 0.75 }}>
                    Question {questionIndex + 1}{totalQ > 0 ? ` of ${totalQ}` : ''}
                  </Typography>
                  {totalQ > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, overflow: 'hidden' }}>
                      {Array.from({ length: totalQ }).map((_, i) => (
                        <Box key={i} sx={{
                          height: 3, flex: 1, borderRadius: 2,
                          bgcolor: i < questionIndex
                            ? GOLD
                            : i === questionIndex
                              ? 'rgba(201,168,76,0.4)'
                              : 'rgba(255,255,255,0.06)',
                          transition: 'background-color 0.3s'
                        }} />
                      ))}
                    </Box>
                  )}
                </Box>
                <CircleTimer timeLeft={timeLeft} totalTime={totalTime} phase={phase} />
              </Box>

              {/* Question text */}
              <Typography sx={{
                fontSize: { xs: 17, md: 20 }, fontWeight: 600,
                lineHeight: 1.5, mb: 4, color: 'white'
              }}>
                {currentQuestion.question}
              </Typography>

              {/* Answers */}
              <Box>
                {currentQuestion.answers.map((answer, i) => (
                  <AnswerButton
                    key={i}
                    label={ANSWER_LABELS[i]}
                    text={answer}
                    index={i}
                    phase={phase}
                    selectedAnswer={selectedAnswer}
                    answerResult={answerResult}
                    onSelect={submitAnswer}
                  />
                ))}
              </Box>

              {/* Waiting after answer */}
              {phase === 'question' && selectedAnswer !== null && (
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Typography sx={{ color: '#555', fontSize: 13 }}>
                    Answer locked in — waiting for others…
                  </Typography>
                </Box>
              )}

              {/* Reveal feedback */}
              {phase === 'reveal' && (
                <Box sx={{
                  mt: 3,
                  animation: 'revealIn 0.3s ease',
                  '@keyframes revealIn': {
                    from: { opacity: 0, transform: 'translateY(-6px)' },
                    to: { opacity: 1, transform: 'translateY(0)' }
                  }
                }}>
                  {answerResult?.isCorrect !== undefined && (
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      p: 2, mb: 2, borderRadius: 1,
                      bgcolor: answerResult.isCorrect
                        ? 'rgba(76,175,80,0.12)'
                        : 'rgba(232,64,64,0.12)',
                      border: `1px solid ${answerResult.isCorrect
                        ? 'rgba(76,175,80,0.3)'
                        : 'rgba(232,64,64,0.3)'}`
                    }}>
                      <Typography sx={{ fontSize: 20, lineHeight: 1 }}>
                        {answerResult.isCorrect ? '✓' : '✗'}
                      </Typography>
                      <Box>
                        <Typography sx={{
                          fontSize: 14, fontWeight: 700,
                          color: answerResult.isCorrect ? '#4caf50' : '#E84040'
                        }}>
                          {answerResult.isCorrect
                            ? `Correct! +${answerResult.scoreEarned} pts`
                            : 'Wrong answer'}
                        </Typography>
                        {!answerResult.isCorrect && answerResult.correctAnswer && (
                          <Typography sx={{ fontSize: 12, color: '#888', mt: 0.25 }}>
                            Correct: {answerResult.correctAnswer}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Reveal for players who didn't answer in time */}
                  {answerResult?.isCorrect === undefined && answerResult?.correctAnswer && (
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      p: 2, mb: 2, borderRadius: 1,
                      bgcolor: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                      <Typography sx={{ fontSize: 20, lineHeight: 1 }}>⏱</Typography>
                      <Box>
                        <Typography sx={{ fontSize: 14, color: '#888' }}>Time's up</Typography>
                        <Typography sx={{ fontSize: 12, color: '#666', mt: 0.25 }}>
                          Correct: {answerResult.correctAnswer}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {answerResult?.explanation && (
                    <Box sx={{
                      p: 2, borderRadius: 1,
                      bgcolor: 'rgba(201,168,76,0.06)',
                      border: '1px solid rgba(201,168,76,0.15)'
                    }}>
                      <Typography sx={{
                        color: '#888', fontSize: 11, mb: 0.5,
                        textTransform: 'uppercase', letterSpacing: 0.5
                      }}>
                        Explanation
                      </Typography>
                      <Typography sx={{ color: '#ccc', fontSize: 13, lineHeight: 1.6 }}>
                        {answerResult.explanation}
                      </Typography>
                    </Box>
                  )}

                  <Typography sx={{ color: '#444', fontSize: 12, textAlign: 'center', mt: 3 }}>
                    Next question coming up…
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* ── Leaderboard sidebar ───────────────────────────── */}
        <Box sx={{ flex: { xs: '0 0 auto', md: '0 0 35%' }, p: 3 }}>
          <TriviaLeaderboard entries={leaderboard} currentUserId={userId} />
        </Box>
      </Box>
    </Box>
  )
}
