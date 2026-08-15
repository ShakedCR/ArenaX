import { Box, InputBase, Typography } from '@mui/material'
import { GOLD, DARK3 } from '../../styles/themeConstants'

export default function AuthInput({ label, placeholder, type = 'text', icon, value, onChange }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: 13, color: '#aaa', mb: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        bgcolor: DARK3,
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 1, px: 2, py: 1.2,
        '&:focus-within': { borderColor: GOLD }
      }}>
        {icon && <Box sx={{ color: '#555', fontSize: 16 }}>{icon}</Box>}
        <InputBase
          fullWidth
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          sx={{ color: 'white', fontSize: 14 }}
        />
      </Box>
    </Box>
  )
}