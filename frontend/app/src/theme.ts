import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    primary: { main: '#1b7a43' },
    text: { primary: '#111827', secondary: '#4b5563' },
  },
  typography: {
    fontFamily: '"Inter Variable", "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: { borderRadius: 8 },
})
