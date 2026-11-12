
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { useMemo } from 'react'
import { AuthProvider } from './auth/AuthProvider'
import { AppRoutes } from './routing/AppRoutes'
import { AppThemeProvider, useAppTheme } from './theme/ThemeContext'

function ThemedApplication() {
  const { mode } = useAppTheme()

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: '#1b7a43' },
          background: {
            default: mode === 'dark' ? '#121713' : '#ffffff',
            paper: mode === 'dark' ? '#1c241e' : '#ffffff',
          },
          text: {
            primary: mode === 'dark' ? '#f3f5f3' : '#111827',
            secondary: mode === 'dark' ? '#b2bdb5' : '#4b5563',
          },
        },
        typography: {
          fontFamily:
            '"Inter Variable", "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          button: { textTransform: 'none', fontWeight: 700 },
        },
        shape: { borderRadius: 8 },
      }),
    [mode],
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}

export function App() {
  return (
    <AppThemeProvider>
      <ThemedApplication />
    </AppThemeProvider>
  )
}