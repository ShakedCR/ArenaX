import { QRCodeCanvas } from 'qrcode.react'
import { Box, Button, CircularProgress, Modal, Typography } from '@mui/material'

const GOLD = '#C9A84C'
const DARK2 = '#12121A'
const DARK3 = '#1C1C28'

export default function QRCodeDisplay({ open, onClose, inviteLink, qrImage, tournamentName, isLoading = false, hasPassword = false }) {
  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
    }
  }

  const handleDownload = () => {
    if (qrImage) {
      const link = document.createElement('a')
      link.href = qrImage
      link.download = `${tournamentName}-qr-code.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      const canvas = document.getElementById('tournament-qr-code')
      if (canvas) {
        const link = document.createElement('a')
        link.href = canvas.toDataURL('image/png')
        link.download = `${tournamentName}-qr-code.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 2, p: 4, width: '100%', maxWidth: 420,
        outline: 'none',
      }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: 'white' }}>
            Share Tournament
          </Typography>
          <Typography
            onClick={onClose}
            sx={{ color: '#666', cursor: 'pointer', fontSize: 20, lineHeight: 1, '&:hover': { color: 'white' } }}
          >
            ✕
          </Typography>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: GOLD }} />
          </Box>
        ) : (
          <>
            <Typography sx={{ color: '#888', fontSize: 13, mb: 2, textAlign: 'center' }}>
              {tournamentName}
            </Typography>

            {/* QR Code */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
                {qrImage ? (
                  <img src={qrImage} alt="QR Code" style={{ width: 200, height: 200, display: 'block' }} />
                ) : (
                  <QRCodeCanvas
                    id="tournament-qr-code"
                    value={inviteLink || ''}
                    size={200}
                    level="H"
                  />
                )}
              </Box>
            </Box>

            {/* Invite link */}
            <Box sx={{ bgcolor: DARK3, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 1, px: 2, py: 1.5, mb: 2 }}>
              <Typography sx={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                Invite link
              </Typography>
              <Typography sx={{ color: '#aaa', fontSize: 12, wordBreak: 'break-all', lineHeight: 1.5 }}>
                {inviteLink}
              </Typography>
            </Box>

            {hasPassword && (
              <Typography sx={{ color: '#f44336', fontSize: 12, mb: 2, textAlign: 'center' }}>
                🔒 This tournament requires a password to join
              </Typography>
            )}

            <Typography sx={{ color: '#555', fontSize: 12, textAlign: 'center', mb: 3 }}>
              Scan the QR code or share the link to invite players
            </Typography>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                fullWidth
                onClick={handleCopy}
                sx={{
                  bgcolor: 'rgba(201,168,76,0.1)', color: GOLD,
                  border: '1px solid rgba(201,168,76,0.3)', py: 1,
                  '&:hover': { bgcolor: 'rgba(201,168,76,0.2)' }
                }}
              >
                Copy Link
              </Button>
              <Button
                fullWidth
                onClick={handleDownload}
                sx={{
                  bgcolor: GOLD, color: '#0A0A0F', py: 1, fontWeight: 700,
                  '&:hover': { bgcolor: '#E8C97A' }
                }}
              >
                Download QR
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Modal>
  )
}
