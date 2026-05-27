import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Box, CircularProgress } from '@mui/material'
import { AuthProvider } from './contexts/AuthContext.jsx'
import ProtectedRoute from './routes/ProtectedRoute'

const LandingPage       = lazy(() => import('./pages/Landing/LandingPage'))
const Login             = lazy(() => import('./pages/Auth/Login'))
const Register          = lazy(() => import('./pages/Auth/Register'))
const AuthSuccess       = lazy(() => import('./pages/Auth/AuthSuccess'))
const Lobby             = lazy(() => import('./pages/Lobby/Lobby'))
const Profile           = lazy(() => import('./pages/Profile/Profile'))
const Wallet            = lazy(() => import('./pages/Wallet/Wallet'))
const Blackjack         = lazy(() => import('./pages/Game/Blackjack'))
const WaitingRoom       = lazy(() => import('./pages/Tournament/WaitingRoom'))
const TournamentJoin    = lazy(() => import('./pages/Tournament/TournamentJoin'))
const TournamentsList   = lazy(() => import('./pages/Tournaments/TournamentsList'))
const TournamentStandings = lazy(() => import('./pages/Tournaments/TournamentStandings'))

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#C9A84C'
    },
    background: {
      default: '#0A0A0F',
      paper: '#12121A'
    }
  },
  typography: {
    fontFamily: "'DM Sans', sans-serif",
    h1: { fontFamily: "'Bebas Neue', sans-serif" },
    h2: { fontFamily: "'Bebas Neue', sans-serif" },
    h3: { fontFamily: "'Bebas Neue', sans-serif" }
  }
})

const PageLoader = () => (
  <Box sx={{ bgcolor: '#0A0A0F', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress sx={{ color: '#C9A84C' }} />
  </Box>
)

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Box sx={{ maxWidth: '100vw', overflowX: 'hidden' }}>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/auth/success" element={<AuthSuccess />} />

                <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />

                <Route path="/tournaments" element={<ProtectedRoute><TournamentsList /></ProtectedRoute>} />
                <Route path="/tournaments/:id" element={<ProtectedRoute><TournamentStandings /></ProtectedRoute>} />
                <Route path="/tournaments/join/:inviteCode" element={<ProtectedRoute><TournamentJoin /></ProtectedRoute>} />
                <Route path="/tournament/:id/waiting" element={<ProtectedRoute><WaitingRoom /></ProtectedRoute>} />

                <Route path="/game/blackjack/:id" element={<ProtectedRoute><Blackjack /></ProtectedRoute>} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </Box>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
