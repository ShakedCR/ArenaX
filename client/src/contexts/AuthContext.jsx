import { useEffect, useState } from 'react'
import { AuthContext } from './AuthContext'
import api from '../services/api'
import {
  connectSocket,
  disconnectSocket
} from '../services/socket'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      Promise.resolve().then(() => setLoading(false))
      return
    }

    api.get('/auth/me')
      .then(res => {
        setUser(res.data.user)
      })
      .catch(() => {
        localStorage.removeItem('token')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Keep wallet balance in sync across all pages
  useEffect(() => {
    if (!user) return

    const token = localStorage.getItem('token')

    if (!token) return

    const sock = connectSocket(token)

    const handleWalletUpdate = (data) => {
      setUser(prev =>
        prev
          ? {
              ...prev,
              walletBalance: data.walletBalance
            }
          : prev
      )
    }

    sock.on('wallet:updated', handleWalletUpdate)

    return () => {
      sock.off('wallet:updated', handleWalletUpdate)
    }
  }, [user])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', {
      email,
      password
    })

    localStorage.setItem('token', res.data.token)

    setUser(res.data.user)
  }

  const register = async (
    fullName,
    username,
    email,
    password
  ) => {
    const res = await api.post('/auth/register', {
      fullName,
      username,
      email,
      password
    })

    localStorage.setItem('token', res.data.token)

    setUser(res.data.user)
  }

  const logout = () => {
    disconnectSocket()

    localStorage.removeItem('token')

    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me')

      setUser(res.data.user)
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        setUser,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}