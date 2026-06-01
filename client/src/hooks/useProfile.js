import { useCallback, useEffect, useMemo, useState } from 'react'

import api from '../services/api'
import { useAuth } from '../contexts/useAuth'

export default function useProfile() {
  const { user, setUser } = useAuth()
  const userId = user?.id || user?._id

  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [usernameLoading, setUsernameLoading] = useState(false)

  useEffect(() => {
    if (!userId) {
      setTournaments([])
      setLoading(false)
      return
    }

    setLoading(true)

    api.get('/tournaments')
      .then(res => {
        const all = Array.isArray(res.data?.tournaments)
          ? res.data.tournaments
          : []

        const myTournaments = all.filter(tournament =>
          tournament.participants?.some(
            participant => participant?._id === userId || participant === userId
          ) ||
          tournament.createdBy?._id === userId ||
          tournament.createdBy === userId
        )

        setTournaments(myTournaments)
      })
      .catch(err => console.log(err))
      .finally(() => setLoading(false))
  }, [userId])

  const initials = useMemo(() => {
    if (user?.fullName) {
      return user.fullName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
    }

    return user?.username?.slice(0, 2).toUpperCase() || '?'
  }, [user?.fullName, user?.username])

  const completedTournaments = useMemo(() => {
    return tournaments.filter(tournament => tournament.status === 'completed')
  }, [tournaments])

  const getGameStats = useCallback((gameTitle) => {
    const gameTournaments = completedTournaments.filter(
      tournament => tournament.gameTitle === gameTitle
    )

    const wins = gameTournaments.filter(tournament => {
      const winner = tournament.result?.winner
      if (!winner) return false
      const winnerId = winner._id ?? winner
      return winnerId.toString() === userId?.toString()
    }).length

    return {
      total: gameTournaments.length,
      winRate: gameTournaments.length > 0
        ? ((wins / gameTournaments.length) * 100).toFixed(0)
        : null
    }
  }, [completedTournaments, userId])

  const handleEditUsername = () => {
    setNewUsername(user?.username || '')
    setUsernameError('')
    setEditingUsername(true)
  }

  const handleCancelEdit = () => {
    setEditingUsername(false)
    setUsernameError('')
  }

  const handleSaveUsername = async () => {
    if (newUsername.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      setUsernameError('Only letters, numbers and underscores')
      return
    }

    setUsernameLoading(true)

    try {
      const res = await api.put(`/users/${userId}`, {
        username: newUsername
      })

      setUser(res.data.user)
      setEditingUsername(false)
      setUsernameError('')
    } catch {
      setUsernameError('Username already taken or unavailable')
    } finally {
      setUsernameLoading(false)
    }
  }

  return {
    user,
    loading,
    initials,
    completedTournaments,
    editingUsername,
    newUsername,
    usernameError,
    usernameLoading,
    setNewUsername,
    getGameStats,
    handleEditUsername,
    handleCancelEdit,
    handleSaveUsername
  }
}