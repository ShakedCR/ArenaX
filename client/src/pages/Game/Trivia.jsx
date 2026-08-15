import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Box, Button, Chip, CircularProgress, Typography } from '@mui/material'
import { useAuth } from '../../contexts/useAuth'
import AuthNavbar from '../../components/layout/AuthNavbar'
import { useTriviaSocket } from '../../hooks/useTriviaSocket'
import api from '../../services/api'
import { GOLD, DARK, DARK2, DARK3, BEBAS } from '../../styles/themeConstants'
const ANSWER_LABELS = ['A', 'B', 'C', 'D']

const rankMedal = (rank) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

const timerColor = (timeLeft, totalTime) => {
  const ratio = totalTime > 0 ? timeLeft / totalTime : 0
  if (ratio > 0.5) return GOLD
  if (ratio > 0.25) return '#E8843C'
  return '#E84040'
}

// ── Circular countdown timer ───────────────────────────────────────────────────
function CircleTimer({ timeLeft, totalTime, phase }) {
  const SIZE = 68
  const STROKE = 4
  const RADIUS = (SIZE - STROKE * 2) / 2
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const ratio = totalTime > 0 && phase === 'question' ? timeLeft / totalTime : 0
  const dashOffset = CIRCUMFERENCE * (1 - ratio)
  const color = phase === 'question' ? timerColor(timeLeft, totalTime) : '#333'

  return (
    <Box sx={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          fill="none" stroke={color} strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={phase === 'question' ? dashOffset : CIRCUMFERENCE}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.15s linear, stroke 0.3s ease' }}
        />
      </svg>
      <Box sx={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Typography sx={{
          fontSize: 17, fontWeight: 700,
          color: phase === 'question' ? color : '#444',
          transition: 'color 0.3s',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {phase === 'question' ? timeLeft : '—'}
        </Typography>
      </Box>
    </Box>
  )
}

// ── Answer button ─────────────────────────────────────────────────────────────
function AnswerButton({ label, text, index, phase, selectedAnswer, answerResult, onSelect }) {
  const isSelected = selectedAnswer === index
  const correctIndex = answerResult?.correctAnswerIndex

  let bg = DARK3
  let border = 'rgba(201,168,76,0.15)'
  let color = '#ccc'

  if (phase === 'question') {
    if (isSelected) {
      bg = 'rgba(201,168,76,0.2)'
      border = GOLD
      color = GOLD
    }
  } else if (phase === 'reveal') {
    if (index === correctIndex) {
      bg = 'rgba(76,175,80,0.2)'
      border = '#4caf50'
      color = '#4caf50'
    } else if (isSelected && index !== correctIndex) {
      bg = 'rgba(232,64,64,0.2)'
      border = '#E84040'
      color = '#E84040'
    } else {
      color = '#444'
      border = 'rgba(255,255,255,0.04)'
    }
  }

  const disabled = phase !== 'question' || selectedAnswer !== null

  return (
    <Box
      onClick={disabled ? undefined : () => onSelect(index)}
      sx={{
        display: 'flex', alignItems: 'center', gap: 2,
        p: 2, mb: 1.5, borderRadius: 1,
        cursor: disabled ? 'default' : 'pointer',
        bgcolor: bg, border: `1px solid ${border}`,
        transition: 'all 0.2s',
        '&:hover': disabled ? {} : { bgcolor: 'rgba(201,168,76,0.12)', borderColor: GOLD }
      }}
    >
      <Box sx={{
        width: 32, height: 32, borderRadius: 1, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 700,
        color, border: `1px solid ${border}`, transition: 'all 0.2s'
      }}>
        {label}
      </Box>
      <Typography sx={{ fontSize: 14, color, lineHeight: 1.4, transition: 'color 0.2s' }}>
        {text}
      </Typography>
    </Box>
  )
}

// ── Leaderboard sidebar ────────────────────────────────────────────────────────
function TriviaLeaderboard({ entries, currentUserId }) {
  if (!entries?.length) return (
    <Box sx={{ color: '#444', fontSize: 13, textAlign: 'center', mt: 4 }}>
      Waiting for first answers…
    </Box>
  )

  return (
    <Box>
      <Typography sx={{ fontFamily: BEBAS, fontSize: 18, letterSpacing: 2, mb: 2, color: GOLD }}>
        LEADERBOARD
      </Typography>
      {entries.map((entry) => {
        const uid = entry.user?._id || entry.user?.id || entry.user
        const isMe = uid?.toString() === currentUserId?.toString()
        return (
          <Box key={uid} sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            py: 1.2, px: 1.5, mb: 0.5, borderRadius: 1,
            bgcolor: isMe ? 'rgba(201,168,76,0.08)' : 'transparent',
            border: isMe ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
            transition: 'all 0.3s'
          }}>
            <Typography sx={{ fontSize: 14, minWidth: 28 }}>
              {rankMedal(entry.rank)}
            </Typography>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{
                fontSize: 13, color: isMe ? GOLD : 'white',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {entry.user?.username || entry.user?.fullName || 'Player'}
                {isMe && <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>(you)</span>}
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#555' }}>
                {entry.correctAnswers}✓ {entry.wrongAnswers}✗
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 14, color: GOLD, fontWeight: 700, flexShrink: 0 }}>
              {entry.totalScore}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}

// ── Game over screen ──────────────────────────────────────────────────────────
function GameOverScreen({ finalLeaderboard, currentUserId, onBack }) {
  const myEntry = finalLeaderboard?.find(e => {
    const uid = e.user?._id || e.user?.id || e.user
    return uid?.toString() === currentUserId?.toString()
  })

  return (
    <Box sx={{
      bgcolor: DARK, minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      px: 4,
      animation: 'fadeIn 0.5s ease',
      '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } }
    }}>
      <Typography sx={{ fontFamily: BEBAS, fontSize: { xs: 40, md: 52 }, letterSpacing: 4, color: GOLD, mb: 1 }}>
        QUIZ COMPLETE
      </Typography>

      {myEntry ? (
        <Box sx={{
          textAlign: 'center', mb: 4,
          animation: 'popIn 0.4s ease 0.15s both',
          '@keyframes popIn': {
            from: { opacity: 0, transform: 'scale(0.85)' },
            to: { opacity: 1, transform: 'scale(1)' }
          }
        }}>
          <Typography sx={{ fontSize: 44, mb: 0.5 }}>{rankMedal(myEntry.rank)}</Typography>
          <Typography sx={{ color: GOLD, fontSize: 26, fontWeight: 700 }}>
            {myEntry.totalScore} pts
          </Typography>
          <Typography sx={{ color: '#666', fontSize: 13, mt: 0.5 }}>
            {myEntry.correctAnswers} correct · {myEntry.wrongAnswers} wrong
          </Typography>
        </Box>
      ) : (
        <Typography sx={{ color: '#555', mb: 4, fontSize: 14 }}>No score recorded</Typography>
      )}

      <Box sx={{
        width: '100%', maxWidth: 480,
        bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.15)', borderRadius: 2, p: 3, mb: 4
      }}>
        <Typography sx={{ fontFamily: BEBAS, fontSize: 18, letterSpacing: 2, mb: 2 }}>
          FINAL STANDINGS
        </Typography>
        {finalLeaderboard?.length ? finalLeaderboard.map((entry) => {
          const uid = entry.user?._id || entry.user?.id || entry.user
          const isMe = uid?.toString() === currentUserId?.toString()
          return (
            <Box key={uid} sx={{
              display: 'flex', alignItems: 'center', gap: 2,
              py: 1.2, px: 1.5, mb: 0.5, borderRadius: 1,
              bgcolor: isMe ? 'rgba(201,168,76,0.08)' : 'transparent',
              border: isMe ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent'
            }}>
              <Typography sx={{ fontSize: 18, minWidth: 36 }}>{rankMedal(entry.rank)}</Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{
                  fontSize: 14, color: isMe ? GOLD : 'white',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {entry.user?.username || entry.user?.fullName || 'Player'}
                  {isMe && <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>(you)</span>}
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#555' }}>
                  {entry.correctAnswers}/{(entry.correctAnswers + entry.wrongAnswers) || 0} correct
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 16, color: GOLD, fontWeight: 700 }}>
                {entry.totalScore}
              </Typography>
            </Box>
          )
        }) : (
          <Typography sx={{ color: '#555', fontSize: 13, textAlign: 'center', py: 2 }}>
            No results available
          </Typography>
        )}
      </Box>

      <Button
        onClick={onBack}
        sx={{
          bgcolor: GOLD, color: DARK, px: 5, py: 1.5,
          fontWeight: 700, fontSize: 15,
          '&:hover': { bgcolor: '#E8C97A' }
        }}
      >
        Back to Lobby
      </Button>
    </Box>
  )
}

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
