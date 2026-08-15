import { createTheme } from '@mui/material/styles'
import { GOLD, DARK, DARK2, BEBAS } from './themeConstants.js'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: GOLD
    },
    background: {
      default: DARK,
      paper: DARK2
    }
  },
  typography: {
    fontFamily: "'DM Sans', sans-serif",
    h1: { fontFamily: BEBAS },
    h2: { fontFamily: BEBAS },
    h3: { fontFamily: BEBAS }
  }
})
