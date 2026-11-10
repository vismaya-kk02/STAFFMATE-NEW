import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material'
import type { ReactNode } from 'react'

type AppShellProps = {
  productName: string
  align?: 'center' | 'start'
  banner?: ReactNode
  onLogout?: () => void
  loggingOut?: boolean
  children: ReactNode
}

export function AppShell({
  productName,
  align = 'center',
  banner = null,
  onLogout,
  loggingOut = false,
  children,
}: AppShellProps) {
  const centered = align === 'center'

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            {productName}
          </Typography>
          {onLogout ? (
            <Button
              color="inherit"
              type="button"
              onClick={onLogout}
              disabled={loggingOut}
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          ) : null}
        </Toolbar>
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
