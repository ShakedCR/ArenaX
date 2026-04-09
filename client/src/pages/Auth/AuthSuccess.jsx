import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import api from '../../services/api'

export default function AuthSuccess() {
  const navigate = useNavigate()
  const { setUser } = useAuth()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (token) {
      localStorage.setItem('token', token)
      api.get('/auth/me')
        .then(res => {
          setUser(res.data.user)
          navigate('/lobby')
        })
        .catch(() => navigate('/login'))
    } else {
      navigate('/login')
    }
  }, [ navigate, setUser ])

  return null
}