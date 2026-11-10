import { Box, Typography } from '@mui/material'
import type { SessionHome } from '../auth/types'
import { FormCard } from '../components/FormCard'

export function CrmWorkspace({ home }: { home: SessionHome }) {
  return (
    <Box sx={{ width: '100%', maxWidth: 720 }}>
      <FormCard title="CRM home" maxWidth={720}>
        <Typography variant="body1">{home.name}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {home.email}
        </Typography>
        <Typography variant="subtitle1" component="h3">
          Roles
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 3 }}>
          {home.roles.map((role) => (
            <Typography key={role} component="li">
              {role}
            </Typography>
          ))}
        </Box>
        <Typography variant="subtitle1" component="h3" sx={{ mt: 2 }}>
          Available navigation
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 3 }}>
          {home.crmNavigation.map((item) => (
            <Typography key={item.key} component="li">
              {item.label}
            </Typography>
          ))}
        </Box>
      </FormCard>
    </Box>
  )
}
