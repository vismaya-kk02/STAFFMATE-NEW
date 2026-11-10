import { Button, Stack } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import type { SessionHome } from '../auth/types'
import { paths } from '../routing/paths'

export function SectionNav({ home }: { home: SessionHome }) {
  const location = useLocation()

  if (!(home.sections.admin && home.sections.crm)) {
    return null
  }

  const adminActive = location.pathname.startsWith('/admin')
  const crmActive = location.pathname.startsWith('/crm')

  return (
    <Stack
      component="nav"
      aria-label="Staffmate sections"
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      sx={{ mb: 2 }}
    >
      <Button
        component={RouterLink}
        to={paths.admin}
        variant={adminActive ? 'contained' : 'outlined'}
      >
        Admin
      </Button>
      <Button
        component={RouterLink}
        to={paths.crm}
        variant={crmActive ? 'contained' : 'outlined'}
      >
        CRM
      </Button>
    </Stack>
  )
}
