import { useCallback, useEffect, useState } from 'react'

import api from '../services/api'
import { connectSocket } from '../services/socket'

const extractTournaments = (data) =>
  Array.isArray(data?.tournaments) ? data.tournaments : []

const addParticipantToTournaments = (tournaments, tournamentId, participant) =>
  tournaments.map(tournament => {
    const isTargetTournament = tournament._id === tournamentId
    const alreadyJoined = tournament.participants?.some(
      player => (player._id || player) === participant._id
    )

    if (!isTargetTournament || alreadyJoined) {
      return tournament
    }

    return {
      ...tournament,
      participants: [
        ...(tournament.participants || []),
        participant
      ]
    }
  })

export default function useTournaments({ includeMine = false } = {}) {
  const [tournaments, setTournaments] = useState([])
  const [myTournaments, setMyTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTournaments = useCallback(async () => {
    setLoading(true)

    try {
      if (includeMine) {
        const [allRes, myRes] = await Promise.all([
          api.get('/tournaments'),
          api.get('/tournaments/my')
        ])

        setTournaments(extractTournaments(allRes.data))
        setMyTournaments(extractTournaments(myRes.data))
      } else {
        const res = await api.get('/tournaments')
        setTournaments(extractTournaments(res.data))
      }
    } catch (err) {
      console.error('[useTournaments] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [includeMine])

  useEffect(() => {
    fetchTournaments()
  }, [fetchTournaments])

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) return

    const sock = connectSocket(token)

    const handleParticipantAdded = ({ tournamentId, participant }) => {
      setTournaments(prev =>
        addParticipantToTournaments(prev, tournamentId, participant)
      )

      if (includeMine) {
        setMyTournaments(prev =>
          addParticipantToTournaments(prev, tournamentId, participant)
        )
      }
    }

    sock.on('tournament:created', fetchTournaments)
    sock.on('tournament:opened', fetchTournaments)
    sock.on('tournament:status-changed', fetchTournaments)
    sock.on('tournament:participant-added', handleParticipantAdded)

    return () => {
      sock.off('tournament:created', fetchTournaments)
      sock.off('tournament:opened', fetchTournaments)
      sock.off('tournament:status-changed', fetchTournaments)
      sock.off('tournament:participant-added', handleParticipantAdded)
    }
  }, [fetchTournaments, includeMine])

  return {
    tournaments,
    myTournaments,
    loading,
    fetchTournaments
  }
}