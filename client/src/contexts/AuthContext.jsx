import { useEffect, useState } from 'react'
import { AuthContext } from './AuthContext'
import api from '../services/api'

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
    .then(res => setUser(res.data.user))
    .catch(() => localStorage.removeItem('token'))
    .finally(() => setLoading(false))
  }, [])

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
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout ,setUser}}>
      {children}
    </AuthContext.Provider>
  )
}