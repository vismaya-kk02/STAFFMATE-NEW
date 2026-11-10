import { Alert } from '@mui/material'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'
import { paths } from './paths'

const productName = 'Staffmate'

export function ShellLayout() {
  const location = useLocation()
  const { phase, errorMessage, loggingOut, logout } = useAuth()

  const workspace =
    location.pathname.startsWith('/admin') || location.pathname.startsWith('/crm')
  const fullBleed = location.pathname === paths.login
  const authenticated =
    phase === 'enroll' ||
    phase === 'codes' ||
    phase === 'unverified' ||
    phase === 'challenge-required' ||
    phase === 'ready' ||
    phase === 'forbidden'

  return (
    <AppShell
      productName={productName}
      align={workspace ? 'start' : 'center'}
      fullBleed={fullBleed}
      banner={
        authenticated && errorMessage ? (
          <Alert severity="error" sx={{ width: '100%', maxWidth: workspace ? 720 : 440, mb: 2 }}>
            {errorMessage}
          </Alert>
        ) : null
      }
      onLogout={authenticated ? () => void logout() : undefined}
      loggingOut={loggingOut}
    >
      <Outlet />
    </AppShell>
  )
}
