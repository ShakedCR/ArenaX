import { useEffect, useRef, useState } from 'react'

/**
 * Countdown timer for the 60-second player turn.
 * Resets to 60 whenever it becomes a new player's turn.
 */
export function useTurnCountdown(phase, currentPlayerId) {
  const countdownRef = useRef(null)
  const [turnTimeLeft, setTurnTimeLeft] = useState(null)

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)

    if (phase === 'playing' && currentPlayerId) {
      setTurnTimeLeft(60)
      countdownRef.current = setInterval(() => {
        setTurnTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current)
            countdownRef.current = null
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setTurnTimeLeft(null)
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }
  }, [currentPlayerId, phase])

  return turnTimeLeft
}
