import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Lobby from './pages/Lobby/Lobby'
import Profile from './pages/Profile/Profile'
import Wallet from './pages/Wallet/Wallet'
import Blackjack from './pages/Game/Blackjack'
import Chess from './pages/Game/Chess'
import Checkers from './pages/Game/Checkers'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Landing Page</div>} />
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
  )
}

export default App