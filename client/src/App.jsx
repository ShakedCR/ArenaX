import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Box } from '@mui/material'
import { AuthProvider } from './contexts/AuthContext.jsx'
import ProtectedRoute from './routes/ProtectedRoute'
import LandingPage from './pages/Landing/LandingPage'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import AuthSuccess from './pages/Auth/AuthSuccess'
import Lobby from './pages/Lobby/Lobby'
import Profile from './pages/Profile/Profile'
import Wallet from './pages/Wallet/Wallet'
import Blackjack from './pages/Game/Blackjack'
import Chess from './pages/Game/Chess'
import Checkers from './pages/Game/Checkers'
import WaitingRoom from './pages/Tournament/WaitingRoom'
import TournamentJoin from './pages/Tournament/TournamentJoin'
import TournamentsList from './pages/Tournaments/TournamentsList'
import TournamentStandings from './pages/Tournaments/TournamentStandings'

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
    h1: {
      fontFamily: "'Bebas Neue', sans-serif"
    },
    h2: {
      fontFamily: "'Bebas Neue', sans-serif"
    },
    h3: {
      fontFamily: "'Bebas Neue', sans-serif"
    }
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
              <Route path="/auth/success" element={<AuthSuccess />} />

              <Route
                path="/lobby"
                element={
                  <ProtectedRoute>
                    <Lobby />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/wallet"
                element={
                  <ProtectedRoute>
                    <Wallet />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tournaments"
                element={
                  <ProtectedRoute>
                    <TournamentsList />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tournaments/:id"
                element={
                  <ProtectedRoute>
                    <TournamentStandings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tournaments/join/:inviteCode"
                element={
                  <ProtectedRoute>
                    <TournamentJoin />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tournament/:id/waiting"
                element={
                  <ProtectedRoute>
                    <WaitingRoom />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/game/blackjack/:id"
                element={
                  <ProtectedRoute>
                    <Blackjack />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/game/chess/:id"
                element={
                  <ProtectedRoute>
                    <Chess />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/game/checkers/:id"
                element={
                  <ProtectedRoute>
                    <Checkers />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </Box>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App