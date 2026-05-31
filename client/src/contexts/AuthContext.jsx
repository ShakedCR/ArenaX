import { createContext, useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const isLoggedIn = !!user

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      Promise.resolve().then(() => setLoading(false))
      return
    }

    api.get('/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  // Register real-time socket listeners once when the user logs in,
  // unregister when they log out. Using functional setUser updates so
  // the handlers never need to close over the user value — this avoids
  // the listener being torn down and re-added on every user state change.
  useEffect(() => {
    if (!isLoggedIn) return

    const token = localStorage.getItem('token')
    if (!token) return

    const sock = connectSocket(token)

    const handleWalletUpdate = (data) => {
      setUser(prev => prev ? { ...prev, walletBalance: data.walletBalance } : prev)
    }

    const handleEloUpdate = (data) => {
      setUser(prev => {
        if (!prev) return prev
        return { ...prev, elo: { ...prev.elo, [data.game]: data.newRating } }
      })
    }

    sock.on('wallet:updated', handleWalletUpdate)
    sock.on('elo:updated', handleEloUpdate)

    return () => {
      sock.off('wallet:updated', handleWalletUpdate)
      sock.off('elo:updated', handleEloUpdate)
    }
  }, [isLoggedIn])  // only re-run when logging in or out, not on every user update

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', res.data.token)
    setUser(res.data.user)
  }

  const register = async (fullName, username, email, password) => {
    const res = await api.post('/auth/register', { fullName, username, email, password })
    localStorage.setItem('token', res.data.token)
    setUser(res.data.user)
  }

  const logout = () => {
    disconnectSocket()
    localStorage.removeItem('token')
    setUser(null)
  }

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me')
      setUser(res.data.user)
    } catch (err) {
      console.log(err)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
