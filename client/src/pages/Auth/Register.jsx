import { Box, Button, Divider, Typography } from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthInput from '../../components/common/AuthInput'
import { useAuth } from '../../contexts/useAuth'
import { GOLD, DARK, DARK2, BEBAS } from '../../styles/themeConstants'

const validate = (form) => {
  if (form.fullName.trim().length < 2)
    return 'Full name must be at least 2 characters'
  if (form.username.trim().length < 3)
    return 'Username must be at least 3 characters'
  if (!/^[a-zA-Z0-9_]+$/.test(form.username))
    return 'Username can only contain letters, numbers and underscores'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    return 'Invalid email address'
  if (form.password.length < 8)
    return 'Password must be at least 8 characters'
  return null
}

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '' })
  const [error, setError] = useState('')

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async () => {
    const validationError = validate(form)
    if (validationError) {
      setError(validationError)
      return
    }
    try {
      await register(form.fullName, form.username, form.email, form.password)
      navigate('/lobby')
    } catch {
      setError('Registration failed. Please try again.')
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
            CREATE ACCOUNT
          </Typography>
          <Typography sx={{ color: '#888', fontSize: 13 }}>
            Join the arena and start competing
          </Typography>
        </Box>

        <AuthInput
          label="Full Name"
          placeholder="Enter your full name"
          value={form.fullName}
          onChange={handleChange('fullName')}
        />
        <AuthInput
          label="Username"
          placeholder="Choose a username"
          value={form.username}
          onChange={handleChange('username')}
        />
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
          Create Account
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
          Already have an account?{' '}
          <span onClick={() => navigate('/login')}
            style={{ color: GOLD, cursor: 'pointer' }}>
            Sign in
          </span>
        </Typography>
      </Box>
    </Box>
  )
}