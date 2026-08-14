import { Box, Button, Divider, Typography } from '@mui/material'
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AuthInput from '../../components/common/AuthInput'
import { useAuth } from '../../contexts/useAuth'

const GOLD = '#C9A84C'
const DARK = '#0A0A0F'
const DARK2 = '#12121A'
const BEBAS = "'Bebas Neue', sans-serif"

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async () => {
    try {
      await login(form.email, form.password)
      const params = new URLSearchParams(location.search)
      const redirect = params.get('redirect')
      navigate(redirect || '/lobby')
    } catch {
      setError('Login failed. Please check your credentials.')
    }
  }

  return (
    <Box sx={{
      bgcolor: DARK, minHeight: '100vh', color: 'white',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      <Typography
        onClick={() => navigate('/')}
        sx={{ position: 'absolute', top: { xs: 16, md: 32 }, left: { xs: 16, md: 48 }, color: '#888', fontSize: 13, cursor: 'pointer',
          '&:hover': { color: 'white' } }}>
        ← Back to home
      </Typography>

      <Box sx={{
        bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.15)',
        borderRadius: 2, p: 5, width: '100%', maxWidth: 420
      }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: 18, letterSpacing: 3, mb: 1 }}>
            ARENA<span style={{ color: 'white' }}>X</span>
          </Typography>
          <Typography sx={{ fontFamily: BEBAS, fontSize: 32, letterSpacing: 3 }}>
            WELCOME BACK
          </Typography>
          <Typography sx={{ color: '#888', fontSize: 13 }}>
            Sign in to continue playing
          </Typography>
        </Box>

        <AuthInput
          label="Email"
          placeholder="Enter your email"
          type="email"
          value={form.email}
          onChange={handleChange('email')}
        />
        <AuthInput
          label="Password"
          placeholder="Enter your password"
          type="password"
          icon="🔒"
          value={form.password}
          onChange={handleChange('password')}
        />

        {error && (
          <Typography sx={{ color: 'red', fontSize: 13, mb: 1, textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        <Button
          fullWidth
          onClick={handleSubmit}
          sx={{
            bgcolor: GOLD, color: DARK, py: 1.5, mt: 1,
            fontWeight: 700, fontSize: 15,
            '&:hover': { bgcolor: '#E8C97A' }
          }}>
          Sign In
        </Button>

        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)',
          '&::before, &::after': { borderColor: 'rgba(255,255,255,0.1)' } }}>
          <Typography sx={{ color: '#555', fontSize: 12, px: 1 }}>or continue with</Typography>
        </Divider>

        <Button
          fullWidth
          onClick={() => window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`}
          sx={{
            bgcolor: '#1a1a2e', color: 'white', py: 1.5,
            border: '1px solid rgba(255,255,255,0.1)',
            '&:hover': { bgcolor: '#252540' }
          }}>
          <img src="https://www.google.com/favicon.ico" width={16} style={{ marginRight: 8 }} />
          Continue with Google
        </Button>

        <Typography sx={{ textAlign: 'center', mt: 3, color: '#888', fontSize: 13 }}>
          Don't have an account?{' '}
          <span onClick={() => navigate('/register')}
            style={{ color: GOLD, cursor: 'pointer' }}>
            Sign up
          </span>
        </Typography>
      </Box>
    </Box>
  )
}