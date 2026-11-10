import { CssBaseline, ThemeProvider } from '@mui/material'
import { AuthProvider } from './auth/AuthProvider'
import { AppRoutes } from './routing/AppRoutes'
import { theme } from './theme'

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}
