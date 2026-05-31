import { Box, Typography } from '@mui/material'
import { CardRow } from './PlayingCard'
import { GOLD, BEBAS } from './constants'

export default function DealerSection({
  phase,
  displayedDealerCards,
  dealerFaceDownCount,
  visibleDealerCards,
  visibleDealerTotal,
  dealerCards,
  dealerTotal,
}) {
  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <CardRow cards={displayedDealerCards} faceDownCount={dealerFaceDownCount} label="Dealer" />

      {phase === 'dealer-reveal' && visibleDealerCards.length > 0 && (
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Typography sx={{ color: GOLD, fontSize: 12, fontFamily: BEBAS, letterSpacing: 2 }}>
            DEALER REVEALS…
          </Typography>
          <Typography sx={{
            color: visibleDealerTotal > 21 ? '#ef5350' : 'white',
            fontSize: 20, fontWeight: 700, mt: 0.5
          }}>
            {visibleDealerTotal > 21 ? `BUST (${visibleDealerTotal})` : `Total: ${visibleDealerTotal}`}
          </Typography>
        </Box>
      )}

      {phase === 'round-result' && dealerCards.length > 0 && (
        <Typography sx={{ mt: 1, fontSize: 14, fontWeight: 700, color: dealerTotal > 21 ? '#ef5350' : GOLD }}>
          {dealerTotal > 21 ? `DEALER BUST (${dealerTotal})` : `Dealer: ${dealerTotal}`}
        </Typography>
      )}
    </Box>
  )
}
