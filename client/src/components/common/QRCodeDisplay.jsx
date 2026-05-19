import React from 'react';
import QRCode from 'qrcode.react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Paper, CircularProgress } from '@mui/material';
import FileCopyIcon from '@mui/icons-material/FileCopy';

const QRCodeDisplay = ({ open, onClose, inviteLink, qrImage, tournamentName, isLoading = false }) => {
  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      alert('Invite link copied to clipboard!');
    }
  };

  const handleDownload = () => {
    if (qrImage) {
      // If server provided QR image, download it directly
      const link = document.createElement('a');
      link.href = qrImage;
      link.download = `${tournamentName}-qr-code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (typeof QRCode !== 'undefined') {
      // Fallback to canvas QR code
      const qrElement = document.getElementById('tournament-qr-code');
      if (qrElement) {
        const link = document.createElement('a');
        link.href = qrElement.toDataURL('image/png');
        link.download = `${tournamentName}-qr-code.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Share Tournament: {tournamentName}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 3 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* QR Code - prefer server image, fallback to canvas */}
            <Paper sx={{ p: 2, bgcolor: '#fff', boxShadow: 1 }}>
              {qrImage ? (
                <img
                  src={qrImage}
                  alt="Tournament QR Code"
                  style={{ width: 256, height: 256 }}
                />
              ) : (
                <QRCode
                  id="tournament-qr-code"
                  value={inviteLink || ''}
                  size={256}
                  level="H"
                  includeMargin={true}
                  renderAs="canvas"
                />
              )}
            </Paper>

            {/* Invite Link */}
            <Box sx={{ width: '100%' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                Invite Link:
              </Typography>
              <Paper
                sx={{
                  p: 1.5,
                  bgcolor: '#f5f5f5',
                  border: '1px solid #ddd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  word: 'break-all'
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mr: 1
                  }}
                >
                  {inviteLink}
                </Typography>
                <Button
                  size="small"
                  startIcon={<FileCopyIcon />}
                  onClick={handleCopy}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Copy
                </Button>
              </Paper>
            </Box>

            {/* Instructions */}
            <Box sx={{ width: '100%', bgcolor: '#f0f7ff', p: 2, borderRadius: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                📱 Share this QR code or link with other players. They can scan it with their phone camera or paste the link in a browser to join!
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleDownload} disabled={isLoading}>
          Download QR
        </Button>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QRCodeDisplay;
