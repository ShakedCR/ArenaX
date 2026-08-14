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
  const [avatarLoading, setAvatarLoading] = useState(false)

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
      .catch(err => console.error('[useProfile] fetch error:', err))
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

  const compressImage = (file) => new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const SIZE = 200
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      const side = Math.min(img.width, img.height)
      const sx = (img.width - side) / 2
      const sy = (img.height - side) / 2
      ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8)
    }
    img.src = url
  })

  const handleAvatarChange = async (file) => {
    if (!file || !userId) return
    setAvatarLoading(true)
    try {
      const blob = await compressImage(file)
      const formData = new FormData()
      formData.append('avatar', blob, 'avatar.jpg')
      const res = await api.put(`/users/${userId}/avatar`, formData)
      setUser(res.data.user)
    } catch (err) {
      console.error('[useProfile] avatar upload error:', err)
    } finally {
      setAvatarLoading(false)
    }
  }

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
    avatarLoading,
    setNewUsername,
    getGameStats,
    handleEditUsername,
    handleCancelEdit,
    handleSaveUsername,
    handleAvatarChange,
  }
}