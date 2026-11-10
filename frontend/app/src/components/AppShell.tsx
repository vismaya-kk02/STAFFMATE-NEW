import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material'
import type { ReactNode } from 'react'

type AppShellProps = {
  productName: string
  align?: 'center' | 'start'
  banner?: ReactNode
  onLogout?: () => void
  loggingOut?: boolean
  children: ReactNode
  /** Render children edge-to-edge with no app bar (e.g. the sign-in page). */
  fullBleed?: boolean
}

export function AppShell({
  productName,
  align = 'center',
  banner = null,
  onLogout,
  loggingOut = false,
  children,
  fullBleed = false,
}: AppShellProps) {
  const centered = align === 'center'

  if (fullBleed) {
    return (
      <Box component="main" sx={{ minHeight: '100vh' }}>
        {banner}
        {children}
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0}>
       
      </AppBar>
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: centered ? 'center' : 'stretch',
          justifyContent: centered ? 'center' : 'flex-start',
          px: { xs: 2, sm: 3 },
          py: { xs: 3, sm: 6 },
        }}
      >
        {banner}
        {children}
      </Box>
    </Box>
  )
}
