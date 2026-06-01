import { Box, Typography } from '@mui/material'
import { DARK2, DARK3 } from '../../styles/themeConstants'

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

export default function TransactionRow({ transaction }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: DARK2,
        border: '1px solid rgba(201,168,76,0.1)',
        borderRadius: 1,
        px: 3,
        py: 2,
        mb: 1.5,
        '&:hover': { bgcolor: DARK3 },
        transition: 'all 0.2s'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: `${typeColors[transaction.type]}22`,
            border: `1px solid ${typeColors[transaction.type]}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: typeColors[transaction.type],
            fontSize: 16,
            fontWeight: 700
          }}
        >
          {typeIcons[transaction.type]}
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
            {transaction.description || typeLabels[transaction.type]}
          </Typography>

          <Typography sx={{ color: '#666', fontSize: 12 }}>
            {typeLabels[transaction.type]} ·{' '}
            {new Date(transaction.createdAt).toLocaleDateString()}
          </Typography>
        </Box>
      </Box>

      <Typography
        sx={{
          color: typeColors[transaction.type],
          fontSize: 15,
          fontWeight: 700
        }}
      >
        {['deposit', 'prize', 'refund'].includes(transaction.type) ? '+' : '-'}
        {transaction.amount}
      </Typography>
    </Box>
  )
}