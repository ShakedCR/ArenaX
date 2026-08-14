import { Box, Button, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import StatBar from '../../components/landing/StatBar'
import GameCard from '../../components/landing/GameCard'
import StepCard from '../../components/landing/StepCard'

const GOLD = '#C9A84C'
const DARK = '#0A0A0F'
const BEBAS = "'Bebas Neue', sans-serif"

const games = [
  { icon: '♠', name: 'BLACKJACK', desc: 'Test your nerve. Beat the dealer. Outscore the table.', tag: '2-6 Players' },
  { icon: '🧠', name: 'TRIVIA', desc: 'AI-powered questions. Prove your knowledge. Outsmart the competition.', tag: '2-10 Players' },
]

const steps = [
  { num: '1', title: 'SIGN UP', desc: 'Create your account and claim 1,000 free tokens.' },
  { num: '2', title: 'FIND A MATCH', desc: 'Browse open tournaments or create your own.' },
  { num: '3', title: 'COMPETE', desc: 'Play your game. Climb the bracket. Win tokens.' },
  { num: '4', title: 'RISE IN ELO', desc: 'Track your stats and dominate the leaderboard.' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white', width: '100%' }}>

      <Navbar />
      <StatBar />

      <Box sx={{ textAlign: 'center', py: 12 }}>
        <Typography sx={{ color: GOLD, letterSpacing: 4, fontSize: 12, mb: 4 }}>
          SELECT YOUR BATTLEFIELD
        </Typography>

        <Typography sx={{ fontFamily: BEBAS, fontSize: { xs: 60, md: 130 }, letterSpacing: { xs: 4, md: 6 }, lineHeight: 1 }}>
          COMPETE
        </Typography>
        <Typography sx={{ fontFamily: BEBAS, fontSize: { xs: 60, md: 130 }, letterSpacing: { xs: 4, md: 6 }, lineHeight: 1, color: GOLD }}>
          CONQUER
        </Typography>
        <Typography sx={{ fontFamily: BEBAS, fontSize: { xs: 60, md: 130 }, letterSpacing: { xs: 4, md: 6 }, lineHeight: 1 }}>
          CLAIM
        </Typography>

        <Box sx={{ width: 60, height: 2, bgcolor: GOLD, mx: 'auto', mt: 4, mb: 4 }} />

        <Typography sx={{ color: '#888', fontSize: 15, mb: 6 }}>
          Enter the arena. Compete in Blackjack and Trivia tournaments for tokens, glory, and Elo supremacy.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 10 }}>
          <Button onClick={() => navigate('/register')}
            sx={{ bgcolor: GOLD, color: DARK, px: 4, py: 1.5, fontWeight: 700,
              '&:hover': { bgcolor: '#E8C97A' } }}>
            Enter the Arena →
          </Button>
          <Button onClick={() => navigate('/lobby')}
            sx={{ color: 'white', border: '1px solid rgba(255,255,255,0.2)',
              px: 4, py: 1.5, '&:hover': { borderColor: 'white' } }}>
            Browse Tournaments
          </Button>
        </Box>

        <Typography sx={{ color: GOLD, letterSpacing: 4, fontSize: 12, mb: 6 }}>
          CHOOSE YOUR GAME
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, px: { xs: 2, md: 8 }, justifyContent: 'center' }}>
          {games.map((g, i) => (
            <Box key={i} sx={{ flex: 1, maxWidth: 380, minWidth: { xs: '100%', md: 0 } }}>
              <GameCard game={g} onPlay={() => navigate('/register')} />
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ py: 10, borderTop: `1px solid rgba(201,168,76,0.08)` }}>
        <Typography sx={{ color: GOLD, letterSpacing: 4, fontSize: 12, textAlign: 'center', mb: 2 }}>
          GET STARTED IN MINUTES
        </Typography>
        <Typography sx={{ fontFamily: BEBAS, fontSize: { xs: 40, md: 72 }, letterSpacing: 4, textAlign: 'center' }}>
          HOW IT <span style={{ color: GOLD }}>WORKS</span>
        </Typography>
        <Box sx={{ width: 60, height: 2, bgcolor: GOLD, mx: 'auto', mt: 3, mb: 8 }} />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, md: 4 }, px: { xs: 2, md: 8 }, justifyContent: 'center' }}>
          {steps.map((s, i) => (
            <Box key={i} sx={{ flex: 1, maxWidth: 280, minWidth: { xs: 'calc(50% - 8px)', md: 0 } }}>
              <StepCard step={s} />
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ py: 12, textAlign: 'center', borderTop: `1px solid rgba(201,168,76,0.08)` }}>
        <Typography sx={{ color: GOLD, letterSpacing: 4, fontSize: 12, mb: 2 }}>
          YOUR ARENA AWAITS
        </Typography>
        <Typography sx={{ fontFamily: BEBAS, fontSize: { xs: 48, md: 80 }, letterSpacing: 4 }}>
          READY TO <span style={{ color: GOLD }}>COMPETE?</span>
        </Typography>
        <Typography sx={{ color: '#888', mt: 2, mb: 6, fontSize: 15 }}>
          Join thousands of players. Prove your skill at the table.
        </Typography>
        <Button onClick={() => navigate('/register')}
          sx={{ bgcolor: GOLD, color: DARK, px: 6, py: 1.5,
            fontWeight: 700, fontSize: 15, letterSpacing: 1,
            '&:hover': { bgcolor: '#E8C97A' } }}>
          Join ArenaX Now →
        </Button>
      </Box>

      <Footer />
    </Box>
  )
}