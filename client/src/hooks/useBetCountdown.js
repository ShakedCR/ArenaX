import { useEffect, useRef, useState } from 'react'

/**
 * Countdown timer for the 30-second betting phase.
 * Resets to 30 whenever the betting phase starts and stops when bet is confirmed.
 */
export function useBetCountdown(phase, betConfirmed) {
  const betCountdownRef = useRef(null)
  const [betTimeLeft, setBetTimeLeft] = useState(null)

  useEffect(() => {
    if (betCountdownRef.current) clearInterval(betCountdownRef.current)

    if (phase === 'betting' && !betConfirmed) {
      setBetTimeLeft(30)
      betCountdownRef.current = setInterval(() => {
        setBetTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(betCountdownRef.current)
            betCountdownRef.current = null
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setBetTimeLeft(null)
    }

    return () => {
      if (betCountdownRef.current) {
        clearInterval(betCountdownRef.current)
        betCountdownRef.current = null
      }
    }
  }, [phase, betConfirmed])

  return betTimeLeft
}
