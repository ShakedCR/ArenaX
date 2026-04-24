import { Box, Button, CircularProgress, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../contexts/useAuth'
import AuthNavbar from '../../components/layout/AuthNavbar'
import { connectSocket } from '../../services/socket'

const GOLD = '#C9A84C'
const DARK = '#0A0A0F'
const DARK2 = '#12121A'
const DARK3 = '#1C1C28'
const BEBAS = "'Bebas Neue', sans-serif"

const typeColors = {
  deposit: '#4caf50',
  prize: '#4caf50',
  refund: '#4caf50',
  withdrawal: '#f44336',
  entry_fee: '#f44336'
}

const typeIcons = {
  deposit: '↑',
  prize: '↑',
  refund: '↑',
  withdrawal: '↓',
  entry_fee: '↓'
}

const typeLabels = {
  deposit: 'Deposit',
  prize: 'Prize',
  refund: 'Refund',
  withdrawal: 'Withdrawal',
  entry_fee: 'Entry Fee'
}

export default function Wallet() {
  const { user, setUser } = useAuth()
  const [balance, setBalance] = useState(user?.walletBalance || 0)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [claimingBonus, setClaimingBonus] = useState(false)
  const [bonusClaimed, setBonusClaimed] = useState(false)

  const fetchWallet = async () => {
    try {
      const walletRes = await api.get('/wallet/me')
      setBalance(walletRes.data.wallet.walletBalance)
    } catch (err) {
      console.log(err)
    }

    try {
      const txRes = await api.get('/transactions')
      setTransactions(Array.isArray(txRes.data?.transactions) ? txRes.data.transactions : [])
    } catch {
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWallet()
  }, [])

  useEffect(() => {
    const sock = connectSocket(localStorage.getItem('token'))

    sock.on('wallet:updated', (data) => {
      setBalance(data.walletBalance)
      setUser(prev => prev ? { ...prev, walletBalance: data.walletBalance } : prev)
      // Refresh transaction list to show new entry
      api.get('/transactions')
        .then(res => setTransactions(Array.isArray(res.data?.transactions) ? res.data.transactions : []))
        .catch(() => {})
    })

    return () => {
      sock.off('wallet:updated')
    }
  }, [])

  const handleDailyBonus = async () => {
  setClaimingBonus(true)
  try {
    const res = await api.post('/wallet/daily-bonus')
    setBalance(res.data.wallet.walletBalance)
    setBonusClaimed(true)
  } catch (err) {
    console.log(err)
  } finally {
    setClaimingBonus(false)
  }
}

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={balance}
        elo={user?.elo || 1200}
      />

      <Box sx={{ px: 6, py: 4, maxWidth: 700, mx: 'auto' }}>

        <Box sx={{
          bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.3)',
          borderRadius: 2, p: 5, mb: 3, textAlign: 'center'
        }}>
          <Typography sx={{ color: '#888', fontSize: 13, mb: 1 }}>Token Balance</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
            <Typography sx={{ color: GOLD, fontSize: 36 }}>⬡</Typography>
            <Typography sx={{ fontFamily: BEBAS, fontSize: 56, color: GOLD, letterSpacing: 2 }}>
              {balance.toLocaleString()}
            </Typography>
          </Box>
          <Typography sx={{ color: '#666', fontSize: 13 }}>Tokens</Typography>
        </Box>

        <Box sx={{
          bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.15)',
          borderRadius: 2, p: 3, mb: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '50%',
              bgcolor: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18
            }}>
              🎁
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Daily Bonus</Typography>
              <Typography sx={{ color: '#666', fontSize: 12 }}>
                {bonusClaimed ? 'Come back tomorrow!' : 'Claim your daily +50 tokens'}
              </Typography>
            </Box>
          </Box>
          <Button
            onClick={handleDailyBonus}
            disabled={bonusClaimed || claimingBonus}
            sx={{
              bgcolor: bonusClaimed ? '#3a3a3a' : GOLD,
              color: bonusClaimed ? '#666' : DARK,
              px: 3, fontWeight: 700, fontSize: 13,
              '&:hover': { bgcolor: bonusClaimed ? '#3a3a3a' : '#E8C97A' },
              '&.Mui-disabled': { bgcolor: '#3a3a3a', color: '#666' }
            }}>
            {claimingBonus ? '...' : bonusClaimed ? 'Claimed' : 'Claim +50'}
          </Button>
        </Box>

        <Typography sx={{ fontFamily: BEBAS, fontSize: 22, letterSpacing: 2, mb: 2 }}>
          TRANSACTION HISTORY
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress sx={{ color: GOLD }} />
          </Box>
        ) : transactions.length === 0 ? (
          <Box sx={{
            bgcolor: DARK2, border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 2, p: 4, textAlign: 'center'
          }}>
            <Typography sx={{ color: '#666', fontSize: 14 }}>
              No transactions yet.
            </Typography>
          </Box>
        ) : (
          transactions.map(t => (
            <Box key={t._id} sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.1)',
              borderRadius: 1, px: 3, py: 2, mb: 1.5,
              '&:hover': { bgcolor: DARK3 }, transition: 'all 0.2s'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '50%',
                  bgcolor: `${typeColors[t.type]}22`,
                  border: `1px solid ${typeColors[t.type]}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: typeColors[t.type], fontSize: 16, fontWeight: 700
                }}>
                  {typeIcons[t.type]}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                    {t.description || typeLabels[t.type]}
                  </Typography>
                  <Typography sx={{ color: '#666', fontSize: 12 }}>
                    {typeLabels[t.type]} · {new Date(t.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
              <Typography sx={{
                color: typeColors[t.type], fontSize: 15, fontWeight: 700
              }}>
                {['deposit', 'prize', 'refund'].includes(t.type) ? '+' : '-'}{t.amount}
              </Typography>
            </Box>
          ))
        )}
      </Box>
    </Box>
  )
}