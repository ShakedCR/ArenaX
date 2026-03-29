import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Box } from '@mui/material'
import { AuthProvider } from './contexts/AuthContext.jsx'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Lobby from './pages/Lobby/Lobby'
import Profile from './pages/Profile/Profile'
import Wallet from './pages/Wallet/Wallet'
import Blackjack from './pages/Game/Blackjack'
import Chess from './pages/Game/Chess'
import Checkers from './pages/Game/Checkers'
import LandingPage from './pages/Landing/LandingPage'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#C9A84C' },
    background: {
      default: '#0A0A0F',
      paper: '#12121A'
    }
  },
  typography: {
    fontFamily: "'DM Sans', sans-serif",
    h1: { fontFamily: "'Bebas Neue', sans-serif" },
    h2: { fontFamily: "'Bebas Neue', sans-serif" },
    h3: { fontFamily: "'Bebas Neue', sans-serif" },
  }
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Box sx={{ maxWidth: '100vw', overflowX: 'hidden' }}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/lobby" element={<Lobby />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/game/blackjack/:id" element={<Blackjack />} />
              <Route path="/game/chess/:id" element={<Chess />} />
              <Route path="/game/checkers/:id" element={<Checkers />} />
            </Routes>
          </BrowserRouter>
        </Box>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App