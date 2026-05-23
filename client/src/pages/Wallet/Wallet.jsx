import { Box, CircularProgress, Typography } from '@mui/material'

import AuthNavbar from '../../components/layout/AuthNavbar'
import TransactionRow from '../../components/wallet/TransactionRow'
import WalletBalanceCard from '../../components/wallet/WalletBalanceCard'
import DailyBonusCard from '../../components/wallet/DailyBonusCard'

import { useAuth } from '../../contexts/useAuth'
import useWallet from '../../hooks/useWallet'

import { GOLD, DARK, DARK2, BEBAS } from '../../styles/themeConstants'

export default function Wallet() {
  const { user } = useAuth()

  const {
    balance,
    transactions,
    loading,
    bonusClaimed,
    claimingBonus,
    claimDailyBonus
  } = useWallet()

  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', color: 'white' }}>
      <AuthNavbar
        username={user?.username || 'Player'}
        tokens={balance}
        elo={user?.elo || 1200}
      />

      <Box sx={{ px: 6, py: 4, maxWidth: 700, mx: 'auto' }}>
        <WalletBalanceCard balance={balance} />

        <DailyBonusCard
          bonusClaimed={bonusClaimed}
          claimingBonus={claimingBonus}
          onClaim={claimDailyBonus}
        />

        <Typography sx={{ fontFamily: BEBAS, fontSize: 22, letterSpacing: 2, mb: 2 }}>
          TRANSACTION HISTORY
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress sx={{ color: GOLD }} />
          </Box>
        ) : transactions.length === 0 ? (
          <Box sx={{
            bgcolor: DARK2,
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 2,
            p: 4,
            textAlign: 'center'
          }}>
            <Typography sx={{ color: '#666', fontSize: 14 }}>
              No transactions yet.
            </Typography>
          </Box>
        ) : (
          transactions.map(transaction => (
            <TransactionRow
              key={transaction._id}
              transaction={transaction}
            />
          ))
        )}
      </Box>
    </Box>
  )
}